import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendEmail, getVerificationEmailHtml } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, dateOfBirth, address } = body

    // Validate required fields
    if (!email || !password || !name || !dateOfBirth || !address) {
      return NextResponse.json(
        { error: "Alle velden zijn verplicht" },
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and client profile in a transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "CLIENT",
        clientProfile: {
          create: {
            name,
            dateOfBirth: new Date(dateOfBirth),
            address,
          },
        },
      },
      include: {
        clientProfile: true,
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
