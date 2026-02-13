import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST - Register ad-hoc/extra medication administration
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
      clientId,
      name,
      dosage,
      unit,
      time,
      date,
      notes,
    } = body

    if (!clientId || !name || !dosage || !unit || !time || !date) {
      return NextResponse.json(
        { error: "Verplichte velden ontbreken" },
        { status: 400 }
      )
    }

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
        { error: "Alleen zorgverleners kunnen extra medicatie registreren" },
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
    const [year, month, day] = date.split("-").map(Number)
    const recordDate = new Date(year, month - 1, day)

    if (recordDate > today) {
      return NextResponse.json(
        { error: "Registratie voor toekomstige dagen is niet toegestaan" },
        { status: 400 }
      )
    }

    // Check: caregiver must have a shift on this date for this client
    const startOfRecordDay = new Date(recordDate)
    const endOfRecordDay = new Date(recordDate)
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

    // Create an ad-hoc Medication record (isActive: false so it won't appear in daily schedules)
    const [hours, minutes] = time.split(":").map(Number)
    const scheduledTime = new Date(year, month - 1, day, hours, minutes, 0, 0)

    const medication = await prisma.medication.create({
      data: {
        clientId,
        name,
        dosage,
        unit,
        frequency: "extra",
        times: JSON.stringify([time]),
        isActive: false,
        startDate: recordDate,
        endDate: recordDate,
        createdBy: user.id,
      },
    })

    // Create the administration record
    const administration = await prisma.medicationAdministration.create({
      data: {
        medicationId: medication.id,
        clientId,
        caregiverId: user.caregiverProfile.id,
        scheduledTime: scheduledTime,
        dosageGiven: dosage,
        wasGiven: true,
        notes: notes || null,
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

    return NextResponse.json(administration, { status: 201 })
  } catch (error) {
    console.error("Administer extra medication error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
