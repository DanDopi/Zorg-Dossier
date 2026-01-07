import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { differenceInDays } from "date-fns"

// Helper function: Calculate hours between two time strings "HH:mm"
function calculateShiftHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  let hours = endHour - startHour
  let minutes = endMin - startMin

  if (minutes < 0) {
    hours -= 1
    minutes += 60
  }

  // Handle overnight shifts (crosses midnight)
  if (hours < 0) {
    hours += 24
  }

  return hours + (minutes / 60)
}

// Helper function: Calculate 12-month date range from today (forward-looking for scheduling)
function getYearRangeFromToday() {
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date()
  endDate.setFullYear(endDate.getFullYear() + 1)
  endDate.setHours(23, 59, 59, 999)

  return { startDate, endDate }
}

// GET /api/scheduling/overview-stats - Get comprehensive scheduling statistics
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
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Only CLIENT role can access overview stats
    if (user.role !== "CLIENT" || !user.clientProfile) {
      return NextResponse.json(
        { error: "Alleen clients hebben toegang tot deze statistieken" },
        { status: 403 }
      )
    }

    const clientId = user.clientProfile.id

    // Calculate 12-month period
    const { startDate, endDate } = getYearRangeFromToday()

    // Fetch all data in parallel for performance
    const [allShifts, unfilledShifts, timeOffRequests] = await Promise.all([
      // All shifts for overall stats
      prisma.shift.findMany({
        where: {
          clientId,
          date: { gte: startDate, lte: endDate },
        },
        include: {
          caregiver: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      }),

      // Unfilled shifts with shift type details
      prisma.shift.findMany({
        where: {
          clientId,
          caregiverId: null,
          date: { gte: startDate, lte: endDate },
        },
        include: {
          shiftType: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      }),

      // Approved sick leave for sickness percentage
      prisma.timeOffRequest.findMany({
        where: {
          clientId,
          status: 'APPROVED',
          requestType: 'SICK_LEAVE',
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        select: {
          caregiverId: true,
          startDate: true,
          endDate: true,
        },
      }),
    ])

    // Calculate overall stats
    const totalShifts = allShifts.length
    const filledShifts = allShifts.filter(s => s.caregiverId !== null && s.caregiverId !== undefined && s.caregiverId !== '').length
    const unfilledShiftsCount = allShifts.filter(s => !s.caregiverId || s.caregiverId === null || s.caregiverId === '').length
    const completedShifts = allShifts.filter(s => s.status === 'COMPLETED').length
    const cancelledShifts = allShifts.filter(s => s.status === 'CANCELLED').length

    const fillRate = totalShifts > 0 ? (filledShifts / totalShifts) * 100 : 0

    // Completion rate only considers past shifts
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const pastShifts = allShifts.filter(s => s.date < today)
    const completionRate = pastShifts.length > 0 ? (completedShifts / pastShifts.length) * 100 : 0

    // Format unfilled shifts list
    const unfilledShiftsList = unfilledShifts.map(shift => ({
      id: shift.id,
      date: shift.date.toISOString(),
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: {
        id: shift.shiftType.id,
        name: shift.shiftType.name,
        color: shift.shiftType.color,
      },
      status: shift.status,
    }))

    // Group unfilled shifts by date to create unfilled dates list
    const unfilledDateGroups = new Map<string, { date: string; unfilledCount: number; totalShifts: number }>()

    unfilledShifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0]
      if (!unfilledDateGroups.has(dateKey)) {
        unfilledDateGroups.set(dateKey, {
          date: dateKey,
          unfilledCount: 0,
          totalShifts: 0,
        })
      }
      const group = unfilledDateGroups.get(dateKey)!
      group.unfilledCount++
    })

    // Add total shifts count for each unfilled date
    allShifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0]
      if (unfilledDateGroups.has(dateKey)) {
        const group = unfilledDateGroups.get(dateKey)!
        group.totalShifts++
      }
    })

    const unfilledDatesList = Array.from(unfilledDateGroups.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // Calculate sick days per caregiver
    const sickDaysMap = new Map<string, number>()

    timeOffRequests.forEach(request => {
      // Calculate overlap with 12-month period
      const requestStart = request.startDate > startDate ? request.startDate : startDate
      const requestEnd = request.endDate < endDate ? request.endDate : endDate

      const days = differenceInDays(requestEnd, requestStart) + 1
      const currentSickDays = sickDaysMap.get(request.caregiverId) || 0
      sickDaysMap.set(request.caregiverId, currentSickDays + days)
    })

    // Aggregate caregiver statistics
    const caregiverMap = new Map<string, {
      caregiverId: string
      caregiverName: string
      caregiverColor: string | null
      shifts: typeof allShifts
      totalHours: number
      completedShifts: number
      cancelledShifts: number
    }>()

    allShifts.forEach(shift => {
      if (!shift.caregiverId || !shift.caregiver) return

      if (!caregiverMap.has(shift.caregiverId)) {
        caregiverMap.set(shift.caregiverId, {
          caregiverId: shift.caregiverId,
          caregiverName: shift.caregiver.name,
          caregiverColor: shift.caregiver.color,
          shifts: [],
          totalHours: 0,
          completedShifts: 0,
          cancelledShifts: 0,
        })
      }

      const caregiverStats = caregiverMap.get(shift.caregiverId)!
      caregiverStats.shifts.push(shift)
      caregiverStats.totalHours += calculateShiftHours(shift.startTime, shift.endTime)

      if (shift.status === 'COMPLETED') caregiverStats.completedShifts++
      if (shift.status === 'CANCELLED') caregiverStats.cancelledShifts++
    })

    // Format caregiver stats for response
    const caregiverStats = Array.from(caregiverMap.values()).map(caregiver => {
      const totalShifts = caregiver.shifts.length
      const sickDaysCount = sickDaysMap.get(caregiver.caregiverId) || 0

      // Calculate sickness percentage: (sick days / scheduled days) × 100
      const sicknessPercentage = totalShifts > 0 ? (sickDaysCount / totalShifts) * 100 : 0

      // Calculate average hours per week (12 months = ~52 weeks)
      const weeksInPeriod = 52
      const averageHoursPerWeek = caregiver.totalHours / weeksInPeriod

      return {
        caregiverId: caregiver.caregiverId,
        caregiverName: caregiver.caregiverName,
        caregiverColor: caregiver.caregiverColor,
        totalShifts,
        totalHours: parseFloat(caregiver.totalHours.toFixed(1)),
        completedShifts: caregiver.completedShifts,
        cancelledShifts: caregiver.cancelledShifts,
        averageHoursPerWeek: parseFloat(averageHoursPerWeek.toFixed(1)),
        sicknessPercentage: parseFloat(sicknessPercentage.toFixed(1)),
        sickDaysCount,
      }
    }).sort((a, b) => b.totalShifts - a.totalShifts) // Sort by most shifts first

    // Assemble response
    const response = {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      overallStats: {
        totalShifts,
        filledShifts,
        unfilledShifts: unfilledShiftsCount,
        completedShifts,
        cancelledShifts,
        fillRate: parseFloat(fillRate.toFixed(1)),
        completionRate: parseFloat(completionRate.toFixed(1)),
      },
      unfilledShiftsList,
      unfilledDatesList,
      caregiverStats,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching overview stats:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de statistieken" },
      { status: 500 }
    )
  }
}
