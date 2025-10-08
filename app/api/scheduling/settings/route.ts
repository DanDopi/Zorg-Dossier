import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/scheduling/settings - Get scheduling settings for a client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user?.clientProfile || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Alleen clients kunnen instellingen ophalen" },
        { status: 403 }
      )
    }

    let settings = await prisma.schedulingSettings.findUnique({
      where: { clientId: user.clientProfile.id },
    })

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.schedulingSettings.create({
        data: {
          clientId: user.clientProfile.id,
          weeksAhead: 8, // Default: generate 8 weeks ahead
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching scheduling settings:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de instellingen" },
      { status: 500 }
    )
  }
}

// PUT /api/scheduling/settings - Update scheduling settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user?.clientProfile || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Alleen clients kunnen instellingen bijwerken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { weeksAhead } = body

    if (weeksAhead !== undefined) {
      if (typeof weeksAhead !== "number" || weeksAhead < 1 || weeksAhead > 52) {
        return NextResponse.json(
          { error: "Weken vooruit moet tussen 1 en 52 zijn" },
          { status: 400 }
        )
      }
    }

    const settings = await prisma.schedulingSettings.upsert({
      where: { clientId: user.clientProfile.id },
      update: {
        ...(weeksAhead !== undefined && { weeksAhead }),
      },
      create: {
        clientId: user.clientProfile.id,
        weeksAhead: weeksAhead || 8,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error updating scheduling settings:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de instellingen" },
      { status: 500 }
    )
  }
}
