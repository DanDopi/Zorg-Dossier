import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/profile - Fetch current user's profile
export async function GET(request: NextRequest) {
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
      include: {
        clientProfile: true,
        caregiverProfile: true,
        familyProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    // Don't send password to client
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword, { status: 200 })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Get user to determine role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    // Update based on user role
    if (user.role === "CLIENT" && user.clientProfile) {
      const { name, dateOfBirth, address } = body

      if (!name || !dateOfBirth || !address) {
        return NextResponse.json(
          { error: "Alle velden zijn verplicht" },
          { status: 400 }
        )
      }

      await prisma.clientProfile.update({
        where: { id: user.clientProfile.id },
        data: {
          name,
          dateOfBirth: new Date(dateOfBirth),
          address,
        },
      })
    } else if (user.role === "CAREGIVER" && user.caregiverProfile) {
      const { name, phoneNumber, address, bio } = body

      if (!name || !phoneNumber || !address) {
        return NextResponse.json(
          { error: "Naam, telefoonnummer en adres zijn verplicht" },
          { status: 400 }
        )
      }

      await prisma.caregiverProfile.update({
        where: { id: user.caregiverProfile.id },
        data: {
          name,
          phoneNumber,
          address,
          bio: bio || "",
        },
      })
    } else {
      return NextResponse.json(
        { error: "Profiel kan niet worden bijgewerkt voor deze gebruikersrol" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Profiel succesvol bijgewerkt" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden tijdens het bijwerken" },
      { status: 500 }
    )
  }
}
