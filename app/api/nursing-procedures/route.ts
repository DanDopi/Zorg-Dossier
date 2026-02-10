import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch nursing procedures for a client
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: { clientRelationships: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    let targetClientId = clientId

    if (user.role === "CLIENT") {
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }
      targetClientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }
      const hasRelationship = user.caregiverProfile?.clientRelationships.some(
        (rel) => rel.clientId === clientId && rel.status === "ACTIVE"
      )
      if (!hasRelationship) {
        return NextResponse.json({ error: "Geen toegang tot deze cliënt" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const procedures = await prisma.nursingProcedure.findMany({
      where: {
        clientId: targetClientId!,
        isActive: true,
      },
      include: {
        assignedCaregiver: {
          select: { id: true, name: true, color: true },
        },
        logs: {
          orderBy: { performedAt: "desc" },
          take: 1,
          include: {
            caregiver: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { nextDueDate: "asc" },
    })

    return NextResponse.json(procedures)
  } catch (error) {
    console.error("Error fetching nursing procedures:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// POST - Create a new nursing procedure
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json({ error: "Alleen cliënten kunnen handelingen aanmaken" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, frequencyDays, nextDueDate, assignedCaregiverId } = body

    if (!name || !frequencyDays || !nextDueDate) {
      return NextResponse.json({ error: "Naam, frequentie en eerste datum zijn verplicht" }, { status: 400 })
    }

    const procedure = await prisma.nursingProcedure.create({
      data: {
        clientId: user.clientProfile.id,
        name,
        description: description || null,
        frequencyDays: parseInt(frequencyDays),
        nextDueDate: new Date(nextDueDate),
        assignedCaregiverId: assignedCaregiverId || null,
        createdBy: user.id,
      },
      include: {
        assignedCaregiver: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    return NextResponse.json(procedure)
  } catch (error) {
    console.error("Error creating nursing procedure:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// PUT - Update a nursing procedure
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json({ error: "Alleen cliënten kunnen handelingen bewerken" }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, description, frequencyDays, nextDueDate, assignedCaregiverId, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.nursingProcedure.findFirst({
      where: { id, clientId: user.clientProfile.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Handeling niet gevonden" }, { status: 404 })
    }

    const procedure = await prisma.nursingProcedure.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(frequencyDays !== undefined && { frequencyDays: parseInt(frequencyDays) }),
        ...(nextDueDate !== undefined && { nextDueDate: new Date(nextDueDate) }),
        ...(assignedCaregiverId !== undefined && { assignedCaregiverId: assignedCaregiverId || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        assignedCaregiver: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    return NextResponse.json(procedure)
  } catch (error) {
    console.error("Error updating nursing procedure:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// DELETE - Soft-delete a nursing procedure (set isActive to false)
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json({ error: "Alleen cliënten kunnen handelingen verwijderen" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is verplicht" }, { status: 400 })
    }

    const existing = await prisma.nursingProcedure.findFirst({
      where: { id, clientId: user.clientProfile.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Handeling niet gevonden" }, { status: 404 })
    }

    await prisma.nursingProcedure.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting nursing procedure:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
