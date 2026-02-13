import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/caregiver/daily-tasks?date=YYYY-MM-DD
// Returns aggregated daily tasks for a caregiver, filtered by today's shifts
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: {
          include: {
            clientRelationships: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    })

    if (!user || user.role !== "CAREGIVER" || !user.caregiverProfile) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const caregiverId = user.caregiverProfile.id

    // Parse date
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date")
    let targetDate: Date
    if (dateStr) {
      const [year, month, day] = dateStr.split("-").map(Number)
      targetDate = new Date(year, month - 1, day)
    } else {
      targetDate = new Date()
    }

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // 1. Get today's shifts for this caregiver
    const shifts = await prisma.shift.findMany({
      where: {
        caregiverId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ["FILLED", "COMPLETED"] },
      },
      include: {
        shiftType: true,
        client: true,
      },
      orderBy: { startTime: "asc" },
    })

    if (shifts.length === 0) {
      return NextResponse.json({
        date: formatDate(targetDate),
        clients: [],
        globalSummary: { totalTasks: 0, completed: 0, pending: 0, overdue: 0 },
      })
    }

    // 2. Group shifts by client (caregiver may have multiple shifts for same client)
    const clientMap = new Map<string, { client: { id: string; name: string }; shifts: typeof shifts }>()
    for (const shift of shifts) {
      const existing = clientMap.get(shift.clientId)
      if (existing) {
        existing.shifts.push(shift)
      } else {
        clientMap.set(shift.clientId, {
          client: { id: shift.client.id, name: shift.client.name },
          shifts: [shift],
        })
      }
    }

    // 3. For each client, fetch all task data in parallel
    const clientTasksPromises = Array.from(clientMap.entries()).map(
      async ([clientId, { client, shifts: clientShifts }]) => {
        const firstShift = clientShifts[0]

        const [
          medications,
          medAdministrations,
          tubeFeedSchedules,
          tubeFeedAdmins,
          nursingProcedures,
          woundCarePlans,
          defecationCount,
          urineAgg,
          fluidAgg,
          meals,
          reportCount,
        ] = await Promise.all([
          // Medications active for this date
          prisma.medication.findMany({
            where: {
              clientId,
              isActive: true,
              startDate: { lte: endOfDay },
              OR: [{ endDate: null }, { endDate: { gte: startOfDay } }],
            },
          }),
          // Medication administrations for today
          prisma.medicationAdministration.findMany({
            where: {
              clientId,
              scheduledTime: { gte: startOfDay, lte: endOfDay },
            },
            include: {
              caregiver: { select: { name: true } },
            },
          }),
          // Tube feeding schedules (active)
          prisma.tubeFeedingSchedule.findMany({
            where: { clientId, isActive: true },
            orderBy: { feedingTime: "asc" },
          }),
          // Tube feeding administrations for today
          prisma.tubeFeedingAdministration.findMany({
            where: {
              clientId,
              scheduledTime: { gte: startOfDay, lte: endOfDay },
            },
            include: {
              caregiver: { select: { name: true } },
            },
          }),
          // Nursing procedures due today or overdue
          prisma.nursingProcedure.findMany({
            where: {
              clientId,
              isActive: true,
              nextDueDate: { lte: endOfDay },
            },
            include: {
              logs: {
                orderBy: { performedAt: "desc" },
                take: 1,
                include: { caregiver: { select: { name: true } } },
              },
            },
          }),
          // Wound care plans (active) with last report
          prisma.woundCarePlan.findMany({
            where: { clientId, isActive: true },
            include: {
              reports: {
                orderBy: { reportDate: "desc" },
                take: 1,
                select: {
                  reportDate: true,
                  nextCareDate: true,
                  caregiver: { select: { name: true } },
                },
              },
            },
          }),
          // I&O counts
          prisma.defecationRecord.count({
            where: { clientId, recordDate: { gte: startOfDay, lte: endOfDay } },
          }),
          prisma.urineRecord.aggregate({
            where: { clientId, recordDate: { gte: startOfDay, lte: endOfDay } },
            _count: true,
            _sum: { volume: true },
          }),
          prisma.fluidIntakeRecord.aggregate({
            where: { clientId, recordDate: { gte: startOfDay, lte: endOfDay } },
            _count: true,
            _sum: { volume: true },
          }),
          // Meals for today
          prisma.mealRecord.findMany({
            where: { clientId, recordDate: { gte: startOfDay, lte: endOfDay } },
            select: { mealType: true },
          }),
          // Care reports for today
          prisma.careReport.count({
            where: { clientId, reportDate: { gte: startOfDay, lte: endOfDay } },
          }),
        ])

        // Build medication schedule filtered by shift time range
        const shiftStartMin = timeToMinutes(firstShift.startTime)
        const shiftEndMin = timeToMinutes(firstShift.endTime)
        const isOvernightShift = shiftEndMin < shiftStartMin

        let medItems: ReturnType<typeof buildMedicationSchedule>

        if (isOvernightShift) {
          // For overnight shifts (e.g. 23:00-10:00), we need:
          // 1. Evening meds on target date (time >= startTime, e.g. >= 23:00)
          // 2. Morning meds on NEXT day (time <= endTime, e.g. <= 10:00)
          const nextDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
          const nextStartOfDay = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 0, 0, 0, 0)
          const nextEndOfDay = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 23, 59, 59, 999)

          const [nextDayMedications, nextDayAdministrations] = await Promise.all([
            prisma.medication.findMany({
              where: {
                clientId,
                isActive: true,
                startDate: { lte: nextEndOfDay },
                OR: [{ endDate: null }, { endDate: { gte: nextStartOfDay } }],
              },
            }),
            prisma.medicationAdministration.findMany({
              where: {
                clientId,
                scheduledTime: { gte: nextStartOfDay, lte: nextEndOfDay },
              },
              include: {
                caregiver: { select: { name: true } },
              },
            }),
          ])

          // Evening part: meds on shift date with time >= shift start
          const eveningMeds = buildMedicationSchedule(
            medications, medAdministrations, targetDate,
            { startTime: firstShift.startTime, endTime: firstShift.endTime, dayPart: "evening" }
          )

          // Morning part: meds on next day with time <= shift end
          const morningMeds = buildMedicationSchedule(
            nextDayMedications, nextDayAdministrations, nextDay,
            { startTime: firstShift.startTime, endTime: firstShift.endTime, dayPart: "morning" }
          )

          medItems = [...eveningMeds, ...morningMeds]
        } else {
          // Normal shift: only meds within shift time range
          medItems = buildMedicationSchedule(
            medications, medAdministrations, targetDate,
            { startTime: firstShift.startTime, endTime: firstShift.endTime, dayPart: "full" }
          )
        }

        // Build tube feeding schedule (reuse recurrence logic)
        const dayOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][targetDate.getDay()]
        const filteredTubeFeeds = filterTubeFeedingSchedules(tubeFeedSchedules, targetDate, dayOfWeek)
        const tubeItems = filteredTubeFeeds.map((schedule) => {
          const [hours, minutes] = schedule.feedingTime.split(":")
          const scheduledTime = new Date(targetDate)
          scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

          const administration = tubeFeedAdmins.find(
            (a) => a.scheduleId === schedule.id &&
              new Date(a.scheduledTime).getHours() === parseInt(hours) &&
              new Date(a.scheduledTime).getMinutes() === parseInt(minutes)
          )

          return {
            scheduleId: schedule.id,
            time: schedule.feedingTime,
            volume: schedule.volume,
            feedSpeed: schedule.feedSpeed,
            feedType: schedule.feedType,
            status: administration ? (administration.wasGiven ? "given" : "skipped") : "pending" as "pending" | "given" | "skipped",
            administration: administration ? { caregiverName: administration.caregiver.name } : null,
          }
        })

        // Nursing procedures
        const nursingItems = nursingProcedures.map((p) => {
          const dueDate = new Date(p.nextDueDate)
          dueDate.setHours(0, 0, 0, 0)
          const isOverdue = dueDate < startOfDay
          const lastLog = p.logs[0]
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            nextDueDate: p.nextDueDate.toISOString(),
            isOverdue,
            lastPerformed: lastLog
              ? { date: lastLog.performedAt.toISOString(), caregiverName: lastLog.caregiver.name }
              : null,
          }
        })

        // Wound care
        const woundItems = woundCarePlans.map((plan) => {
          const lastReport = plan.reports[0]
          let isDueToday = false
          let isOverdue = false
          let nextCareDate: string | null = null

          if (lastReport?.nextCareDate) {
            const ncd = new Date(lastReport.nextCareDate)
            ncd.setHours(0, 0, 0, 0)
            nextCareDate = lastReport.nextCareDate.toISOString()
            if (ncd <= startOfDay) {
              isOverdue = true
              isDueToday = true
            } else if (ncd <= endOfDay) {
              isDueToday = true
            }
          } else if (!lastReport) {
            // No reports yet for active plan - needs first care
            isDueToday = true
          }

          return {
            planId: plan.id,
            location: plan.location,
            woundType: plan.woundType,
            frequency: plan.frequency,
            isDueToday,
            isOverdue,
            nextCareDate,
          }
        }).filter((w) => w.isDueToday || w.isOverdue)

        // Meals
        const mealTypes = meals.map((m) => m.mealType)
        const voeding = {
          breakfast: mealTypes.includes("breakfast"),
          lunch: mealTypes.includes("lunch"),
          dinner: mealTypes.includes("dinner"),
          snack: mealTypes.includes("snack"),
        }

        // Compute summary
        const medCompleted = medItems.filter((m) => m.status !== "pending").length
        const medPending = medItems.filter((m) => m.status === "pending").length
        const tubeCompleted = tubeItems.filter((t) => t.status !== "pending").length
        const tubePending = tubeItems.filter((t) => t.status === "pending").length
        const nursingOverdue = nursingItems.filter((n) => n.isOverdue).length
        const nursingDue = nursingItems.length
        const woundOverdue = woundItems.filter((w) => w.isOverdue).length
        const woundDue = woundItems.length

        const totalTasks = medItems.length + tubeItems.length + nursingDue + woundDue
        const completed = medCompleted + tubeCompleted
        const pending = medPending + tubePending + (nursingDue - nursingOverdue) + (woundDue - woundOverdue)
        const overdue = nursingOverdue + woundOverdue

        let status: "all_done" | "pending" | "overdue" = "all_done"
        if (overdue > 0) status = "overdue"
        else if (pending > 0) status = "pending"

        return {
          client,
          shift: {
            id: firstShift.id,
            startTime: firstShift.startTime,
            endTime: firstShift.endTime,
            shiftTypeName: firstShift.shiftType.name,
            shiftTypeColor: firstShift.shiftType.color,
          },
          medicatie: {
            items: medItems,
            summary: {
              total: medItems.length,
              given: medItems.filter((m) => m.status === "given").length,
              skipped: medItems.filter((m) => m.status === "skipped").length,
              pending: medPending,
            },
          },
          sondevoeding: {
            items: tubeItems,
            summary: {
              total: tubeItems.length,
              given: tubeItems.filter((t) => t.status === "given").length,
              skipped: tubeItems.filter((t) => t.status === "skipped").length,
              pending: tubePending,
            },
          },
          verpleegtechnisch: { items: nursingItems },
          wondzorg: { items: woundItems },
          io: {
            defecation: defecationCount,
            urine: { count: urineAgg._count, volume: urineAgg._sum.volume || 0 },
            fluid: { count: fluidAgg._count, volume: fluidAgg._sum.volume || 0 },
          },
          voeding,
          rapportage: { count: reportCount },
          summary: { totalTasks, completed, pending, overdue, status },
        }
      }
    )

    const clientTasks = await Promise.all(clientTasksPromises)

    // Global summary
    const globalSummary = clientTasks.reduce(
      (acc, ct) => ({
        totalTasks: acc.totalTasks + ct.summary.totalTasks,
        completed: acc.completed + ct.summary.completed,
        pending: acc.pending + ct.summary.pending,
        overdue: acc.overdue + ct.summary.overdue,
      }),
      { totalTasks: 0, completed: 0, pending: 0, overdue: 0 }
    )

    return NextResponse.json({
      date: formatDate(targetDate),
      clients: clientTasks,
      globalSummary,
    })
  } catch (error) {
    console.error("Error fetching daily tasks:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// --- Helper functions ---

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

// Helper: convert "HH:MM" to minutes since midnight
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

// Reused medication schedule logic from /api/medications/schedule
// shiftFilter: filters medications to only those within the caregiver's shift time range
function buildMedicationSchedule(
  medications: any[],
  administrations: any[],
  targetDate: Date,
  shiftFilter?: { startTime: string; endTime: string; dayPart: "evening" | "morning" | "full" }
) {
  const schedule = medications.flatMap((medication) => {
    try {
      const times = JSON.parse(medication.times) as string[]
      return times.filter((time: string) => {
        if (!shiftFilter) return true
        const medMin = timeToMinutes(time)
        const startMin = timeToMinutes(shiftFilter.startTime)
        const endMin = timeToMinutes(shiftFilter.endTime)

        if (shiftFilter.dayPart === "evening") {
          return medMin >= startMin
        } else if (shiftFilter.dayPart === "morning") {
          return medMin <= endMin
        } else {
          return medMin >= startMin && medMin <= endMin
        }
      }).map((time: string) => {
        const [hours, minutes] = time.split(":")
        const scheduledTime = new Date(targetDate)
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        const administration = administrations.find((admin: any) => {
          const adminTime = new Date(admin.scheduledTime)
          return (
            admin.medicationId === medication.id &&
            adminTime.getFullYear() === targetDate.getFullYear() &&
            adminTime.getMonth() === targetDate.getMonth() &&
            adminTime.getDate() === targetDate.getDate() &&
            adminTime.getHours() === parseInt(hours) &&
            adminTime.getMinutes() === parseInt(minutes)
          )
        })

        return {
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          unit: medication.unit,
          instructions: medication.instructions,
          time,
          status: administration
            ? administration.wasGiven ? "given" : "skipped"
            : "pending" as "pending" | "given" | "skipped",
          administration: administration
            ? { caregiverName: administration.caregiver.name }
            : null,
        }
      })
    } catch {
      return []
    }
  })

  schedule.sort((a: any, b: any) => a.time.localeCompare(b.time))
  return schedule
}

// Reused tube feeding recurrence filter from /api/voeding/tube-feeding/daily
function filterTubeFeedingSchedules(
  allSchedules: any[],
  targetDate: Date,
  dayOfWeek: string
) {
  return allSchedules.filter((schedule) => {
    const scheduleStartDate = new Date(schedule.startDate)
    scheduleStartDate.setHours(0, 0, 0, 0)
    const targetDateOnly = new Date(targetDate)
    targetDateOnly.setHours(0, 0, 0, 0)

    if (targetDateOnly < scheduleStartDate) return false

    if (schedule.endDate) {
      const scheduleEndDate = new Date(schedule.endDate)
      scheduleEndDate.setHours(23, 59, 59, 999)
      if (targetDateOnly > scheduleEndDate) return false
    }

    if (schedule.recurrenceType === "one_time") {
      return targetDateOnly.getTime() === scheduleStartDate.getTime()
    } else if (schedule.recurrenceType === "daily") {
      return true
    } else if (schedule.recurrenceType === "weekly" || schedule.recurrenceType === "specific_days") {
      if (schedule.daysOfWeek) {
        const selectedDays = JSON.parse(schedule.daysOfWeek)
        return selectedDays.includes(dayOfWeek)
      }
      return false
    }

    return true
  })
}
