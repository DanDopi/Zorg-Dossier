import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PUT /api/voeding/fluid/schedule/[id] - Update a fluid intake schedule
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const { id } = await params

    const schedule = await prisma.fluidIntakeSchedule.findUnique({ where: { id } })
    if (!schedule) {
      return NextResponse.json({ error: "Schema niet gevonden" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    const isOwnClient = user.role === "CLIENT" && user.clientProfile?.id === schedule.clientId
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

    if (!isOwnClient && !isAdmin) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const body = await request.json()
    const { intakeTime, volume, fluidType, recurrenceType, daysOfWeek, startDate, endDate, isActive } = body

    if ((recurrenceType === "weekly" || recurrenceType === "specific_days") && (!daysOfWeek || daysOfWeek.length === 0)) {
      return NextResponse.json({ error: "Selecteer tenminste één dag" }, { status: 400 })
    }

    const updated = await prisma.fluidIntakeSchedule.update({
      where: { id },
      data: {
        intakeTime: intakeTime ?? schedule.intakeTime,
        volume: volume !== undefined ? parseInt(String(volume)) : schedule.volume,
        fluidType: fluidType !== undefined ? (fluidType || null) : schedule.fluidType,
        recurrenceType: recurrenceType ?? schedule.recurrenceType,
        daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : schedule.daysOfWeek,
        startDate: startDate ? new Date(startDate) : schedule.startDate,
        endDate: endDate ? new Date(endDate) : (endDate === "" ? null : schedule.endDate),
        isActive: isActive !== undefined ? isActive : schedule.isActive,
      },
    })

    return NextResponse.json({ schedule: updated })
  } catch (error) {
    console.error("Update fluid intake schedule error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}

// DELETE /api/voeding/fluid/schedule/[id] - Delete a fluid intake schedule
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const { id } = await params

    const schedule = await prisma.fluidIntakeSchedule.findUnique({ where: { id } })
    if (!schedule) {
      return NextResponse.json({ error: "Schema niet gevonden" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    const isOwnClient = user.role === "CLIENT" && user.clientProfile?.id === schedule.clientId
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

    if (!isOwnClient && !isAdmin) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    await prisma.fluidIntakeSchedule.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete fluid intake schedule error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
