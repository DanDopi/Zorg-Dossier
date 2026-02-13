import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/caregiver/missed-tasks
// Returns all past shifts (excluding today) with missing reports or pending medications
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

    // Use local date parsing (same approach as daily-tasks route) to avoid timezone issues
    const now = new Date()
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Fetch all past shifts - no lower bound, look back forever
    const shifts = await prisma.shift.findMany({
      where: {
        caregiverId,
        date: { lt: todayLocal },
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

    // Group shifts by date using local date key
    const shiftsByDate = new Map<string, typeof shifts>()
    for (const shift of shifts) {
      const d = new Date(shift.date)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      if (!shiftsByDate.has(dateKey)) {
        shiftsByDate.set(dateKey, [])
      }
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
        medicationDate: string // date where pending meds actually are (next day for overnight shifts)
      }>
    }> = []

    // Helper: convert "HH:MM" to minutes since midnight
    function timeToMinutes(time: string): number {
      const [h, m] = time.split(":").map(Number)
      return h * 60 + m
    }

    // Helper: check if a medication time falls within a shift's time range
    // For overnight shifts, dayPart specifies which part to check:
    //   "evening" = shift start day (times >= startTime)
    //   "morning" = next day (times <= endTime)
    //   "full" = normal non-overnight shift
    function isMedTimeInShift(
      medTime: string,
      shiftStartTime: string,
      shiftEndTime: string,
      dayPart: "evening" | "morning" | "full"
    ): boolean {
      const medMin = timeToMinutes(medTime)
      const startMin = timeToMinutes(shiftStartTime)
      const endMin = timeToMinutes(shiftEndTime)

      if (dayPart === "evening") {
        return medMin >= startMin
      } else if (dayPart === "morning") {
        return medMin <= endMin
      } else {
        return medMin >= startMin && medMin <= endMin
      }
    }

    for (const [dateKey, dayShifts] of shiftsByDate) {
      // Parse the date key as a local date
      const [year, month, day] = dateKey.split("-").map(Number)
      const shiftDate = new Date(year, month - 1, day)
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

      const dayClients: typeof missedDays[0]["clients"] = []
      const processedClients = new Set<string>()

      for (const shift of dayShifts) {
        // Skip if we already processed this client for this day
        if (processedClients.has(shift.clientId)) continue
        processedClients.add(shift.clientId)

        // Check for care reports on this date for this client by this caregiver
        const reportCount = await prisma.careReport.count({
          where: {
            clientId: shift.clientId,
            caregiverId,
            reportDate: { gte: startOfDay, lte: endOfDay },
          },
        })

        // Determine if this is an overnight shift
        const shiftStartMin = timeToMinutes(shift.startTime)
        const shiftEndMin = timeToMinutes(shift.endTime)
        const isOvernightShift = shiftEndMin < shiftStartMin

        // Fetch active medications for this client on the shift date
        const medications = await prisma.medication.findMany({
          where: {
            clientId: shift.clientId,
            isActive: true,
            startDate: { lte: endOfDay },
            OR: [
              { endDate: null },
              { endDate: { gte: startOfDay } },
            ],
          },
        })

        // Fetch medication administrations for the shift date
        const administrations = await prisma.medicationAdministration.findMany({
          where: {
            clientId: shift.clientId,
            scheduledTime: { gte: startOfDay, lte: endOfDay },
          },
        })

        // Count medication doses that fall within this shift's time range on the shift date
        let totalScheduledDoses = 0
        let administeredDoses = 0
        // Track pending doses on next day separately (for overnight shift navigation)
        let nextDayPendingDoses = 0

        for (const med of medications) {
          try {
            const times = JSON.parse(med.times as string) as string[]
            for (const time of times) {
              const dayPart = isOvernightShift ? "evening" : "full"
              if (isMedTimeInShift(time, shift.startTime, shift.endTime, dayPart)) {
                totalScheduledDoses++
                // Check if this dose was administered
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
          const nextStartOfDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0)
          const nextEndOfDay = new Date(year, month - 1, day + 1, 23, 59, 59, 999)

          const nextDayMedications = await prisma.medication.findMany({
            where: {
              clientId: shift.clientId,
              isActive: true,
              startDate: { lte: nextEndOfDay },
              OR: [
                { endDate: null },
                { endDate: { gte: nextStartOfDay } },
              ],
            },
          })

          const nextDayAdministrations = await prisma.medicationAdministration.findMany({
            where: {
              clientId: shift.clientId,
              scheduledTime: { gte: nextStartOfDay, lte: nextEndOfDay },
            },
          })

          for (const med of nextDayMedications) {
            try {
              const times = JSON.parse(med.times as string) as string[]
              for (const time of times) {
                if (isMedTimeInShift(time, shift.startTime, shift.endTime, "morning")) {
                  totalScheduledDoses++
                  const [th, tm] = time.split(":").map(Number)
                  const hasAdmin = nextDayAdministrations.some(admin => {
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

        // Determine which date to navigate to for medication page
        // For overnight shifts: if pending meds are on the next morning, link to next day
        const nextDateKey = `${year}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`
        let medDate = dateKey
        if (isOvernightShift && nextDayPendingDoses > 0) {
          // Most/all pending meds are on the next morning
          const nd = new Date(year, month - 1, day + 1)
          medDate = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(nd.getDate()).padStart(2, "0")}`
        }

        const hasIssues = reportCount === 0 || pendingDoses > 0

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
