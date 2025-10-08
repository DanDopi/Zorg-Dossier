import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  startOfWeek,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  addWeeks,
  getDay,
  startOfMonth,
  endOfMonth,
  lastDayOfMonth,
  getDate
} from "date-fns"

// POST /api/scheduling/generate - Generate shifts from patterns
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
        { error: "Alleen clients kunnen diensten genereren" },
        { status: 403 }
      )
    }

    // Check if a specific pattern ID was provided
    const body = await request.json().catch(() => ({}))
    const { patternId } = body

    // Calculate date range - generate until end of next year (max allowed)
    const today = startOfDay(new Date())
    const currentYear = today.getFullYear()
    const nextYearEnd = new Date(currentYear + 1, 11, 31, 23, 59, 59) // December 31st next year
    const endDate = startOfDay(nextYearEnd)

    // Get patterns - either specific pattern or all active patterns
    const patterns = await prisma.shiftPattern.findMany({
      where: {
        clientId: user.clientProfile.id,
        isActive: true,
        startDate: { lte: endDate },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
        ...(patternId && { id: patternId }), // Only include this pattern if patternId is provided
      },
      include: {
        shiftType: true,
        caregiver: true,
      },
    })

    if (patterns.length === 0) {
      return NextResponse.json({
        message: "Geen actieve patronen gevonden",
        generated: 0,
        skipped: 0,
      })
    }

    let generated = 0
    let skipped = 0

    // Generate shifts for each pattern
    for (const pattern of patterns) {
      console.log('Processing pattern:', {
        id: pattern.id,
        recurrenceType: pattern.recurrenceType,
        startDate: pattern.startDate,
        shiftTypeName: pattern.shiftType.name,
        caregiverName: pattern.caregiver?.name || 'Unassigned'
      })

      const patternStartDay = startOfDay(pattern.startDate)
      const patternEndDay = pattern.endDate ? startOfDay(pattern.endDate) : endDate
      const dayOfWeekFromStart = getDay(patternStartDay) // 0=Sunday, 1=Monday, etc.

      // Generate dates based on recurrence type
      const datesToGenerate: Date[] = []

      if (pattern.recurrenceType === "DAILY") {
        // Every day from start to end
        let currentDate = patternStartDay

        while (!isAfter(currentDate, patternEndDay)) {
          if (!isBefore(currentDate, today)) {
            datesToGenerate.push(startOfDay(currentDate))
          }
          currentDate = addDays(currentDate, 1)
        }
      } else if (pattern.recurrenceType === "WEEKLY") {
        // Every week on the same day as startDate
        let currentWeek = startOfWeek(today > patternStartDay ? today : patternStartDay, { weekStartsOn: 1 })

        while (isBefore(currentWeek, patternEndDay)) {
          const daysToAdd = dayOfWeekFromStart === 0 ? 6 : dayOfWeekFromStart - 1
          const shiftDate = startOfDay(addDays(currentWeek, daysToAdd))

          if (!isBefore(shiftDate, patternStartDay) && !isAfter(shiftDate, patternEndDay) && !isBefore(shiftDate, today)) {
            datesToGenerate.push(shiftDate)
          }

          currentWeek = addWeeks(currentWeek, 1)
        }
      } else if (pattern.recurrenceType === "BIWEEKLY") {
        // Every other week on the same day as startDate
        let currentDate = patternStartDay

        while (!isAfter(currentDate, patternEndDay)) {
          if (!isBefore(currentDate, today)) {
            datesToGenerate.push(startOfDay(currentDate))
          }
          currentDate = addWeeks(currentDate, 2)
        }
      } else if (pattern.recurrenceType === "FIRST_OF_MONTH") {
        // First occurrence of dayOfWeek in each month
        let currentMonth = startOfMonth(today > patternStartDay ? today : patternStartDay)

        while (isBefore(currentMonth, patternEndDay)) {
          // Find first occurrence of dayOfWeek in this month
          let firstOccurrence = currentMonth
          while (getDay(firstOccurrence) !== dayOfWeekFromStart) {
            firstOccurrence = addDays(firstOccurrence, 1)
          }

          const shiftDate = startOfDay(firstOccurrence)
          if (!isBefore(shiftDate, patternStartDay) && !isAfter(shiftDate, patternEndDay) && !isBefore(shiftDate, today)) {
            datesToGenerate.push(shiftDate)
          }

          // Move to next month
          currentMonth = startOfMonth(addDays(endOfMonth(currentMonth), 1))
        }
      } else if (pattern.recurrenceType === "LAST_OF_MONTH") {
        // Last occurrence of dayOfWeek in each month
        let currentMonth = startOfMonth(today > patternStartDay ? today : patternStartDay)

        while (isBefore(currentMonth, patternEndDay)) {
          // Find last occurrence of dayOfWeek in this month
          let lastDay = lastDayOfMonth(currentMonth)
          let lastOccurrence = lastDay

          // Walk backwards to find last occurrence
          while (getDay(lastOccurrence) !== dayOfWeekFromStart) {
            lastOccurrence = addDays(lastOccurrence, -1)
          }

          const shiftDate = startOfDay(lastOccurrence)
          if (!isBefore(shiftDate, patternStartDay) && !isAfter(shiftDate, patternEndDay) && !isBefore(shiftDate, today)) {
            datesToGenerate.push(shiftDate)
          }

          // Move to next month
          currentMonth = startOfMonth(addDays(endOfMonth(currentMonth), 1))
        }
      }

      // Create shifts for generated dates
      for (const shiftDate of datesToGenerate) {
        // Check if shift already exists
        const existingShift = await prisma.shift.findFirst({
          where: {
            clientId: user.clientProfile.id,
            shiftTypeId: pattern.shiftTypeId,
            date: shiftDate,
          },
        })

        if (!existingShift) {
          console.log('Creating shift for date:', shiftDate)
          await prisma.shift.create({
            data: {
              clientId: user.clientProfile.id,
              shiftTypeId: pattern.shiftTypeId,
              date: shiftDate,
              startTime: pattern.shiftType.startTime,
              endTime: pattern.shiftType.endTime,
              caregiverId: pattern.caregiverId || null,
              status: pattern.caregiverId ? "FILLED" : "UNFILLED",
              patternId: pattern.id,
              isPatternOverride: false,
              createdBy: session.user.id,
            },
          })
          generated++
        } else {
          skipped++
        }
      }
    }

    return NextResponse.json({
      message: "Diensten succesvol gegenereerd",
      generated,
      skipped,
      patterns: patterns.length,
    })
  } catch (error) {
    console.error("Error generating shifts:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het genereren van diensten" },
      { status: 500 }
    )
  }
}
