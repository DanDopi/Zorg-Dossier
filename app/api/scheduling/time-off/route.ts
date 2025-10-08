import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/scheduling/time-off - Get time-off requests
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

    const where: {
      clientId?: string
      caregiverId?: string
    } = {}

    if (user.role === "CLIENT" && user.clientProfile) {
      where.clientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER" && user.caregiverProfile) {
      where.caregiverId = user.caregiverProfile.id
    } else if (clientId) {
      where.clientId = clientId
    } else if (caregiverId) {
      where.caregiverId = caregiverId
    }

    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where,
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(timeOffRequests)
  } catch (error) {
    console.error("Error fetching time-off requests:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van verlofaanvragen" },
      { status: 500 }
    )
  }
}

// POST /api/scheduling/time-off - Create a new time-off request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
      },
    })

    if (!user?.caregiverProfile || user.role !== "CAREGIVER") {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen verlof aanvragen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientId, requestType, startDate, endDate, reason, isEmergency } = body

    if (!clientId || !requestType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Client, type, start- en einddatum zijn verplicht" },
        { status: 400 }
      )
    }

    // Verify active relationship
    const relationship = await prisma.caregiverClientRelationship.findFirst({
      where: {
        caregiverId: user.caregiverProfile.id,
        clientId,
        status: "ACTIVE",
      },
    })

    if (!relationship) {
      return NextResponse.json(
        { error: "Geen actieve relatie met deze client" },
        { status: 400 }
      )
    }

    // Get client info for notification
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        caregiverId: user.caregiverProfile.id,
        clientId,
        requestType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        isEmergency: isEmergency || false,
        status: isEmergency && requestType === "SICK_LEAVE" ? "APPROVED" : "PENDING",
      },
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Send notification for sick leave
    if (requestType === "SICK_LEAVE" && isEmergency) {
      // TODO: Send email and in-app notification to client
      // For now, we'll just log it
      console.log(`URGENT: ${user.caregiverProfile.name} heeft zich ziek gemeld bij ${client?.name}`)
    }

    return NextResponse.json(timeOffRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating time-off request:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de verlofaanvraag" },
      { status: 500 }
    )
  }
}

// PUT /api/scheduling/time-off - Update a time-off request (approve/deny)
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
        { error: "Alleen clients kunnen verlofaanvragen goedkeuren" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID en status zijn verplicht" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingRequest = await prisma.timeOffRequest.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Verlofaanvraag niet gevonden" },
        { status: 404 }
      )
    }

    if (existingRequest.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze aanvraag" },
        { status: 403 }
      )
    }

    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: { status },
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error("Error updating time-off request:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de verlofaanvraag" },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduling/time-off?id=xxx - Delete a time-off request
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
      },
    })

    if (!user?.caregiverProfile || user.role !== "CAREGIVER") {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen hun aanvragen verwijderen" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Aanvraag ID is verplicht" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingRequest = await prisma.timeOffRequest.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Verlofaanvraag niet gevonden" },
        { status: 404 }
      )
    }

    if (existingRequest.caregiverId !== user.caregiverProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze aanvraag" },
        { status: 403 }
      )
    }

    // Can't delete approved requests
    if (existingRequest.status === "APPROVED") {
      return NextResponse.json(
        { error: "Goedgekeurde aanvragen kunnen niet worden verwijderd" },
        { status: 400 }
      )
    }

    await prisma.timeOffRequest.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Verlofaanvraag succesvol verwijderd" })
  } catch (error) {
    console.error("Error deleting time-off request:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwijderen van de verlofaanvraag" },
      { status: 500 }
    )
  }
}
