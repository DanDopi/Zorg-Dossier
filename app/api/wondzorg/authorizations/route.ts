import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch wound care authorizations
// Client: returns authorizedCaregivers[] + availableCaregivers[]
// Caregiver: returns { isAuthorized: boolean }
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
          include: {
            clientRelationships: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    if (user.role === "CLIENT") {
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }

      const targetClientId = user.clientProfile.id

      // Get authorized caregivers
      const authorizedCaregivers = await prisma.woundCareAuthorization.findMany({
        where: { clientId: targetClientId },
        include: {
          caregiver: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { createdAt: "asc" },
      })

      // Get available caregivers (active relationship, not yet authorized)
      const authorizedIds = authorizedCaregivers.map((a) => a.caregiverId)
      const activeRelationships = await prisma.caregiverClientRelationship.findMany({
        where: {
          clientId: targetClientId,
          status: "ACTIVE",
          caregiverId: { notIn: authorizedIds },
        },
        include: {
          caregiver: {
            select: { id: true, name: true, color: true },
          },
        },
      })

      return NextResponse.json({
        authorizedCaregivers: authorizedCaregivers.map((a) => ({
          id: a.id,
          caregiverId: a.caregiver.id,
          name: a.caregiver.name,
          color: a.caregiver.color,
          createdAt: a.createdAt,
        })),
        availableCaregivers: activeRelationships.map((r) => ({
          caregiverId: r.caregiver.id,
          name: r.caregiver.name,
          color: r.caregiver.color,
        })),
      })
    } else if (user.role === "CAREGIVER") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }

      if (!user.caregiverProfile) {
        return NextResponse.json({ error: "Geen zorgverlener profiel" }, { status: 403 })
      }

      // Check if this caregiver is authorized for this client's wound care
      const authorization = await prisma.woundCareAuthorization.findUnique({
        where: {
          clientId_caregiverId: {
            clientId,
            caregiverId: user.caregiverProfile.id,
          },
        },
      })

      return NextResponse.json({ isAuthorized: !!authorization })
    } else {
      // Admin/Super Admin - always authorized
      return NextResponse.json({ isAuthorized: true })
    }
  } catch (error) {
    console.error("Fetch wound care authorizations error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// POST - Client adds a caregiver authorization
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const body = await request.json()
    const { caregiverId } = body

    if (!caregiverId) {
      return NextResponse.json({ error: "caregiverId vereist" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json({ error: "Alleen cliënten kunnen machtigingen beheren" }, { status: 403 })
    }

    const targetClientId = user.clientProfile.id

    // Verify caregiver has active relationship with client
    const relationship = await prisma.caregiverClientRelationship.findFirst({
      where: {
        clientId: targetClientId,
        caregiverId,
        status: "ACTIVE",
      },
    })

    if (!relationship) {
      return NextResponse.json(
        { error: "Deze zorgverlener heeft geen actieve relatie met u" },
        { status: 400 }
      )
    }

    // Create authorization (upsert to prevent duplicates)
    const authorization = await prisma.woundCareAuthorization.create({
      data: {
        clientId: targetClientId,
        caregiverId,
      },
      include: {
        caregiver: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    return NextResponse.json({
      id: authorization.id,
      caregiverId: authorization.caregiver.id,
      name: authorization.caregiver.name,
      color: authorization.caregiver.color,
      createdAt: authorization.createdAt,
    })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Deze zorgverlener is al gemachtigd" }, { status: 409 })
    }
    console.error("Create wound care authorization error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// DELETE - Client removes a caregiver authorization
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const caregiverId = searchParams.get("caregiverId")

    if (!caregiverId) {
      return NextResponse.json({ error: "caregiverId vereist" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json({ error: "Alleen cliënten kunnen machtigingen beheren" }, { status: 403 })
    }

    const targetClientId = user.clientProfile.id

    await prisma.woundCareAuthorization.delete({
      where: {
        clientId_caregiverId: {
          clientId: targetClientId,
          caregiverId,
        },
      },
    })

    return NextResponse.json({ message: "Machtiging verwijderd" })
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Machtiging niet gevonden" }, { status: 404 })
    }
    console.error("Delete wound care authorization error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
