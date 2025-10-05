import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    // Only clients can search for caregivers
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen zorgverleners zoeken" },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    if (!query.trim()) {
      return NextResponse.json(
        { caregivers: [] },
        { status: 200 }
      )
    }

    // Search caregivers by name, email, or address
    const caregivers = await prisma.caregiverProfile.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { address: { contains: query, mode: "insensitive" } },
              { user: { email: { contains: query, mode: "insensitive" } } },
            ],
          },
          {
            user: {
              role: "CAREGIVER", // Only show actual caregivers, not admins
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
          },
        },
      },
      take: 20, // Limit results
    })

    // Filter out caregivers with unverified emails
    const verifiedCaregivers = caregivers.filter(c => c.user.emailVerified)

    // Check if any caregivers are already invited or in team
    const clientId = user.clientProfile.id

    const existingInvitations = await prisma.caregiverInvitation.findMany({
      where: {
        clientId,
        caregiverId: { in: verifiedCaregivers.map(c => c.id) },
        status: "PENDING",
      },
    })

    const existingRelationships = await prisma.caregiverClientRelationship.findMany({
      where: {
        clientId,
        caregiverId: { in: verifiedCaregivers.map(c => c.id) },
      },
    })

    const invitedIds = new Set(existingInvitations.map(i => i.caregiverId))
    const teamIds = new Set(existingRelationships.map(r => r.caregiverId))

    const caregiversWithStatus = verifiedCaregivers.map(caregiver => ({
      ...caregiver,
      alreadyInvited: invitedIds.has(caregiver.id),
      alreadyInTeam: teamIds.has(caregiver.id),
    }))

    return NextResponse.json(
      { caregivers: caregiversWithStatus },
      { status: 200 }
    )
  } catch (error) {
    console.error("Caregiver search error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het zoeken" },
      { status: 500 }
    )
  }
}
