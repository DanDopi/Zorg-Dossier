import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/scheduling/shifts/time-correction - Caregiver submits actual worked times
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { caregiverProfile: true },
    })

    if (!user?.caregiverProfile || user.role !== "CAREGIVER") {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen tijdcorrecties indienen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { shiftId, actualStartTime, actualEndTime, caregiverNote } = body

    if (!shiftId || !actualStartTime || !actualEndTime) {
      return NextResponse.json(
        { error: "Dienst ID, starttijd en eindtijd zijn verplicht" },
        { status: 400 }
      )
    }

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
    if (!timeRegex.test(actualStartTime) || !timeRegex.test(actualEndTime)) {
      return NextResponse.json(
        { error: "Ongeldig tijdformaat. Gebruik HH:mm" },
        { status: 400 }
      )
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    })

    if (!shift) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 })
    }

    if (shift.caregiverId !== user.caregiverProfile.id) {
      return NextResponse.json(
        { error: "U bent niet toegewezen aan deze dienst" },
        { status: 403 }
      )
    }

    const shiftDate = new Date(shift.date)
    shiftDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (shiftDate >= today) {
      return NextResponse.json(
        { error: "Tijdcorrecties kunnen alleen voor afgelopen diensten worden ingediend" },
        { status: 400 }
      )
    }

    if (shift.status !== "FILLED" && shift.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Alleen ingevulde of voltooide diensten kunnen worden gecorrigeerd" },
        { status: 400 }
      )
    }

    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        actualStartTime,
        actualEndTime,
        caregiverNote: caregiverNote || null,
        timeCorrectionStatus: "PENDING",
        timeCorrectionAt: new Date(),
      },
      include: {
        shiftType: true,
        caregiver: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    })

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error("Time correction error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
