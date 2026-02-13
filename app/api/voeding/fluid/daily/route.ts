import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/voeding/fluid/daily - Get scheduled fluid intakes for a specific date with status
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const clientId = request.nextUrl.searchParams.get("clientId")
    const date = request.nextUrl.searchParams.get("date")

    if (!clientId || !date) {
      return NextResponse.json({ error: "Client ID en datum zijn verplicht" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: {
            clientRelationships: { where: { clientId, status: "ACTIVE" } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    const hasAccess =
      (user.role === "CLIENT" && user.clientProfile?.id === clientId) ||
      (user.role === "CAREGIVER" && (user.caregiverProfile?.clientRelationships.length ?? 0) > 0) ||
      user.role === "SUPER_ADMIN" || user.role === "ADMIN"

    if (!hasAccess) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    // Parse the target date
    const [year, month, day] = date.split("-").map(Number)
    const targetDate = new Date(year, month - 1, day)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

    // Determine day of week
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    const dayOfWeek = dayNames[targetDate.getDay()]

    // Fetch active schedules that apply to this date
    const schedules = await prisma.fluidIntakeSchedule.findMany({
      where: {
        clientId,
        isActive: true,
        startDate: { lte: endOfDay },
        OR: [
          { endDate: null },
          { endDate: { gte: startOfDay } },
        ],
      },
      orderBy: { intakeTime: "asc" },
    })

    // Filter by recurrence type
    const applicableSchedules = schedules.filter((schedule) => {
      switch (schedule.recurrenceType) {
        case "one_time": {
          const sd = new Date(schedule.startDate)
          return sd.getFullYear() === year && sd.getMonth() === month - 1 && sd.getDate() === day
        }
        case "daily":
          return true
        case "weekly":
        case "specific_days": {
          if (!schedule.daysOfWeek) return false
          try {
            const days = JSON.parse(schedule.daysOfWeek) as string[]
            return days.includes(dayOfWeek)
          } catch {
            return false
          }
        }
        default:
          return true
      }
    })

    // Fetch existing fluid intake records for this date
    const fluidRecords = await prisma.fluidIntakeRecord.findMany({
      where: {
        clientId,
        recordDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        caregiver: {
          include: { user: { select: { email: true } } },
        },
      },
      orderBy: { recordTime: "asc" },
    })

    // Build daily schedule items with status
    // Match by closest time — each schedule item gets matched to the nearest record within 1 hour
    const usedRecordIds = new Set<string>()

    const dailyItems = applicableSchedules.map((schedule) => {
      // Parse scheduled time
      const [schedH, schedM] = schedule.intakeTime.split(":").map(Number)
      const scheduledMinutes = schedH * 60 + schedM

      // Find the closest unmatched record within 60 minutes
      let bestMatch: typeof fluidRecords[0] | null = null
      let bestDiff = Infinity

      for (const record of fluidRecords) {
        if (usedRecordIds.has(record.id)) continue
        const recordTime = new Date(record.recordTime)
        const recordMinutes = recordTime.getHours() * 60 + recordTime.getMinutes()
        const diff = Math.abs(recordMinutes - scheduledMinutes)
        if (diff < bestDiff && diff <= 60) {
          bestDiff = diff
          bestMatch = record
        }
      }

      if (bestMatch) {
        usedRecordIds.add(bestMatch.id)
      }

      return {
        schedule: {
          id: schedule.id,
          intakeTime: schedule.intakeTime,
          volume: schedule.volume,
          fluidType: schedule.fluidType,
          recurrenceType: schedule.recurrenceType,
        },
        time: schedule.intakeTime,
        status: bestMatch ? "done" as const : "pending" as const,
        record: bestMatch ? {
          id: bestMatch.id,
          recordTime: bestMatch.recordTime,
          volume: bestMatch.volume,
          fluidType: bestMatch.fluidType,
          notes: bestMatch.notes,
          caregiver: {
            name: bestMatch.caregiver.name,
            email: bestMatch.caregiver.user.email,
          },
        } : null,
      }
    })

    return NextResponse.json({ schedule: dailyItems })
  } catch (error) {
    console.error("Get daily fluid schedule error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
