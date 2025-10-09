import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PUT /api/voeding/tube-feeding/schedule/[id] - Update a tube feeding schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const { id: scheduleId } = await params
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

    // Update schedule - build data object conditionally
    const updateData: Record<string, unknown> = {}

    if (body.feedingTime !== undefined) updateData.feedingTime = body.feedingTime
    if (body.volume !== undefined) updateData.volume = parseInt(body.volume)
    if (body.feedSpeed !== undefined) updateData.feedSpeed = parseInt(body.feedSpeed)
    if (body.feedType !== undefined) updateData.feedType = body.feedType
    if (body.recurrenceType !== undefined) updateData.recurrenceType = body.recurrenceType
    if (body.daysOfWeek !== undefined) {
      updateData.daysOfWeek = body.daysOfWeek && body.daysOfWeek.length > 0 ? JSON.stringify(body.daysOfWeek) : null
    }
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const updatedSchedule = await prisma.tubeFeedingSchedule.update({
      where: { id: scheduleId },
      data: updateData,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const { id: scheduleId } = await params

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
