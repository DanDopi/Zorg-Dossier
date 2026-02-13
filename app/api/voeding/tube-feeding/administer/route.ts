import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/voeding/tube-feeding/administer - Record tube feeding administration
export async function POST(request: NextRequest) {
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
      scheduleId,
      clientId,
      scheduledTime,
      volumeGiven,
      speedUsed,
      wasGiven,
      skipReason,
      notes,
    } = body

    if (!scheduleId || !clientId || !scheduledTime) {
      return NextResponse.json(
        { error: "Verplichte velden ontbreken" },
        { status: 400 }
      )
    }

    if (!wasGiven && !skipReason) {
      return NextResponse.json(
        { error: "Reden voor overslaan is verplicht" },
        { status: 400 }
      )
    }

    // Only caregivers can administer feeding
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
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

    if (!user || user.role !== "CAREGIVER" || !user.caregiverProfile) {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen voeding toedienen" },
        { status: 403 }
      )
    }

    if (user.caregiverProfile.clientRelationships.length === 0) {
      return NextResponse.json(
        { error: "Geen toegang tot deze cliënt" },
        { status: 403 }
      )
    }

    // Check: no future date registration
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const scheduledDate = new Date(scheduledTime)
    const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate())

    if (scheduledDateOnly > today) {
      return NextResponse.json(
        { error: "Registratie voor toekomstige dagen is niet toegestaan" },
        { status: 400 }
      )
    }

    // Check: caregiver must have a shift on this date for this client
    const startOfRecordDay = new Date(scheduledDateOnly)
    const endOfRecordDay = new Date(scheduledDateOnly)
    endOfRecordDay.setHours(23, 59, 59, 999)

    const shiftCount = await prisma.shift.count({
      where: {
        caregiverId: user.caregiverProfile.id,
        clientId,
        date: { gte: startOfRecordDay, lte: endOfRecordDay },
        status: { in: ["FILLED", "COMPLETED"] },
      },
    })

    if (shiftCount === 0) {
      return NextResponse.json(
        { error: "U heeft geen dienst op deze dag voor deze cliënt" },
        { status: 403 }
      )
    }

    // Verify schedule exists
    const schedule = await prisma.tubeFeedingSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      return NextResponse.json(
        { error: "Schema niet gevonden" },
        { status: 404 }
      )
    }

    // Check if already administered
    const existingAdministration = await prisma.tubeFeedingAdministration.findFirst({
      where: {
        scheduleId,
        scheduledTime: new Date(scheduledTime),
      },
    })

    if (existingAdministration) {
      return NextResponse.json(
        { error: "Deze voeding is al geregistreerd" },
        { status: 400 }
      )
    }

    // Create administration record
    const administration = await prisma.tubeFeedingAdministration.create({
      data: {
        scheduleId,
        clientId,
        caregiverId: user.caregiverProfile.id,
        scheduledTime: new Date(scheduledTime),
        volumeGiven: wasGiven ? parseInt(volumeGiven) : 0,
        speedUsed: wasGiven ? parseInt(speedUsed) : 0,
        wasGiven,
        skipReason: wasGiven ? null : skipReason,
        notes: notes || null,
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

    return NextResponse.json({ administration }, { status: 201 })
  } catch (error) {
    console.error("Administer tube feeding error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
