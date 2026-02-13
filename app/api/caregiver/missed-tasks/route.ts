import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/caregiver/missed-tasks
// Returns all past shifts (within last 60 days) with missing tasks
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
      },
    })

    if (!user || user.role !== "CAREGIVER" || !user.caregiverProfile) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const caregiverId = user.caregiverProfile.id

    const now = new Date()
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Limit lookback to 60 days to avoid scanning entire history
    const lookbackDate = new Date(todayLocal)
    lookbackDate.setDate(lookbackDate.getDate() - 60)

    // Single query: fetch all past shifts within lookback window
    const shifts = await prisma.shift.findMany({
      where: {
        caregiverId,
        date: { gte: lookbackDate, lt: todayLocal },
        status: { in: ["FILLED", "COMPLETED"] },
      },
      include: {
        shiftType: true,
        client: true,
      },
      orderBy: { date: "desc" },
    })

    if (shifts.length === 0) {
      return NextResponse.json({ missedDays: [] })
    }

    // Collect all unique client IDs and the full date range
    const clientIds = [...new Set(shifts.map(s => s.clientId))]
    const rangeStart = new Date(lookbackDate)
    // Add 1 day past today for overnight shift next-day checks
    const rangeEnd = new Date(todayLocal)
    rangeEnd.setDate(rangeEnd.getDate() + 1)
    rangeEnd.setHours(23, 59, 59, 999)

    // Batch queries: fetch all data upfront in parallel
    const [
      allReports, allMedications, allAdministrations,
      allTubeSchedules, allTubeAdmins,
      allMealSchedules, allMealRecords,
      allFluidSchedules, allFluidRecords,
    ] = await Promise.all([
      // Care reports
      prisma.careReport.findMany({
        where: {
          caregiverId,
          clientId: { in: clientIds },
          reportDate: { gte: rangeStart, lte: rangeEnd },
        },
        select: { clientId: true, reportDate: true },
      }),
      // Medications
      prisma.medication.findMany({
        where: {
          clientId: { in: clientIds },
          isActive: true,
          startDate: { lte: rangeEnd },
          OR: [{ endDate: null }, { endDate: { gte: rangeStart } }],
        },
      }),
      // Medication administrations
      prisma.medicationAdministration.findMany({
        where: {
          clientId: { in: clientIds },
          scheduledTime: { gte: rangeStart, lte: rangeEnd },
        },
      }),
      // Tube feeding schedules
      prisma.tubeFeedingSchedule.findMany({
        where: { clientId: { in: clientIds }, isActive: true },
      }),
      // Tube feeding administrations
      prisma.tubeFeedingAdministration.findMany({
        where: {
          clientId: { in: clientIds },
          scheduledTime: { gte: rangeStart, lte: rangeEnd },
        },
      }),
      // Meal schedules
      prisma.mealSchedule.findMany({
        where: { clientId: { in: clientIds }, isActive: true },
      }),
      // Meal records
      prisma.mealRecord.findMany({
        where: {
          clientId: { in: clientIds },
          recordDate: { gte: rangeStart, lte: rangeEnd },
        },
        select: { clientId: true, recordDate: true, mealType: true },
      }),
      // Fluid intake schedules
      prisma.fluidIntakeSchedule.findMany({
        where: { clientId: { in: clientIds }, isActive: true },
      }),
      // Fluid intake records
      prisma.fluidIntakeRecord.findMany({
        where: {
          clientId: { in: clientIds },
          recordDate: { gte: rangeStart, lte: rangeEnd },
        },
        select: { clientId: true, recordDate: true, recordTime: true },
      }),
    ])

    // Build indexes for O(1) lookups

    // Reports by clientId:dateKey
    const reportIndex = new Map<string, number>()
    for (const report of allReports) {
      const d = new Date(report.reportDate)
      const key = `${report.clientId}:${formatDateKey(d)}`
      reportIndex.set(key, (reportIndex.get(key) || 0) + 1)
    }

    // Medications by clientId
    const medsByClient = new Map<string, typeof allMedications>()
    for (const med of allMedications) {
      if (!medsByClient.has(med.clientId)) medsByClient.set(med.clientId, [])
      medsByClient.get(med.clientId)!.push(med)
    }

    // Medication administrations by clientId:dateKey
    const adminIndex = new Map<string, typeof allAdministrations>()
    for (const admin of allAdministrations) {
      const d = new Date(admin.scheduledTime)
      const key = `${admin.clientId}:${formatDateKey(d)}`
      if (!adminIndex.has(key)) adminIndex.set(key, [])
      adminIndex.get(key)!.push(admin)
    }

    // Tube feeding schedules by clientId
    const tubeSchedByClient = new Map<string, typeof allTubeSchedules>()
    for (const s of allTubeSchedules) {
      if (!tubeSchedByClient.has(s.clientId)) tubeSchedByClient.set(s.clientId, [])
      tubeSchedByClient.get(s.clientId)!.push(s)
    }

    // Tube feeding admins by clientId:dateKey
    const tubeAdminIndex = new Map<string, typeof allTubeAdmins>()
    for (const a of allTubeAdmins) {
      const d = new Date(a.scheduledTime)
      const key = `${a.clientId}:${formatDateKey(d)}`
      if (!tubeAdminIndex.has(key)) tubeAdminIndex.set(key, [])
      tubeAdminIndex.get(key)!.push(a)
    }

    // Meal schedules by clientId
    const mealSchedByClient = new Map<string, typeof allMealSchedules>()
    for (const s of allMealSchedules) {
      if (!mealSchedByClient.has(s.clientId)) mealSchedByClient.set(s.clientId, [])
      mealSchedByClient.get(s.clientId)!.push(s)
    }

    // Meal records by clientId:dateKey
    const mealRecordIndex = new Map<string, typeof allMealRecords>()
    for (const r of allMealRecords) {
      const d = new Date(r.recordDate)
      const key = `${r.clientId}:${formatDateKey(d)}`
      if (!mealRecordIndex.has(key)) mealRecordIndex.set(key, [])
      mealRecordIndex.get(key)!.push(r)
    }

    // Fluid schedules by clientId
    const fluidSchedByClient = new Map<string, typeof allFluidSchedules>()
    for (const s of allFluidSchedules) {
      if (!fluidSchedByClient.has(s.clientId)) fluidSchedByClient.set(s.clientId, [])
      fluidSchedByClient.get(s.clientId)!.push(s)
    }

    // Fluid records by clientId:dateKey
    const fluidRecordIndex = new Map<string, typeof allFluidRecords>()
    for (const r of allFluidRecords) {
      const d = new Date(r.recordDate)
      const key = `${r.clientId}:${formatDateKey(d)}`
      if (!fluidRecordIndex.has(key)) fluidRecordIndex.set(key, [])
      fluidRecordIndex.get(key)!.push(r)
    }

    // Group shifts by date
    const shiftsByDate = new Map<string, typeof shifts>()
    for (const shift of shifts) {
      const dateKey = formatDateKey(new Date(shift.date))
      if (!shiftsByDate.has(dateKey)) shiftsByDate.set(dateKey, [])
      shiftsByDate.get(dateKey)!.push(shift)
    }

    const missedDays: Array<{
      date: string
      dateLabel: string
      clients: Array<{
        clientId: string
        clientName: string
        shiftTypeName: string
        shiftTypeColor: string
        startTime: string
        endTime: string
        hasReport: boolean
        pendingMedications: number
        totalMedications: number
        medicationDate: string
        pendingSondevoeding: number
        totalSondevoeding: number
        pendingVoeding: number
        totalVoeding: number
        pendingVocht: number
        totalVocht: number
      }>
    }> = []

    for (const [dateKey, dayShifts] of shiftsByDate) {
      const [year, month, day] = dateKey.split("-").map(Number)
      const shiftDate = new Date(year, month - 1, day)
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
      const dayOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][shiftDate.getDay()]

      const dayClients: typeof missedDays[0]["clients"] = []
      const processedClients = new Set<string>()

      for (const shift of dayShifts) {
        if (processedClients.has(shift.clientId)) continue
        processedClients.add(shift.clientId)

        // Look up report count from index
        const reportCount = reportIndex.get(`${shift.clientId}:${dateKey}`) || 0

        // --- Medication calculation ---
        const shiftStartMin = timeToMinutes(shift.startTime)
        const shiftEndMin = timeToMinutes(shift.endTime)
        const isOvernightShift = shiftEndMin < shiftStartMin

        const clientMeds = (medsByClient.get(shift.clientId) || []).filter(med => {
          const medStart = new Date(med.startDate)
          const medEnd = med.endDate ? new Date(med.endDate) : null
          return medStart <= endOfDay && (!medEnd || medEnd >= startOfDay)
        })

        const administrations = adminIndex.get(`${shift.clientId}:${dateKey}`) || []

        let totalScheduledDoses = 0
        let administeredDoses = 0
        let nextDayPendingDoses = 0

        for (const med of clientMeds) {
          try {
            const times = JSON.parse(med.times as string) as string[]
            for (const time of times) {
              const dayPart = isOvernightShift ? "evening" : "full"
              if (isMedTimeInShift(time, shift.startTime, shift.endTime, dayPart)) {
                totalScheduledDoses++
                const [th, tm] = time.split(":").map(Number)
                const hasAdmin = administrations.some(admin => {
                  const adminTime = new Date(admin.scheduledTime)
                  return admin.medicationId === med.id &&
                    adminTime.getHours() === th &&
                    adminTime.getMinutes() === tm
                })
                if (hasAdmin) administeredDoses++
              }
            }
          } catch {
            // Skip medications with invalid times
          }
        }

        // For overnight shifts, also count next-day morning medications
        if (isOvernightShift) {
          const nextDay = new Date(year, month - 1, day + 1)
          const nextDateKey = formatDateKey(nextDay)
          const nextStartOfDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0)
          const nextEndOfDay = new Date(year, month - 1, day + 1, 23, 59, 59, 999)

          const nextDayMeds = (medsByClient.get(shift.clientId) || []).filter(med => {
            const medStart = new Date(med.startDate)
            const medEnd = med.endDate ? new Date(med.endDate) : null
            return medStart <= nextEndOfDay && (!medEnd || medEnd >= nextStartOfDay)
          })

          const nextDayAdmins = adminIndex.get(`${shift.clientId}:${nextDateKey}`) || []

          for (const med of nextDayMeds) {
            try {
              const times = JSON.parse(med.times as string) as string[]
              for (const time of times) {
                if (isMedTimeInShift(time, shift.startTime, shift.endTime, "morning")) {
                  totalScheduledDoses++
                  const [th, tm] = time.split(":").map(Number)
                  const hasAdmin = nextDayAdmins.some(admin => {
                    const adminTime = new Date(admin.scheduledTime)
                    return admin.medicationId === med.id &&
                      adminTime.getHours() === th &&
                      adminTime.getMinutes() === tm
                  })
                  if (hasAdmin) {
                    administeredDoses++
                  } else {
                    nextDayPendingDoses++
                  }
                }
              }
            } catch {
              // Skip medications with invalid times
            }
          }
        }

        const pendingDoses = Math.max(0, totalScheduledDoses - administeredDoses)

        let medDate = dateKey
        if (isOvernightShift && nextDayPendingDoses > 0) {
          const nd = new Date(year, month - 1, day + 1)
          medDate = formatDateKey(nd)
        }

        // --- Tube feeding calculation ---
        const clientTubeScheds = tubeSchedByClient.get(shift.clientId) || []
        const filteredTubeScheds = filterSchedulesByRecurrence(clientTubeScheds, shiftDate, dayOfWeek)
        const tubeAdmins = tubeAdminIndex.get(`${shift.clientId}:${dateKey}`) || []
        let tubePending = 0
        for (const sched of filteredTubeScheds) {
          const [h, m] = sched.feedingTime.split(":").map(Number)
          const hasAdmin = tubeAdmins.some((a: any) =>
            a.scheduleId === sched.id &&
            new Date(a.scheduledTime).getHours() === h &&
            new Date(a.scheduledTime).getMinutes() === m
          )
          if (!hasAdmin) tubePending++
        }

        // --- Meal schedule calculation ---
        const clientMealScheds = mealSchedByClient.get(shift.clientId) || []
        const filteredMealScheds = filterSchedulesByRecurrence(clientMealScheds, shiftDate, dayOfWeek)
        const dayMealRecords = mealRecordIndex.get(`${shift.clientId}:${dateKey}`) || []
        const mealTypes = dayMealRecords.map(r => r.mealType)
        let mealPending = 0
        for (const sched of filteredMealScheds) {
          if (!mealTypes.includes(sched.mealType)) mealPending++
        }

        // --- Fluid schedule calculation ---
        const clientFluidScheds = fluidSchedByClient.get(shift.clientId) || []
        const filteredFluidScheds = filterSchedulesByRecurrence(clientFluidScheds, shiftDate, dayOfWeek)
        const dayFluidRecords = fluidRecordIndex.get(`${shift.clientId}:${dateKey}`) || []
        let fluidPending = 0
        for (const sched of filteredFluidScheds) {
          const [schedH, schedM] = sched.intakeTime.split(":").map(Number)
          const schedMinutes = schedH * 60 + schedM
          const matched = dayFluidRecords.some(r => {
            const rt = new Date(r.recordTime)
            const recMinutes = rt.getHours() * 60 + rt.getMinutes()
            return Math.abs(recMinutes - schedMinutes) <= 60
          })
          if (!matched) fluidPending++
        }

        // Check if there are any issues
        const hasIssues = reportCount === 0 || pendingDoses > 0 ||
          tubePending > 0 || mealPending > 0 || fluidPending > 0

        if (hasIssues) {
          dayClients.push({
            clientId: shift.clientId,
            clientName: shift.client.name,
            shiftTypeName: shift.shiftType.name,
            shiftTypeColor: shift.shiftType.color,
            startTime: shift.startTime,
            endTime: shift.endTime,
            hasReport: reportCount > 0,
            pendingMedications: pendingDoses,
            totalMedications: totalScheduledDoses,
            medicationDate: medDate,
            pendingSondevoeding: tubePending,
            totalSondevoeding: filteredTubeScheds.length,
            pendingVoeding: mealPending,
            totalVoeding: filteredMealScheds.length,
            pendingVocht: fluidPending,
            totalVocht: filteredFluidScheds.length,
          })
        }
      }

      if (dayClients.length > 0) {
        missedDays.push({
          date: dateKey,
          dateLabel: shiftDate.toLocaleDateString("nl-NL", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          clients: dayClients,
        })
      }
    }

    return NextResponse.json({ missedDays })
  } catch (error) {
    console.error("Error fetching missed tasks:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// --- Helper functions ---

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function isMedTimeInShift(
  medTime: string,
  shiftStartTime: string,
  shiftEndTime: string,
  dayPart: "evening" | "morning" | "full"
): boolean {
  const medMin = timeToMinutes(medTime)
  const startMin = timeToMinutes(shiftStartTime)
  const endMin = timeToMinutes(shiftEndTime)

  if (dayPart === "evening") return medMin >= startMin
  if (dayPart === "morning") return medMin <= endMin
  return medMin >= startMin && medMin <= endMin
}

function filterSchedulesByRecurrence(
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
