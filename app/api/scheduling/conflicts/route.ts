import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Helper function to check if two time ranges overlap
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert HH:mm to minutes since midnight for comparison
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const start1Min = toMinutes(start1)
  const end1Min = toMinutes(end1)
  const start2Min = toMinutes(start2)
  const end2Min = toMinutes(end2)

  // Handle overnight shifts (end time < start time)
  const end1Adjusted = end1Min < start1Min ? end1Min + 1440 : end1Min
  const end2Adjusted = end2Min < start2Min ? end2Min + 1440 : end2Min

  // Check if ranges overlap
  return start1Min < end2Adjusted && start2Min < end1Adjusted
}

// POST /api/scheduling/conflicts - Check for conflicts when assigning a caregiver to a shift
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const body = await request.json()
    const { caregiverId, date, startTime, endTime, excludeShiftId } = body

    if (!caregiverId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Zorgverlener ID, datum, starttijd en eindtijd zijn verplicht" },
        { status: 400 }
      )
    }

    // Find all shifts for this caregiver on this date
    const existingShifts = await prisma.shift.findMany({
      where: {
        caregiverId,
        date: new Date(date),
        status: {
          not: "CANCELLED",
        },
        ...(excludeShiftId && {
          id: {
            not: excludeShiftId,
          },
        }),
      },
      include: {
        shiftType: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    })

    // Check for time conflicts
    const conflicts = existingShifts.filter((shift) =>
      timeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime)
    )

    if (conflicts.length > 0) {
      return NextResponse.json({
        hasConflict: true,
        conflicts: conflicts.map((shift) => ({
          id: shift.id,
          clientName: shift.client.name,
          shiftTypeName: shift.shiftType.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          date: shift.date,
        })),
      })
    }

    return NextResponse.json({
      hasConflict: false,
      conflicts: [],
    })
  } catch (error) {
    console.error("Error checking conflicts:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het controleren van conflicten" },
      { status: 500 }
    )
  }
}
