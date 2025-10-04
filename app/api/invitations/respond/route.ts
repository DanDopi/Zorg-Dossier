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

    // Only caregivers can respond to invitations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { caregiverProfile: true },
    })

    if (!user || user.role !== "CAREGIVER" || !user.caregiverProfile) {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen reageren op uitnodigingen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { invitationId, accept } = body

    if (!invitationId || typeof accept !== "boolean") {
      return NextResponse.json(
        { error: "Ongeldige parameters" },
        { status: 400 }
      )
    }

    // Find invitation
    const invitation = await prisma.caregiverInvitation.findUnique({
      where: { id: invitationId },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Uitnodiging niet gevonden" },
        { status: 404 }
      )
    }

    // Verify invitation belongs to this caregiver
    if (invitation.caregiverId !== user.caregiverProfile.id) {
      return NextResponse.json(
        { error: "Deze uitnodiging is niet voor u" },
        { status: 403 }
      )
    }

    // Check if already responded
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Deze uitnodiging is al verwerkt" },
        { status: 400 }
      )
    }

    if (accept) {
      // Accept: Update invitation and create relationship
      await prisma.$transaction(async (tx) => {
        // Update invitation status
        await tx.caregiverInvitation.update({
          where: { id: invitationId },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        })

        // Create caregiver-client relationship
        await tx.caregiverClientRelationship.create({
          data: {
            caregiverId: invitation.caregiverId,
            clientId: invitation.clientId,
            status: "ACTIVE",
          },
        })
      })

      return NextResponse.json(
        { message: "Uitnodiging geaccepteerd!" },
        { status: 200 }
      )
    } else {
      // Decline: Just update invitation status
      await prisma.caregiverInvitation.update({
        where: { id: invitationId },
        data: {
          status: "DECLINED",
          respondedAt: new Date(),
        },
      })

      return NextResponse.json(
        { message: "Uitnodiging afgewezen" },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error("Respond to invitation error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
