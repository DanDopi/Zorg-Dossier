import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Get medication schedule for a specific date
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const dateStr = searchParams.get("date") // YYYY-MM-DD format

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: {
            clientRelationships: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Determine which client's schedule to fetch
    let targetClientId = clientId

    if (user.role === "CLIENT") {
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }
      targetClientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }

      const hasRelationship = user.caregiverProfile?.clientRelationships.some(
        (rel) => rel.clientId === clientId && rel.status === "ACTIVE"
      )

      if (!hasRelationship) {
        return NextResponse.json(
          { error: "Geen toegang tot deze cliënt" },
          { status: 403 }
        )
      }
    } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    // Parse the date or use today
    // Important: Parse date string carefully to avoid timezone issues
    let targetDate: Date
    if (dateStr) {
      // Parse YYYY-MM-DD format in local timezone
      const [year, month, day] = dateStr.split("-").map(Number)
      targetDate = new Date(year, month - 1, day)
    } else {
      targetDate = new Date()
    }

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get all active medications for this client
    const medications = await prisma.medication.findMany({
      where: {
        clientId: targetClientId!,
        isActive: true,
        startDate: { lte: endOfDay },
        OR: [
          { endDate: null },
          { endDate: { gte: startOfDay } },
        ],
      },
    })

    // Get all administrations for this day
    const administrations = await prisma.medicationAdministration.findMany({
      where: {
        clientId: targetClientId!,
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
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

    // Build the schedule
    const schedule = medications.flatMap((medication) => {
      try {
        const times = JSON.parse(medication.times) as string[]

        return times.map((time) => {
          const [hours, minutes] = time.split(":")
          const scheduledTime = new Date(targetDate)
          scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

          // Find matching administration
          const administration = administrations.find((admin) => {
            const adminTime = new Date(admin.scheduledTime)
            // Must match: medication ID, date, hour, and minute
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
            medication: {
              id: medication.id,
              name: medication.name,
              dosage: medication.dosage,
              unit: medication.unit,
              instructions: medication.instructions,
            },
            scheduledTime: scheduledTime.toISOString(),
            time: time, // HH:MM format
            status: administration
              ? administration.wasGiven
                ? "given"
                : "skipped"
              : "pending",
            isOrphaned: false,
            administration: administration
              ? {
                  id: administration.id,
                  administeredAt: administration.administeredAt,
                  dosageGiven: administration.dosageGiven,
                  notes: administration.notes,
                  skipReason: administration.skipReason,
                  caregiver: {
                    name: administration.caregiver.name,
                    email: administration.caregiver.user.email,
                  },
                }
              : null,
          }
        })
      } catch {
        return []
      }
    })

    // Find orphaned administrations (administrations that don't match current schedule times)
    const matchedAdminIds = new Set(
      schedule
        .filter(s => s.administration)
        .map(s => s.administration!.id)
    )

    const orphanedAdministrations = administrations
      .filter(admin => !matchedAdminIds.has(admin.id))
      .map(admin => {
        const adminTime = new Date(admin.scheduledTime)
        const timeStr = `${String(adminTime.getHours()).padStart(2, '0')}:${String(adminTime.getMinutes()).padStart(2, '0')}`

        // Find the medication this administration belongs to
        const medication = medications.find(m => m.id === admin.medicationId)

        if (!medication) return null

        return {
          medication: {
            id: medication.id,
            name: medication.name,
            dosage: medication.dosage,
            unit: medication.unit,
            instructions: medication.instructions,
          },
          scheduledTime: admin.scheduledTime.toISOString(),
          time: timeStr,
          status: admin.wasGiven ? "given" : "skipped",
          isOrphaned: true,
          administration: {
            id: admin.id,
            administeredAt: admin.administeredAt,
            dosageGiven: admin.dosageGiven,
            notes: admin.notes,
            skipReason: admin.skipReason,
            caregiver: {
              name: admin.caregiver.name,
              email: admin.caregiver.user.email,
            },
          },
        }
      })
      .filter(item => item !== null)

    // Combine schedule with orphaned administrations
    schedule.push(...orphanedAdministrations)

    // Sort by scheduled time
    schedule.sort((a, b) => {
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    })

    return NextResponse.json({
      date: targetDate.toISOString().split("T")[0],
      schedule,
      summary: {
        total: schedule.length,
        given: schedule.filter((s) => s.status === "given").length,
        skipped: schedule.filter((s) => s.status === "skipped").length,
        pending: schedule.filter((s) => s.status === "pending").length,
      },
    })
  } catch (error) {
    console.error("Fetch schedule error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
