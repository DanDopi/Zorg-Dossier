import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendEmail, getVerificationEmailHtml } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, phoneNumber, address, bio, invitationToken } = body

    // Validate required fields
    if (!email || !password || !name || !phoneNumber || !address) {
      return NextResponse.json(
        { error: "Alle verplichte velden moeten ingevuld zijn" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Dit email adres is al in gebruik" },
        { status: 400 }
      )
    }

    // If there's an invitation token, verify it exists and is pending
    if (invitationToken) {
      const invitation = await prisma.caregiverInvitation.findUnique({
        where: { invitationToken },
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
          { error: "Ongeldige uitnodiging" },
          { status: 400 }
        )
      }

      if (invitation.status !== "PENDING") {
        return NextResponse.json(
          { error: "Deze uitnodiging is al verwerkt" },
          { status: 400 }
        )
      }

      // Check if the invitation email matches the registration email
      // For email-based invitations, check invitedEmail field
      if (invitation.caregiverId && invitation.caregiver && invitation.caregiver.user.email !== email) {
        return NextResponse.json(
          { error: "Deze uitnodiging is voor een ander email adres" },
          { status: 400 }
        )
      }

      // For email-based invitations (no caregiverId yet)
      if (!invitation.caregiverId && invitation.invitedEmail !== email) {
        return NextResponse.json(
          { error: "Deze uitnodiging is voor een ander email adres" },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and caregiver profile in a transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "CAREGIVER",
        caregiverProfile: {
          create: {
            name,
            phoneNumber,
            address,
            bio: bio || "",
          },
        },
      },
      include: {
        caregiverProfile: true,
      },
    })

    // Link any pending email-based invitations to this new caregiver profile
    await prisma.caregiverInvitation.updateMany({
      where: {
        invitedEmail: email,
        caregiverId: null, // Only update email-based invitations (no caregiverId yet)
        status: "PENDING",
      },
      data: {
        caregiverId: user.caregiverProfile!.id,
        invitedEmail: null, // Clear invitedEmail since we now have a caregiverId
      },
    })

    // Create verification token
    const verificationToken = await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: crypto.randomUUID(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    // Send verification email
    await sendEmail({
      to: email,
      subject: "Verifieer uw email - Zorgdossier",
      html: getVerificationEmailHtml(verificationToken.token, email),
    })

    return NextResponse.json(
      {
        message: "Registratie succesvol. Controleer uw email voor verificatie.",
        userId: user.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden tijdens registratie" },
      { status: 500 }
    )
  }
}
