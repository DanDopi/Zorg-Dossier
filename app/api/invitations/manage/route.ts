import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getCaregiverInvitationEmailHtml } from "@/lib/email"

// POST /api/invitations/manage - Resend or delete an invitation
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    // Only clients can manage invitations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen uitnodigingen beheren" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { invitationId, action } = body

    if (!invitationId || !action || !["resend", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "Ongeldige parameters" },
        { status: 400 }
      )
    }

    // Find the invitation
    const invitation = await prisma.caregiverInvitation.findUnique({
      where: { id: invitationId },
      include: {
        caregiver: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Uitnodiging niet gevonden" },
        { status: 404 }
      )
    }

    // Verify it belongs to this client
    if (invitation.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "Deze uitnodiging behoort niet tot u" },
        { status: 403 }
      )
    }

    if (action === "delete") {
      // Delete the invitation
      await prisma.caregiverInvitation.delete({
        where: { id: invitationId },
      })

      return NextResponse.json(
        { message: "Uitnodiging verwijderd" },
        { status: 200 }
      )
    }

    if (action === "resend") {
      // Can only resend declined invitations
      if (invitation.status !== "DECLINED") {
        return NextResponse.json(
          { error: "Kan alleen afgewezen uitnodigingen opnieuw verzenden" },
          { status: 400 }
        )
      }

      // Update status back to PENDING
      await prisma.caregiverInvitation.update({
        where: { id: invitationId },
        data: {
          status: "PENDING",
          respondedAt: null,
          updatedAt: new Date(),
        },
      })

      // Send email notification
      if (invitation.caregiver) {
        const isRegistered = !!invitation.caregiver.user.emailVerified

        await sendEmail({
          to: invitation.caregiver.user.email,
          subject: `${user.clientProfile.name} heeft u opnieuw uitgenodigd - Zorgdossier`,
          html: getCaregiverInvitationEmailHtml(
            user.clientProfile.name,
            invitation.caregiver.name,
            invitation.caregiver.user.email,
            isRegistered,
            invitation.invitationToken
          ),
        })
      } else if (invitation.invitedEmail) {
        // Email-based invitation
        await sendEmail({
          to: invitation.invitedEmail,
          subject: `${user.clientProfile.name} heeft u opnieuw uitgenodigd - Zorgdossier`,
          html: getCaregiverInvitationEmailHtml(
            user.clientProfile.name,
            invitation.invitedEmail,
            invitation.invitedEmail,
            false,
            invitation.invitationToken
          ),
        })
      }

      return NextResponse.json(
        { message: "Uitnodiging opnieuw verzonden" },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: "Ongeldige actie" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Manage invitation error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
