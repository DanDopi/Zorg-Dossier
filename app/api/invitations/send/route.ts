import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getCaregiverInvitationEmailHtml } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    // Only clients can send invitations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen uitnodigingen verzenden" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { caregiverId, email } = body

    // Must provide either caregiverId OR email
    if (!caregiverId && !email) {
      return NextResponse.json(
        { error: "Zorgverlener ID of email is verplicht" },
        { status: 400 }
      )
    }

    // Handle email invitation (new user who doesn't have an account yet)
    if (email && !caregiverId) {
      // Validate email format
      if (!email.includes("@")) {
        return NextResponse.json(
          { error: "Ongeldig email adres" },
          { status: 400 }
        )
      }

      // Check if email already exists in users
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { caregiverProfile: true },
      })

      // If user exists with caregiver profile, use the normal flow
      if (existingUser?.caregiverProfile) {
        // Redirect to normal invitation flow by setting caregiverId
        return POST(
          new NextRequest(request.url, {
            method: "POST",
            headers: request.headers,
            body: JSON.stringify({ caregiverId: existingUser.caregiverProfile.id }),
          })
        )
      }

      // Check if already invited by email
      const existingEmailInvitation = await prisma.caregiverInvitation.findFirst({
        where: {
          clientId: user.clientProfile.id,
          invitedEmail: email,
        },
      })

      if (existingEmailInvitation && existingEmailInvitation.status === "PENDING") {
        return NextResponse.json(
          { error: "Er is al een openstaande uitnodiging voor dit email adres" },
          { status: 400 }
        )
      }

      // Create invitation with email only
      const invitation = await prisma.caregiverInvitation.create({
        data: {
          clientId: user.clientProfile.id,
          invitedEmail: email,
          status: "PENDING",
        },
      })

      // Send registration invitation email
      await sendEmail({
        to: email,
        subject: `${user.clientProfile.name} nodigt u uit als zorgverlener - Zorgdossier`,
        html: getCaregiverInvitationEmailHtml(
          user.clientProfile.name,
          email, // Use email as name since we don't know their name yet
          email,
          false, // Not registered yet
          invitation.invitationToken
        ),
      })

      return NextResponse.json(
        { message: "Uitnodiging verzonden naar nieuw email adres", invitation },
        { status: 201 }
      )
    }

    // Check if caregiver exists
    const caregiver = await prisma.caregiverProfile.findUnique({
      where: { id: caregiverId },
      include: {
        user: true,
      },
    })

    if (!caregiver) {
      return NextResponse.json(
        { error: "Zorgverlener niet gevonden" },
        { status: 404 }
      )
    }

    // Check if already invited
    const existingInvitation = await prisma.caregiverInvitation.findFirst({
      where: {
        clientId: user.clientProfile.id,
        caregiverId: caregiver.id,
      },
    })

    if (existingInvitation) {
      if (existingInvitation.status === "PENDING") {
        return NextResponse.json(
          { error: "Er is al een openstaande uitnodiging voor deze zorgverlener" },
          { status: 400 }
        )
      }

      // If previously declined, update to pending again
      if (existingInvitation.status === "DECLINED") {
        const updated = await prisma.caregiverInvitation.update({
          where: { id: existingInvitation.id },
          data: {
            status: "PENDING",
            updatedAt: new Date(),
            respondedAt: null,
          },
        })

        // Send email
        await sendEmail({
          to: caregiver.user.email,
          subject: `${user.clientProfile.name} heeft u opnieuw uitgenodigd - Zorgdossier`,
          html: getCaregiverInvitationEmailHtml(
            user.clientProfile.name,
            caregiver.name,
            caregiver.user.email,
            true,
            updated.invitationToken
          ),
        })

        return NextResponse.json(
          { message: "Uitnodiging opnieuw verzonden" },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { error: "Deze zorgverlener is al uitgenodigd of toegevoegd" },
        { status: 400 }
      )
    }

    // Check if already in relationship
    const existingRelationship = await prisma.caregiverClientRelationship.findUnique({
      where: {
        caregiverId_clientId: {
          caregiverId: caregiver.id,
          clientId: user.clientProfile.id,
        },
      },
    })

    if (existingRelationship) {
      return NextResponse.json(
        { error: "Deze zorgverlener is al onderdeel van uw team" },
        { status: 400 }
      )
    }

    // Create invitation
    const invitation = await prisma.caregiverInvitation.create({
      data: {
        clientId: user.clientProfile.id,
        caregiverId: caregiver.id,
        status: "PENDING",
      },
    })

    // Send invitation email
    const isRegistered = !!caregiver.user.emailVerified

    await sendEmail({
      to: caregiver.user.email,
      subject: `${user.clientProfile.name} heeft u uitgenodigd - Zorgdossier`,
      html: getCaregiverInvitationEmailHtml(
        user.clientProfile.name,
        caregiver.name,
        caregiver.user.email,
        isRegistered,
        invitation.invitationToken
      ),
    })

    return NextResponse.json(
      { message: "Uitnodiging verzonden", invitation },
      { status: 201 }
    )
  } catch (error) {
    console.error("Send invitation error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verzenden van de uitnodiging" },
      { status: 500 }
    )
  }
}
