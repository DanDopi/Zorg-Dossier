import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch all settings or by category
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Alleen administrators kunnen instellingen bekijken" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const settings = await prisma.systemSettings.findMany({
      where: category ? { category } : undefined,
      orderBy: { key: "asc" },
    })

    // Convert array to key-value object for easier frontend consumption
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json(settingsObject)
  } catch (error) {
    console.error("Fetch settings error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST - Save/update settings
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Alleen administrators kunnen instellingen wijzigen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { category, settings } = body

    if (!category || !settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Ongeldige data" },
        { status: 400 }
      )
    }

    // Update or create each setting
    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.systemSettings.upsert({
        where: { key },
        create: {
          key,
          value: String(value),
          category,
          updatedBy: user.id,
        },
        update: {
          value: String(value),
          category,
          updatedBy: user.id,
        },
      })
    )

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save settings error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
