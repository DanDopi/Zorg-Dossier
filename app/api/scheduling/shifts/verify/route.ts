import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/scheduling/shifts/verify - Toggle client verification on a past shift
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user?.clientProfile || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen diensten controleren" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { shiftId, verified } = body

    if (!shiftId || typeof verified !== "boolean") {
      return NextResponse.json(
        { error: "shiftId en verified zijn verplicht" },
        { status: 400 }
      )
    }

    // Fetch the shift
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    })

    if (!shift) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 })
    }

    // Verify ownership
    if (shift.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze dienst" },
        { status: 403 }
      )
    }

    // Check eligibility: must be a past shift with a caregiver assigned
    if (!shift.caregiverId) {
      return NextResponse.json(
        { error: "Alleen diensten met een toegewezen zorgverlener kunnen worden gecontroleerd" },
        { status: 400 }
      )
    }

    if (shift.status !== "FILLED" && shift.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Alleen ingevulde of voltooide diensten kunnen worden gecontroleerd" },
        { status: 400 }
      )
    }

    const shiftDate = new Date(shift.date)
    shiftDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (shiftDate >= today) {
      return NextResponse.json(
        { error: "Alleen diensten in het verleden kunnen worden gecontroleerd" },
        { status: 400 }
      )
    }

    // Update verification status
    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        clientVerified: verified,
        clientVerifiedAt: verified ? new Date() : null,
      },
      include: {
        shiftType: true,
        caregiver: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error("Shift verification error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
