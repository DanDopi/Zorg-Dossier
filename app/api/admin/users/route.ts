import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Alleen administrators kunnen gebruikers bekijken" },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      include: {
        clientProfile: true,
        caregiverProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Admin users GET error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Alleen administrators kunnen gebruikers aanmaken" },
        { status: 403 }
      )
    }

    const { email, name, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, wachtwoord en rol zijn verplicht" },
        { status: 400 }
      )
    }

    // Only SUPER_ADMIN can create ADMIN users
    if (role === "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Alleen Super Administrators kunnen Admin gebruikers aanmaken" },
        { status: 403 }
      )
    }

    // Nobody can create SUPER_ADMIN users via API
    if (role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super Admin gebruikers kunnen niet via de interface worden aangemaakt" },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Een gebruiker met dit emailadres bestaat al" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
        role,
      },
    })

    // Create profile based on role
    if (role === "CLIENT") {
      await prisma.clientProfile.create({
        data: {
          userId: newUser.id,
        },
      })
    } else if (role === "CAREGIVER") {
      await prisma.caregiverProfile.create({
        data: {
          userId: newUser.id,
        },
      })
    }

    return NextResponse.json(newUser)
  } catch (error) {
    console.error("Admin users POST error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
