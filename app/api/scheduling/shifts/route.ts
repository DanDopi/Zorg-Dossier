import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/scheduling/shifts - Get shifts for a date range
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

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const caregiverId = searchParams.get("caregiverId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start- en einddatum zijn verplicht" },
        { status: 400 }
      )
    }

    // Build where clause based on user role
    const where: {
      date: { gte: Date; lte: Date }
      clientId?: string
      caregiverId?: string
    } = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }

    if (user.role === "CLIENT" && user.clientProfile) {
      where.clientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER" && caregiverId) {
      where.caregiverId = caregiverId
    } else if (clientId) {
      where.clientId = clientId
    } else {
      return NextResponse.json({ error: "Client ID vereist" }, { status: 400 })
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        shiftType: true,
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error("Error fetching shifts:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de diensten" },
      { status: 500 }
    )
  }
}

// POST /api/scheduling/shifts - Create a new shift
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
        { error: "Alleen clients kunnen diensten aanmaken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      shiftTypeId,
      date,
      startTime,
      endTime,
      caregiverId,
      internalNotes,
      instructionNotes,
    } = body

    if (!shiftTypeId || !date) {
      return NextResponse.json(
        { error: "Diensttype en datum zijn verplicht" },
        { status: 400 }
      )
    }

    // Verify shift type belongs to this client
    const shiftType = await prisma.shiftType.findUnique({
      where: { id: shiftTypeId },
    })

    if (!shiftType || shiftType.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "Ongeldig diensttype" },
        { status: 400 }
      )
    }

    // If caregiver specified, verify relationship
    if (caregiverId) {
      const relationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId,
          clientId: user.clientProfile.id,
          status: "ACTIVE",
        },
      })

      if (!relationship) {
        return NextResponse.json(
          { error: "Deze zorgverlener heeft geen actieve relatie met u" },
          { status: 400 }
        )
      }
    }

    // Use shift type times as default
    const finalStartTime = startTime || shiftType.startTime
    const finalEndTime = endTime || shiftType.endTime

    const shift = await prisma.shift.create({
      data: {
        clientId: user.clientProfile.id,
        shiftTypeId,
        date: new Date(date),
        startTime: finalStartTime,
        endTime: finalEndTime,
        caregiverId: caregiverId || null,
        status: caregiverId ? "FILLED" : "UNFILLED",
        internalNotes,
        instructionNotes,
        createdBy: session.user.id,
      },
      include: {
        shiftType: true,
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

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error("Error creating shift:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de dienst" },
      { status: 500 }
    )
  }
}

// PUT /api/scheduling/shifts - Update a shift
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
        { error: "Alleen clients kunnen diensten bijwerken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      id,
      caregiverId,
      startTime,
      endTime,
      internalNotes,
      instructionNotes,
      status,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingShift = await prisma.shift.findUnique({
      where: { id },
    })

    if (!existingShift) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 })
    }

    if (existingShift.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze dienst" },
        { status: 403 }
      )
    }

    // Check if shift is completed (locked)
    if (existingShift.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Voltooide diensten kunnen niet worden gewijzigd" },
        { status: 400 }
      )
    }

    // If caregiver is being assigned, verify relationship
    if (caregiverId !== undefined && caregiverId !== null) {
      const relationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId,
          clientId: user.clientProfile.id,
          status: "ACTIVE",
        },
      })

      if (!relationship) {
        return NextResponse.json(
          { error: "Deze zorgverlener heeft geen actieve relatie met u" },
          { status: 400 }
        )
      }
    }

    // Determine new status
    let newStatus = status
    if (!newStatus) {
      if (caregiverId === null) {
        newStatus = "UNFILLED"
      } else if (caregiverId && existingShift.caregiverId === null) {
        newStatus = "FILLED"
      }
    }

    // If caregiverId is being changed and there's a patternId, mark as override
    const isPatternOverride =
      existingShift.patternId &&
      caregiverId !== undefined &&
      caregiverId !== existingShift.caregiverId

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        ...(caregiverId !== undefined && { caregiverId }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(internalNotes !== undefined && { internalNotes }),
        ...(instructionNotes !== undefined && { instructionNotes }),
        ...(newStatus && { status: newStatus }),
        ...(isPatternOverride && { isPatternOverride: true }),
      },
      include: {
        shiftType: true,
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

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error("Error updating shift:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de dienst" },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduling/shifts?id=xxx - Delete a shift
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
        { error: "Alleen clients kunnen diensten verwijderen" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingShift = await prisma.shift.findUnique({
      where: { id },
    })

    if (!existingShift) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 })
    }

    if (existingShift.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze dienst" },
        { status: 403 }
      )
    }

    // Check if shift is completed
    if (existingShift.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Voltooide diensten kunnen niet worden verwijderd" },
        { status: 400 }
      )
    }

    await prisma.shift.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Dienst succesvol verwijderd" })
  } catch (error) {
    console.error("Error deleting shift:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwijderen van de dienst" },
      { status: 500 }
    )
  }
}
