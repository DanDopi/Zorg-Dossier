import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/voeding/tube-feeding/schedule - Fetch tube feeding schedules for a client
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

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is verplicht" },
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

    // Fetch schedules
    const schedules = await prisma.tubeFeedingSchedule.findMany({
      where: {
        clientId,
      },
      orderBy: {
        feedingTime: "asc",
      },
    })

    return NextResponse.json({ schedules }, { status: 200 })
  } catch (error) {
    console.error("Get tube feeding schedules error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST /api/voeding/tube-feeding/schedule - Create a new tube feeding schedule
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
    const { clientId, feedingTime, volume, feedSpeed, feedType, recurrenceType, daysOfWeek, startDate, endDate } = body

    if (!clientId || !feedingTime || !volume || !feedSpeed) {
      return NextResponse.json(
        { error: "Verplichte velden ontbreken" },
        { status: 400 }
      )
    }

    // Validate recurrence type specific fields
    if ((recurrenceType === "weekly" || recurrenceType === "specific_days") && (!daysOfWeek || daysOfWeek.length === 0)) {
      return NextResponse.json(
        { error: "Selecteer tenminste één dag voor dit herhalingstype" },
        { status: 400 }
      )
    }

    // Only clients can create their own schedules (or admins)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    const isOwnClient = user.role === "CLIENT" && user.clientProfile?.id === clientId
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

    if (!isOwnClient && !isAdmin) {
      return NextResponse.json(
        { error: "Alleen de cliënt kan zijn eigen schema's beheren" },
        { status: 403 }
      )
    }

    // Create schedule
    const schedule = await prisma.tubeFeedingSchedule.create({
      data: {
        clientId,
        feedingTime,
        volume: parseInt(volume),
        feedSpeed: parseInt(feedSpeed),
        feedType: feedType || null,
        recurrenceType: recurrenceType || "daily",
        daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? JSON.stringify(daysOfWeek) : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    console.error("Create tube feeding schedule error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
