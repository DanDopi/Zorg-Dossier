import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/voeding/missing?clientId=X
// Returns counts of missing meal, tube feeding, and fluid intake items across all past days
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: {
            clientRelationships: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const clientIdParam = searchParams.get("clientId")

    let targetClientId: string
    const isCaregiver = !user.clientProfile && !!user.caregiverProfile

    if (user.clientProfile) {
      targetClientId = user.clientProfile.id
    } else if (user.caregiverProfile && clientIdParam) {
      const hasRelationship = user.caregiverProfile.clientRelationships.some(
        (rel) => rel.clientId === clientIdParam
      )
      if (!hasRelationship) {
        return NextResponse.json({ error: "No access to this client" }, { status: 403 })
      }
      targetClientId = clientIdParam
    } else {
      return NextResponse.json({ error: "Client ID required for caregivers" }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // For caregivers: get their shift dates to filter which days they're responsible for
    let caregiverShiftDates: Set<string> | null = null
    if (isCaregiver && user.caregiverProfile) {
      const shifts = await prisma.shift.findMany({
        where: {
          caregiverId: user.caregiverProfile.id,
          clientId: targetClientId,
          status: { in: ["FILLED", "COMPLETED"] },
          date: { lt: today },
        },
        select: { date: true },
      })
      caregiverShiftDates = new Set(
        shifts.map((s) => {
          const d = new Date(s.date)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        })
      )
    }

    // Fetch all active schedules
    const [mealSchedules, tubeFeedingSchedules, fluidSchedules] = await Promise.all([
      prisma.mealSchedule.findMany({
        where: { clientId: targetClientId, isActive: true },
      }),
      prisma.tubeFeedingSchedule.findMany({
        where: { clientId: targetClientId, isActive: true },
      }),
      prisma.fluidIntakeSchedule.findMany({
        where: { clientId: targetClientId, isActive: true },
      }),
    ])

    // Determine date range: earliest schedule start to yesterday
    const allStartDates = [
      ...mealSchedules.map((s) => new Date(s.startDate)),
      ...tubeFeedingSchedules.map((s) => new Date(s.startDate)),
      ...fluidSchedules.map((s) => new Date(s.startDate)),
    ]

    if (allStartDates.length === 0) {
      return NextResponse.json({
        summary: { totalMissingMeals: 0, totalMissingTubeFeeding: 0, totalMissingFluids: 0, total: 0 },
      })
    }

    const earliestStart = new Date(Math.min(...allStartDates.map((d) => d.getTime())))
    earliestStart.setHours(0, 0, 0, 0)
    // Limit to 90 days back for performance
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const rangeStart = earliestStart > ninetyDaysAgo ? earliestStart : ninetyDaysAgo

    // Fetch all records in the date range
    const [mealRecords, tubeAdministrations, fluidRecords] = await Promise.all([
      prisma.mealRecord.findMany({
        where: {
          clientId: targetClientId,
          recordDate: { gte: rangeStart, lt: today },
        },
        select: { recordDate: true, mealType: true },
      }),
      prisma.tubeFeedingAdministration.findMany({
        where: {
          clientId: targetClientId,
          scheduledTime: { gte: rangeStart, lt: today },
        },
        select: { scheduledTime: true, scheduleId: true, wasGiven: true },
      }),
      prisma.fluidIntakeRecord.findMany({
        where: {
          clientId: targetClientId,
          recordDate: { gte: rangeStart, lt: today },
        },
        select: { recordDate: true, recordTime: true },
      }),
    ])

    // Index records by date
    const mealRecordsByDate = new Map<string, string[]>()
    for (const r of mealRecords) {
      const d = new Date(r.recordDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const existing = mealRecordsByDate.get(key) || []
      existing.push(r.mealType)
      mealRecordsByDate.set(key, existing)
    }

    const tubeAdminByDate = new Map<string, { scheduleId: string; wasGiven: boolean }[]>()
    for (const r of tubeAdministrations) {
      const d = new Date(r.scheduledTime)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const existing = tubeAdminByDate.get(key) || []
      existing.push({ scheduleId: r.scheduleId, wasGiven: r.wasGiven })
      tubeAdminByDate.set(key, existing)
    }

    const fluidRecordsByDate = new Map<string, number[]>()
    for (const r of fluidRecords) {
      const d = new Date(r.recordDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const existing = fluidRecordsByDate.get(key) || []
      const rt = new Date(r.recordTime)
      existing.push(rt.getHours() * 60 + rt.getMinutes())
      fluidRecordsByDate.set(key, existing)
    }

    // Iterate over each day in the range
    let totalMissingMeals = 0
    let totalMissingTubeFeeding = 0
    let totalMissingFluids = 0

    const currentDate = new Date(rangeStart)
    while (currentDate < today) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, "0")
      const day = String(currentDate.getDate()).padStart(2, "0")
      const dateKey = `${year}-${month}-${day}`
      const dayOfWeek = currentDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()

      // For caregivers, skip days they didn't work
      if (caregiverShiftDates && !caregiverShiftDates.has(dateKey)) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Filter schedules for this day
      const dayMealSchedules = filterSchedules(mealSchedules, currentDate, dayOfWeek)
      const dayTubeSchedules = filterSchedules(tubeFeedingSchedules, currentDate, dayOfWeek)
      const dayFluidSchedules = filterSchedules(fluidSchedules, currentDate, dayOfWeek)

      // Count missing meals
      const dayMealRecords = mealRecordsByDate.get(dateKey) || []
      for (const sched of dayMealSchedules) {
        const hasMatch = dayMealRecords.includes((sched as any).mealType)
        if (!hasMatch) totalMissingMeals++
      }

      // Count missing tube feedings
      const dayTubeAdmins = tubeAdminByDate.get(dateKey) || []
      for (const sched of dayTubeSchedules) {
        const hasMatch = dayTubeAdmins.some((a) => a.scheduleId === sched.id && a.wasGiven)
        if (!hasMatch) totalMissingTubeFeeding++
      }

      // Count missing fluid intakes
      const dayFluidRecordMinutes = fluidRecordsByDate.get(dateKey) || []
      for (const sched of dayFluidSchedules) {
        const [schedH, schedM] = (sched as any).intakeTime.split(":").map(Number)
        const schedMinutes = schedH * 60 + schedM
        const hasMatch = dayFluidRecordMinutes.some(
          (recMinutes: number) => Math.abs(recMinutes - schedMinutes) <= 60
        )
        if (!hasMatch) totalMissingFluids++
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({
      summary: {
        totalMissingMeals,
        totalMissingTubeFeeding,
        totalMissingFluids,
        total: totalMissingMeals + totalMissingTubeFeeding + totalMissingFluids,
      },
    })
  } catch (error) {
    console.error("Error fetching missing voeding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Generic schedule filter by recurrence (same logic as daily-tasks)
function filterSchedules<T extends { startDate: Date; endDate: Date | null; recurrenceType: string; daysOfWeek: string | null; isActive: boolean }>(
  schedules: T[],
  date: Date,
  dayOfWeek: string
): T[] {
  return schedules.filter((schedule) => {
    if (!schedule.isActive) return false

    const startDate = new Date(schedule.startDate)
    startDate.setHours(0, 0, 0, 0)
    if (date < startDate) return false

    if (schedule.endDate) {
      const endDate = new Date(schedule.endDate)
      endDate.setHours(23, 59, 59, 999)
      if (date > endDate) return false
    }

    if (schedule.recurrenceType === "daily" || schedule.recurrenceType === "one_time") {
      return true
    }

    if (schedule.recurrenceType === "specific_days" && schedule.daysOfWeek) {
      try {
        const selectedDays = JSON.parse(schedule.daysOfWeek)
        return selectedDays.includes(dayOfWeek)
      } catch {
        return false
      }
    }

    return true
  })
}
