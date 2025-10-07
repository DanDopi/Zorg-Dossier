import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PUT /api/voeding/tube-feeding/schedule/[id] - Update a tube feeding schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const scheduleId = params.id
    const body = await request.json()

    // Fetch existing schedule
    const existingSchedule = await prisma.tubeFeedingSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Schema niet gevonden" },
        { status: 404 }
      )
    }

    // Only client who owns the schedule can update it (or admins)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    const isOwnClient = user.role === "CLIENT" && user.clientProfile?.id === existingSchedule.clientId
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

    if (!isOwnClient && !isAdmin) {
      return NextResponse.json(
        { error: "Geen toegang om dit schema te wijzigen" },
        { status: 403 }
      )
    }

    // Validate recurrence type specific fields if being updated
    if ((body.recurrenceType === "weekly" || body.recurrenceType === "specific_days") &&
        (!body.daysOfWeek || body.daysOfWeek.length === 0)) {
      return NextResponse.json(
        { error: "Selecteer tenminste één dag voor dit herhalingstype" },
        { status: 400 }
      )
    }

    // Update schedule
    const updatedSchedule = await prisma.tubeFeedingSchedule.update({
      where: { id: scheduleId },
      data: {
        feedingTime: body.feedingTime !== undefined ? body.feedingTime : undefined,
        volume: body.volume !== undefined ? parseInt(body.volume) : undefined,
        feedSpeed: body.feedSpeed !== undefined ? parseInt(body.feedSpeed) : undefined,
        feedType: body.feedType !== undefined ? body.feedType : undefined,
        recurrenceType: body.recurrenceType !== undefined ? body.recurrenceType : undefined,
        daysOfWeek: body.daysOfWeek !== undefined ? (body.daysOfWeek && body.daysOfWeek.length > 0 ? JSON.stringify(body.daysOfWeek) : null) : undefined,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
    })

    return NextResponse.json({ schedule: updatedSchedule }, { status: 200 })
  } catch (error) {
    console.error("Update tube feeding schedule error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// DELETE /api/voeding/tube-feeding/schedule/[id] - Delete a tube feeding schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const scheduleId = params.id

    // Fetch existing schedule
    const existingSchedule = await prisma.tubeFeedingSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Schema niet gevonden" },
        { status: 404 }
      )
    }

    // Only client who owns the schedule can delete it (or admins)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    const isOwnClient = user.role === "CLIENT" && user.clientProfile?.id === existingSchedule.clientId
    const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN"

    if (!isOwnClient && !isAdmin) {
      return NextResponse.json(
        { error: "Geen toegang om dit schema te verwijderen" },
        { status: 403 }
      )
    }

    // Delete schedule
    await prisma.tubeFeedingSchedule.delete({
      where: { id: scheduleId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Delete tube feeding schedule error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
