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
