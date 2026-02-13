import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/scheduling/shifts - Get shifts for a date range
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const caregiverId = searchParams.get("caregiverId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start- en einddatum zijn verplicht" },
        { status: 400 }
      )
    }

    // Build where clause based on user role
    // Parse dates as local time to match how dates are stored in the database
    // Handle both "YYYY-MM-DD" and full ISO string formats
    function parseToLocalDate(dateStr: string): Date {
      const d = new Date(dateStr)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    const startLocal = parseToLocalDate(startDate)
    const endLocal = parseToLocalDate(endDate)
    const where: {
      date: { gte: Date; lte: Date }
      clientId?: string
      caregiverId?: string
    } = {
      date: {
        gte: startLocal,
        lte: new Date(endLocal.getFullYear(), endLocal.getMonth(), endLocal.getDate(), 23, 59, 59, 999),
      },
    }

    if (user.role === "CLIENT" && user.clientProfile) {
      where.clientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER" && caregiverId) {
      where.caregiverId = caregiverId
    } else if (clientId) {
      where.clientId = clientId
    } else {
      return NextResponse.json({ error: "Client ID vereist" }, { status: 400 })
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        shiftType: true,
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
            clientRelationships: {
              select: {
                clientId: true,
                clientColorPreference: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })

    // Transform shifts to include clientColorPreference at caregiver level
    const transformedShifts = shifts.map((shift) => {
      if (!shift.caregiver) {
        return shift
      }

      const { clientRelationships, ...caregiverWithoutRelationships } = shift.caregiver

      // Find the relationship that matches this shift's client
      const matchingRelationship = clientRelationships.find(
        rel => rel.clientId === shift.clientId
      )

      return {
        ...shift,
        caregiver: {
          ...caregiverWithoutRelationships,
          clientColorPreference: matchingRelationship?.clientColorPreference || null,
        },
      }
    })

    return NextResponse.json(transformedShifts)
  } catch (error) {
    console.error("Error fetching shifts:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de diensten" },
      { status: 500 }
    )
  }
}

// POST /api/scheduling/shifts - Create a new shift
export async function POST(request: NextRequest) {
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
        { error: "Alleen clients kunnen diensten aanmaken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      shiftTypeId,
      date,
      startTime,
      endTime,
      caregiverId,
      internalNotes,
      instructionNotes,
    } = body

    if (!shiftTypeId || !date) {
      return NextResponse.json(
        { error: "Diensttype en datum zijn verplicht" },
        { status: 400 }
      )
    }

    // Verify shift type belongs to this client
    const shiftType = await prisma.shiftType.findUnique({
      where: { id: shiftTypeId },
    })

    if (!shiftType || shiftType.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "Ongeldig diensttype" },
        { status: 400 }
      )
    }

    // If caregiver specified, verify relationship
    if (caregiverId) {
      const relationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId,
          clientId: user.clientProfile.id,
          status: "ACTIVE",
        },
      })

      if (!relationship) {
        return NextResponse.json(
          { error: "Deze zorgverlener heeft geen actieve relatie met u" },
          { status: 400 }
        )
      }
    }

    // Use shift type times as default
    const finalStartTime = startTime || shiftType.startTime
    const finalEndTime = endTime || shiftType.endTime

    const shift = await prisma.shift.create({
      data: {
        clientId: user.clientProfile.id,
        shiftTypeId,
        date: new Date(date),
        startTime: finalStartTime,
        endTime: finalEndTime,
        caregiverId: caregiverId || null,
        status: caregiverId ? "FILLED" : "UNFILLED",
        internalNotes,
        instructionNotes,
        createdBy: session.user.id,
      },
      include: {
        shiftType: true,
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
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error("Error creating shift:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de dienst" },
      { status: 500 }
    )
  }
}

// PUT /api/scheduling/shifts - Update a shift
export async function PUT(request: NextRequest) {
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
        { error: "Alleen clients kunnen diensten bijwerken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      id,
      caregiverId,
      startTime,
      endTime,
      internalNotes,
      instructionNotes,
      status,
      recurrence,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingShift = await prisma.shift.findUnique({
      where: { id },
    })

    if (!existingShift) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 })
    }

    if (existingShift.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze dienst" },
        { status: 403 }
      )
    }

    // Check if shift is completed (locked)
    if (existingShift.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Voltooide diensten kunnen niet worden gewijzigd" },
        { status: 400 }
      )
    }

    // If caregiver is being assigned, verify relationship
    if (caregiverId !== undefined && caregiverId !== null) {
      const relationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId,
          clientId: user.clientProfile.id,
          status: "ACTIVE",
        },
      })

      if (!relationship) {
        return NextResponse.json(
          { error: "Deze zorgverlener heeft geen actieve relatie met u" },
          { status: 400 }
        )
      }
    }

    // Determine new status
    let newStatus = status
    if (!newStatus) {
      if (caregiverId === null) {
        newStatus = "UNFILLED"
      } else if (caregiverId && existingShift.caregiverId === null) {
        newStatus = "FILLED"
      }
    }

    // If caregiverId is being changed and there's a patternId, mark as override
    const isPatternOverride =
      existingShift.patternId &&
      caregiverId !== undefined &&
      caregiverId !== existingShift.caregiverId

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        ...(caregiverId !== undefined && { caregiverId }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(internalNotes !== undefined && { internalNotes }),
        ...(instructionNotes !== undefined && { instructionNotes }),
        ...(newStatus && { status: newStatus }),
        ...(isPatternOverride && { isPatternOverride: true }),
        // Auto-acknowledge pending time correction when client saves the shift
        ...(existingShift.timeCorrectionStatus === "PENDING" && {
          timeCorrectionStatus: "ACKNOWLEDGED",
        }),
      },
      include: {
        shiftType: true,
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
    })

    // Handle recurrence: assign caregiver to matching future shifts
    let recurringUpdated = 0
    if (recurrence && caregiverId && recurrence.type !== "NONE") {
      const shiftDate = new Date(existingShift.date)
      const shiftDayOfWeek = shiftDate.getDay() // 0=Sunday, 1=Monday, etc.
      const endDate = recurrence.endDate
        ? new Date(recurrence.endDate + "T23:59:59")
        : new Date(shiftDate.getFullYear(), 11, 31, 23, 59, 59) // End of year

      // Create a ShiftPattern for tracking
      await prisma.shiftPattern.create({
        data: {
          clientId: user.clientProfile.id,
          caregiverId,
          shiftTypeId: existingShift.shiftTypeId,
          recurrenceType: recurrence.type,
          daysOfWeek: JSON.stringify([recurrence.dayOfWeek]),
          startDate: shiftDate,
          endDate,
          isActive: true,
          createdBy: session.user.id,
        },
      })

      // Find all future UNFILLED shifts matching criteria
      const futureShifts = await prisma.shift.findMany({
        where: {
          clientId: existingShift.clientId,
          shiftTypeId: existingShift.shiftTypeId,
          status: "UNFILLED",
          date: {
            gt: shiftDate,
            lte: endDate,
          },
        },
        orderBy: { date: "asc" },
      })

      // Filter shifts by recurrence pattern
      const shiftsToUpdate: string[] = []

      for (const futureShift of futureShifts) {
        const futureDate = new Date(futureShift.date)
        const futureDayOfWeek = futureDate.getDay()

        // Must be same day of week
        if (futureDayOfWeek !== shiftDayOfWeek) continue

        if (recurrence.type === "WEEKLY") {
          // Every week - just matching day of week is enough
          shiftsToUpdate.push(futureShift.id)
        } else if (recurrence.type === "BIWEEKLY") {
          // Every other week - check if week difference is even
          const diffTime = futureDate.getTime() - shiftDate.getTime()
          const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000))
          if (diffWeeks % 2 === 0) {
            shiftsToUpdate.push(futureShift.id)
          }
        } else if (recurrence.type === "FIRST_OF_MONTH") {
          // First occurrence of this day-of-week in the month
          const firstOfMonth = new Date(futureDate.getFullYear(), futureDate.getMonth(), 1)
          let firstOccurrence = new Date(firstOfMonth)
          while (firstOccurrence.getDay() !== shiftDayOfWeek) {
            firstOccurrence.setDate(firstOccurrence.getDate() + 1)
          }
          if (futureDate.getDate() === firstOccurrence.getDate()) {
            shiftsToUpdate.push(futureShift.id)
          }
        } else if (recurrence.type === "LAST_OF_MONTH") {
          // Last occurrence of this day-of-week in the month
          const lastOfMonth = new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 0)
          let lastOccurrence = new Date(lastOfMonth)
          while (lastOccurrence.getDay() !== shiftDayOfWeek) {
            lastOccurrence.setDate(lastOccurrence.getDate() - 1)
          }
          if (futureDate.getDate() === lastOccurrence.getDate()) {
            shiftsToUpdate.push(futureShift.id)
          }
        }
      }

      // Batch update all matching shifts
      if (shiftsToUpdate.length > 0) {
        const result = await prisma.shift.updateMany({
          where: { id: { in: shiftsToUpdate } },
          data: {
            caregiverId,
            status: "FILLED",
          },
        })
        recurringUpdated = result.count
      }
    }

    return NextResponse.json({ shift: updatedShift, recurringUpdated })
  } catch (error) {
    console.error("Error updating shift:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de dienst" },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduling/shifts?id=xxx - Delete a shift
export async function DELETE(request: NextRequest) {
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
        { error: "Alleen clients kunnen diensten verwijderen" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingShift = await prisma.shift.findUnique({
      where: { id },
    })

    if (!existingShift) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 })
    }

    if (existingShift.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze dienst" },
        { status: 403 }
      )
    }

    // Check if shift is completed
    if (existingShift.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Voltooide diensten kunnen niet worden verwijderd" },
        { status: 400 }
      )
    }

    await prisma.shift.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Dienst succesvol verwijderd" })
  } catch (error) {
    console.error("Error deleting shift:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwijderen van de dienst" },
      { status: 500 }
    )
  }
}
