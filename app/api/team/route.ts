import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/team - Get client's team of caregivers
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    // Only clients can view their team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user || user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen hun team bekijken" },
        { status: 403 }
      )
    }

    const team = await prisma.caregiverClientRelationship.findMany({
      where: {
        clientId: user.clientProfile.id,
      },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Also get pending and declined invitations
    const invitations = await prisma.caregiverInvitation.findMany({
      where: {
        clientId: user.clientProfile.id,
        status: {
          in: ["PENDING", "DECLINED"],
        },
      },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(
      { team, invitations },
      { status: 200 }
    )
  } catch (error) {
    console.error("Get team error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
