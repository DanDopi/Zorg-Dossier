import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/voeding/tube-feeding/daily - Fetch daily tube feeding schedule with administrations
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get("clientId")
    const date = searchParams.get("date")

    if (!clientId || !date) {
      return NextResponse.json(
        { error: "Client ID en datum zijn verplicht" },
        { status: 400 }
      )
    }

    // Verify user has access to this client
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: {
            clientRelationships: {
              where: {
                clientId,
                status: "ACTIVE",
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    // Check access
    const hasAccess =
      (user.role === "CLIENT" && user.clientProfile?.id === clientId) ||
      (user.role === "CAREGIVER" && user.caregiverProfile?.clientRelationships.length! > 0) ||
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN"

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Geen toegang tot deze cliënt" },
        { status: 403 }
      )
    }

    // Parse date
    const targetDate = new Date(date)
    const dayOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][targetDate.getDay()]

    // Get all active schedules for this client
    const allSchedules = await prisma.tubeFeedingSchedule.findMany({
      where: {
        clientId,
        isActive: true,
      },
      orderBy: {
        feedingTime: "asc",
      },
    })

    // Filter schedules based on recurrence type and date
    const schedules = allSchedules.filter((schedule) => {
      // Check if schedule is within date range
      const scheduleStartDate = new Date(schedule.startDate)
      scheduleStartDate.setHours(0, 0, 0, 0)
      const targetDateOnly = new Date(targetDate)
      targetDateOnly.setHours(0, 0, 0, 0)

      // Must be after or on start date
      if (targetDateOnly < scheduleStartDate) {
        return false
      }

      // Must be before or on end date (if set)
      if (schedule.endDate) {
        const scheduleEndDate = new Date(schedule.endDate)
        scheduleEndDate.setHours(23, 59, 59, 999)
        if (targetDateOnly > scheduleEndDate) {
          return false
        }
      }

      // Check recurrence type
      if (schedule.recurrenceType === "one_time") {
        // One-time schedules only show on the start date
        return targetDateOnly.getTime() === scheduleStartDate.getTime()
      } else if (schedule.recurrenceType === "daily") {
        // Daily schedules show every day
        return true
      } else if (schedule.recurrenceType === "weekly" || schedule.recurrenceType === "specific_days") {
        // Weekly/specific days schedules only show on selected days
        if (schedule.daysOfWeek) {
          const selectedDays = JSON.parse(schedule.daysOfWeek)
          return selectedDays.includes(dayOfWeek)
        }
        return false
      }

      return true
    })

    // Build daily schedule with administrations
    const dailySchedule = await Promise.all(
      schedules.map(async (schedule) => {
        // Create scheduled time for this date
        const [hours, minutes] = schedule.feedingTime.split(":")
        const scheduledTime = new Date(targetDate)
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        // Check if there's an administration for this scheduled time
        const administration = await prisma.tubeFeedingAdministration.findFirst({
          where: {
            scheduleId: schedule.id,
            scheduledTime: scheduledTime,
          },
          include: {
            caregiver: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        })

        // Determine status
        let status: "pending" | "given" | "skipped" = "pending"
        if (administration) {
          status = administration.wasGiven ? "given" : "skipped"
        }

        return {
          schedule,
          scheduledTime: scheduledTime.toISOString(),
          time: schedule.feedingTime,
          status,
          administration: administration
            ? {
                id: administration.id,
                scheduledTime: administration.scheduledTime.toISOString(),
                administeredAt: administration.administeredAt.toISOString(),
                volumeGiven: administration.volumeGiven,
                speedUsed: administration.speedUsed,
                wasGiven: administration.wasGiven,
                skipReason: administration.skipReason,
                notes: administration.notes,
                caregiver: {
                  name: administration.caregiver.name,
                  email: administration.caregiver.user.email,
                },
              }
            : undefined,
        }
      })
    )

    return NextResponse.json({ schedule: dailySchedule }, { status: 200 })
  } catch (error) {
    console.error("Get daily tube feeding schedule error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
