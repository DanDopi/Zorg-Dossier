import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST - Record medication administration
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      medicationId,
      scheduledTime,
      dosageGiven,
      notes,
      wasGiven,
      skipReason,
    } = body

    if (!medicationId || !scheduledTime) {
      return NextResponse.json(
        { error: "medicationId en scheduledTime zijn verplicht" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: {
          include: {
            clientRelationships: true,
          },
        },
      },
    })

    if (!user || !user.caregiverProfile) {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen medicatie toedienen" },
        { status: 403 }
      )
    }

    // Check if medication exists
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    })

    if (!medication) {
      return NextResponse.json({ error: "Medicatie niet gevonden" }, { status: 404 })
    }

    // Check if caregiver has relationship with this client
    const hasRelationship = user.caregiverProfile.clientRelationships.some(
      (rel) => rel.clientId === medication.clientId && rel.status === "ACTIVE"
    )

    if (!hasRelationship) {
      return NextResponse.json(
        { error: "Geen toegang tot deze cliënt" },
        { status: 403 }
      )
    }

    // Server-side shift validation: verify caregiver has a shift covering this medication time
    const scheduledDateTime = new Date(scheduledTime)

    // Use local date components to avoid timezone issues (toISOString converts to UTC which causes mismatches)
    const medYear = scheduledDateTime.getFullYear()
    const medMonth = String(scheduledDateTime.getMonth() + 1).padStart(2, '0')
    const medDay = String(scheduledDateTime.getDate()).padStart(2, '0')
    const medDateStr = `${medYear}-${medMonth}-${medDay}`

    // Get previous day for overnight shift check
    const previousDate = new Date(scheduledDateTime)
    previousDate.setDate(previousDate.getDate() - 1)
    const prevYear = previousDate.getFullYear()
    const prevMonth = String(previousDate.getMonth() + 1).padStart(2, '0')
    const prevDay = String(previousDate.getDate()).padStart(2, '0')
    const prevDateStr = `${prevYear}-${prevMonth}-${prevDay}`

    // Create Date objects at noon local time to avoid timezone issues with date-only strings
    // (new Date("2026-01-07") creates UTC midnight, which can shift to wrong day in local timezone)
    const prevDateForQuery = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate(), 0, 0, 0)
    const medDateForQuery = new Date(scheduledDateTime.getFullYear(), scheduledDateTime.getMonth(), scheduledDateTime.getDate(), 23, 59, 59)

    const caregiverShifts = await prisma.shift.findMany({
      where: {
        caregiverId: user.caregiverProfile.id,
        clientId: medication.clientId,
        date: {
          gte: prevDateForQuery,
          lte: medDateForQuery,
        },
        status: { in: ["FILLED", "COMPLETED"] },
      },
    })

    // Helper function to check if medication time is within any shift
    function checkTimeWithinShifts(): boolean {
      const medHour = scheduledDateTime.getHours()
      const medMinute = scheduledDateTime.getMinutes()
      const medTimeMinutes = medHour * 60 + medMinute

      for (const shift of caregiverShifts) {
        // Use local date components for shift date too
        const shiftDate = new Date(shift.date)
        const shiftYear = shiftDate.getFullYear()
        const shiftMonth = String(shiftDate.getMonth() + 1).padStart(2, '0')
        const shiftDay = String(shiftDate.getDate()).padStart(2, '0')
        const shiftDateStr = `${shiftYear}-${shiftMonth}-${shiftDay}`

        const startHour = parseInt(shift.startTime.split(":")[0])
        const startMinute = parseInt(shift.startTime.split(":")[1])
        const endHour = parseInt(shift.endTime.split(":")[0])
        const endMinute = parseInt(shift.endTime.split(":")[1])
        const startTimeMinutes = startHour * 60 + startMinute
        const endTimeMinutes = endHour * 60 + endMinute

        const isOvernightShift = endTimeMinutes < startTimeMinutes

        if (isOvernightShift) {
          // Shift spans midnight
          if (shiftDateStr === medDateStr && medTimeMinutes >= startTimeMinutes) {
            return true
          }
          const nextDay = new Date(shift.date)
          nextDay.setDate(nextDay.getDate() + 1)
          const nextYear = nextDay.getFullYear()
          const nextMonth = String(nextDay.getMonth() + 1).padStart(2, '0')
          const nextDayNum = String(nextDay.getDate()).padStart(2, '0')
          const nextDayStr = `${nextYear}-${nextMonth}-${nextDayNum}`
          if (nextDayStr === medDateStr && medTimeMinutes <= endTimeMinutes) {
            return true
          }
        } else {
          // Normal shift (same day)
          if (
            shiftDateStr === medDateStr &&
            medTimeMinutes >= startTimeMinutes &&
            medTimeMinutes <= endTimeMinutes
          ) {
            return true
          }
        }
      }
      return false
    }

    if (!checkTimeWithinShifts()) {
      return NextResponse.json(
        { error: "Deze medicatie valt buiten uw dienst" },
        { status: 403 }
      )
    }

    // Check if this administration already exists (prevent duplicates)
    const existingAdministration = await prisma.medicationAdministration.findFirst({
      where: {
        medicationId,
        caregiverId: user.caregiverProfile.id,
        scheduledTime: new Date(scheduledTime),
      },
    })

    if (existingAdministration) {
      return NextResponse.json(
        { error: "Deze medicatie is al geregistreerd voor dit tijdstip" },
        { status: 400 }
      )
    }

    // Create administration record
    const administration = await prisma.medicationAdministration.create({
      data: {
        medicationId,
        clientId: medication.clientId,
        caregiverId: user.caregiverProfile.id,
        scheduledTime: new Date(scheduledTime),
        dosageGiven: dosageGiven || medication.dosage,
        notes,
        wasGiven: wasGiven !== undefined ? wasGiven : true,
        skipReason: wasGiven === false ? skipReason : null,
      },
      include: {
        medication: true,
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

    return NextResponse.json(administration)
  } catch (error) {
    console.error("Administer medication error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// GET - Fetch medication administrations
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
    const medicationId = searchParams.get("medicationId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

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

    // Build where clause based on user role
    const whereClause: {
      medicationId?: string
      scheduledTime?: {
        gte?: Date
        lte?: Date
      }
      clientId?: string
    } = {}

    if (medicationId) {
      whereClause.medicationId = medicationId
    }

    if (startDate || endDate) {
      whereClause.scheduledTime = {}
      if (startDate) whereClause.scheduledTime.gte = new Date(startDate)
      if (endDate) whereClause.scheduledTime.lte = new Date(endDate)
    }

    if (user.role === "CLIENT") {
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }
      whereClause.clientId = user.clientProfile.id
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

      whereClause.clientId = clientId
    } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      if (clientId) {
        whereClause.clientId = clientId
      }
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const administrations = await prisma.medicationAdministration.findMany({
      where: whereClause,
      include: {
        medication: true,
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
      orderBy: { scheduledTime: "desc" },
    })

    return NextResponse.json(administrations)
  } catch (error) {
    console.error("Fetch administrations error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
