import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/scheduling/shift-types - Get all shift types for a client
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
        caregiverProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Get clientId from query params or use logged-in client
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    let targetClientId: string | null = null

    if (user.role === "CLIENT" && user.clientProfile) {
      targetClientId = user.clientProfile.id
    } else if (clientId) {
      // Caregivers or admins can view shift types for specific client
      targetClientId = clientId
    } else {
      return NextResponse.json({ error: "Client ID vereist" }, { status: 400 })
    }

    const shiftTypes = await prisma.shiftType.findMany({
      where: {
        clientId: targetClientId,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json(shiftTypes)
  } catch (error) {
    console.error("Error fetching shift types:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de diensttypes" },
      { status: 500 }
    )
  }
}

// POST /api/scheduling/shift-types - Create a new shift type
export async function POST(request: NextRequest) {
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
        { error: "Alleen clients kunnen diensttypes aanmaken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, startTime, endTime, color } = body

    if (!name || !startTime || !endTime || !color) {
      return NextResponse.json(
        { error: "Naam, starttijd, eindtijd en kleur zijn verplicht" },
        { status: 400 }
      )
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Ongeldige tijdnotatie. Gebruik HH:mm formaat" },
        { status: 400 }
      )
    }

    // Validate color format (hex)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!colorRegex.test(color)) {
      return NextResponse.json(
        { error: "Ongeldige kleurcode. Gebruik hex formaat (#RRGGBB)" },
        { status: 400 }
      )
    }

    const shiftType = await prisma.shiftType.create({
      data: {
        clientId: user.clientProfile.id,
        name,
        startTime,
        endTime,
        color,
      },
    })

    return NextResponse.json(shiftType, { status: 201 })
  } catch (error) {
    console.error("Error creating shift type:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van het diensttype" },
      { status: 500 }
    )
  }
}

// PUT /api/scheduling/shift-types - Update a shift type
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
        { error: "Alleen clients kunnen diensttypes bijwerken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, startTime, endTime, color } = body

    if (!id) {
      return NextResponse.json({ error: "Shift type ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingShiftType = await prisma.shiftType.findUnique({
      where: { id },
    })

    if (!existingShiftType) {
      return NextResponse.json({ error: "Diensttype niet gevonden" }, { status: 404 })
    }

    if (existingShiftType.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot dit diensttype" },
        { status: 403 }
      )
    }

    // Validate inputs if provided
    if (startTime || endTime) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
      if ((startTime && !timeRegex.test(startTime)) || (endTime && !timeRegex.test(endTime))) {
        return NextResponse.json(
          { error: "Ongeldige tijdnotatie. Gebruik HH:mm formaat" },
          { status: 400 }
        )
      }
    }

    if (color) {
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      if (!colorRegex.test(color)) {
        return NextResponse.json(
          { error: "Ongeldige kleurcode. Gebruik hex formaat (#RRGGBB)" },
          { status: 400 }
        )
      }
    }

    const updatedShiftType = await prisma.shiftType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(color && { color }),
      },
    })

    return NextResponse.json(updatedShiftType)
  } catch (error) {
    console.error("Error updating shift type:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van het diensttype" },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduling/shift-types?id=xxx - Delete a shift type
export async function DELETE(request: NextRequest) {
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
        { error: "Alleen clients kunnen diensttypes verwijderen" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Shift type ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingShiftType = await prisma.shiftType.findUnique({
      where: { id },
      include: {
        shifts: true,
        shiftPatterns: true,
      },
    })

    if (!existingShiftType) {
      return NextResponse.json({ error: "Diensttype niet gevonden" }, { status: 404 })
    }

    if (existingShiftType.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot dit diensttype" },
        { status: 403 }
      )
    }

    // Check if shift type is in use
    if (existingShiftType.shifts.length > 0 || existingShiftType.shiftPatterns.length > 0) {
      return NextResponse.json(
        {
          error:
            "Dit diensttype kan niet worden verwijderd omdat het gebruikt wordt in diensten of patronen",
        },
        { status: 400 }
      )
    }

    await prisma.shiftType.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Diensttype succesvol verwijderd" })
  } catch (error) {
    console.error("Error deleting shift type:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwijderen van het diensttype" },
      { status: 500 }
    )
  }
}
