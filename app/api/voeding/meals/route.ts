import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/voeding/meals - Fetch meal records for a client on a specific date
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
      (user.role === "CAREGIVER" && (user.caregiverProfile?.clientRelationships.length ?? 0) > 0) ||
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN"

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Geen toegang tot deze cliënt" },
        { status: 403 }
      )
    }

    // Parse date
    const recordDate = new Date(date)
    const startOfDay = new Date(recordDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(recordDate.setHours(23, 59, 59, 999))

    // Fetch meal records
    const meals = await prisma.mealRecord.findMany({
      where: {
        clientId,
        recordDate: {
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
      orderBy: {
        recordTime: "asc",
      },
    })

    return NextResponse.json({ meals }, { status: 200 })
  } catch (error) {
    console.error("Get meals error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST /api/voeding/meals - Create a new meal record
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
    const { clientId, recordDate, recordTime, mealType, description, amount, notes } = body

    if (!clientId || !recordDate || !recordTime || !mealType || !description) {
      return NextResponse.json(
        { error: "Verplichte velden ontbreken" },
        { status: 400 }
      )
    }

    // Only caregivers can create meal records
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
        { error: "Alleen zorgverleners kunnen maaltijden registreren" },
        { status: 403 }
      )
    }

    if (user.caregiverProfile.clientRelationships.length === 0) {
      return NextResponse.json(
        { error: "Geen toegang tot deze cliënt" },
        { status: 403 }
      )
    }

    // Create meal record
    const parsedDate = new Date(recordDate)
    const [hours, minutes] = recordTime.split(":")
    const parsedTime = new Date(parsedDate)
    parsedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    const meal = await prisma.mealRecord.create({
      data: {
        clientId,
        caregiverId: user.caregiverProfile.id,
        recordDate: parsedDate,
        recordTime: parsedTime,
        mealType,
        description,
        amount: amount || null,
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

    return NextResponse.json({ meal }, { status: 201 })
  } catch (error) {
    console.error("Create meal error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
