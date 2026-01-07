import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * PUT /api/caregiver/client-color
 * Update color preference for a specific client-caregiver relationship
 */
export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geauthenticeerd" }, { status: 401 })
    }

    if (session.user.role !== "CAREGIVER") {
      return NextResponse.json({ error: "Alleen zorgverleners kunnen cliëntkleuren instellen" }, { status: 403 })
    }

    const { clientId, color } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is verplicht" }, { status: 400 })
    }

    // Validate hex color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json({ error: "Ongeldige kleurcode (gebruik hex formaat zoals #3B82F6)" }, { status: 400 })
    }

    // Get caregiver profile
    const caregiver = await prisma.caregiverProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!caregiver) {
      return NextResponse.json({ error: "Zorgverlener profiel niet gevonden" }, { status: 404 })
    }

    // Update the relationship with the new color preference
    const relationship = await prisma.caregiverClientRelationship.update({
      where: {
        caregiverId_clientId: {
          caregiverId: caregiver.id,
          clientId: clientId
        }
      },
      data: {
        clientColorPreference: color || null  // null removes the color preference
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: color ? "Kleur succesvol opgeslagen" : "Kleur succesvol verwijderd",
      relationship
    })
  } catch (error) {
    console.error("Error updating client color:", error)

    // Handle specific Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Relatie niet gevonden" }, { status: 404 })
      }
    }

    return NextResponse.json({ error: "Fout bij opslaan kleur" }, { status: 500 })
  }
}
