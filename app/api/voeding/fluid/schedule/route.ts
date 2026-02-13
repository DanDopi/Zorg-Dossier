import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/voeding/fluid/schedule - Fetch fluid intake schedules for a client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const clientId = request.nextUrl.searchParams.get("clientId")
    if (!clientId) {
      return NextResponse.json({ error: "Client ID is verplicht" }, { status: 400 })
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

    const schedules = await prisma.fluidIntakeSchedule.findMany({
      where: { clientId },
      orderBy: { intakeTime: "asc" },
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Get fluid intake schedules error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// POST /api/voeding/fluid/schedule - Create a new fluid intake schedule
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, intakeTime, volume, fluidType, recurrenceType, daysOfWeek, startDate, endDate } = body

    if (!clientId || !intakeTime || !volume) {
      return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 })
    }

    if ((recurrenceType === "weekly" || recurrenceType === "specific_days") && (!daysOfWeek || daysOfWeek.length === 0)) {
      return NextResponse.json({ error: "Selecteer tenminste één dag" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    const isOwnClient = user.role === "CLIENT" && user.clientProfile?.id === clientId
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

    if (!isOwnClient && !isAdmin) {
      return NextResponse.json({ error: "Alleen de cliënt kan schema's beheren" }, { status: 403 })
    }

    const schedule = await prisma.fluidIntakeSchedule.create({
      data: {
        clientId,
        intakeTime,
        volume: parseInt(String(volume)),
        fluidType: fluidType || null,
        recurrenceType: recurrenceType || "daily",
        daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? JSON.stringify(daysOfWeek) : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    console.error("Create fluid intake schedule error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
