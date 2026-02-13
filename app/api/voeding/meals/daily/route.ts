import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/voeding/meals/daily - Get scheduled meals for a specific date with status
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
    const schedules = await prisma.mealSchedule.findMany({
      where: {
        clientId,
        isActive: true,
        startDate: { lte: endOfDay },
        OR: [
          { endDate: null },
          { endDate: { gte: startOfDay } },
        ],
      },
      orderBy: { mealTime: "asc" },
    })

    // Filter schedules by recurrence type
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

    // Fetch existing meal records for this date
    const mealRecords = await prisma.mealRecord.findMany({
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
    const dailyItems = applicableSchedules.map((schedule) => {
      // Match by mealType — if a record exists for this mealType on this day, it's done
      const matchingRecord = mealRecords.find((r) => r.mealType === schedule.mealType)

      return {
        schedule: {
          id: schedule.id,
          mealTime: schedule.mealTime,
          mealType: schedule.mealType,
          description: schedule.description,
          recurrenceType: schedule.recurrenceType,
        },
        time: schedule.mealTime,
        status: matchingRecord ? "done" as const : "pending" as const,
        record: matchingRecord ? {
          id: matchingRecord.id,
          recordTime: matchingRecord.recordTime,
          mealType: matchingRecord.mealType,
          description: matchingRecord.description,
          amount: matchingRecord.amount,
          notes: matchingRecord.notes,
          caregiver: {
            name: matchingRecord.caregiver.name,
            email: matchingRecord.caregiver.user.email,
          },
        } : null,
      }
    })

    return NextResponse.json({ schedule: dailyItems })
  } catch (error) {
    console.error("Get daily meal schedule error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
