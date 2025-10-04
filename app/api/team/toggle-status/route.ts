import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    // Only clients can toggle caregiver status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen de status wijzigen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { relationshipId, status } = body

    if (!relationshipId || !status || !["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        { error: "Ongeldige parameters" },
        { status: 400 }
      )
    }

    // Find relationship
    const relationship = await prisma.caregiverClientRelationship.findUnique({
      where: { id: relationshipId },
    })

    if (!relationship) {
      return NextResponse.json(
        { error: "Relatie niet gevonden" },
        { status: 404 }
      )
    }

    // Verify relationship belongs to this client
    if (relationship.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "Deze relatie behoort niet tot u" },
        { status: 403 }
      )
    }

    // Update status
    await prisma.caregiverClientRelationship.update({
      where: { id: relationshipId },
      data: {
        status,
        deactivatedAt: status === "INACTIVE" ? new Date() : null,
      },
    })

    return NextResponse.json(
      { message: status === "INACTIVE" ? "Zorgverlener gedeactiveerd" : "Zorgverlener geactiveerd" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Toggle status error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
