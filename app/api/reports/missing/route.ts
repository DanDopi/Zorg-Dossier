import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    // 1. Auth check
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Get user with both client and caregiver profiles
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: {
            clientRelationships: {
              where: { status: "ACTIVE" }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 3. Determine target client ID and if user is caregiver
    const { searchParams } = new URL(request.url)
    const clientIdParam = searchParams.get("clientId")
    const includeDetails = searchParams.get("details") === "true"

    let targetClientId: string
    const isCaregiver = !user.clientProfile && !!user.caregiverProfile

    if (user.clientProfile) {
      // USER is a CLIENT - use their own client ID
      targetClientId = user.clientProfile.id
    } else if (user.caregiverProfile && clientIdParam) {
      // USER is a CAREGIVER - verify relationship with requested client
      const hasRelationship = user.caregiverProfile.clientRelationships.some(
        rel => rel.clientId === clientIdParam
      )

      if (!hasRelationship) {
        return NextResponse.json(
          { error: "No access to this client" },
          { status: 403 }
        )
      }

      targetClientId = clientIdParam
    } else {
      return NextResponse.json(
        { error: "Client ID required for caregivers" },
        { status: 400 }
      )
    }

    // Get today's date at midnight to exclude today from missing reports check
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 4. Get all completed/filled shifts with caregiver (exclude today)
    // For caregivers: only get their own shifts
    // For clients: get all shifts (from any caregiver)
    const shifts = await prisma.shift.findMany({
      where: {
        clientId: targetClientId,
        caregiverId: isCaregiver ? user.caregiverProfile!.id : { not: null },
        status: { in: ['COMPLETED', 'FILLED'] },
        date: { lt: today }
      },
      select: {
        id: true,
        date: true,
        caregiverId: true,
        status: true,
        ...(includeDetails && {
          shiftType: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              color: true
            }
          },
          caregiver: {
            select: {
              id: true,
              name: true
            }
          }
        })
      }
    })

    // 5. Get all reports for this client
    const reports = await prisma.careReport.findMany({
      where: { clientId: targetClientId },
      select: {
        reportDate: true,
        caregiverId: true
      }
    })

    // 6. Find missing reports by comparing dates
    const missingDays = new Set<string>()
    interface MissingReportDetail {
      shiftId: string
      date: string
      caregiverId: string
      caregiverName: string
      shiftType: {
        id: string
        name: string
        startTime: string
        endTime: string
        color: string
      }
      status: string
      daysOverdue: number
    }
    const missingReportsDetailed: MissingReportDetail[] = []

    for (const shift of shifts) {
      const shiftDateKey = new Date(shift.date).toISOString().split('T')[0] // YYYY-MM-DD

      const hasReport = reports.some(report => {
        const reportDateKey = new Date(report.reportDate).toISOString().split('T')[0]
        return reportDateKey === shiftDateKey && report.caregiverId === shift.caregiverId
      })

      if (!hasReport) {
        missingDays.add(shiftDateKey) // Count unique days only

        if (includeDetails) {
          // Calculate days overdue
          const today = new Date()
          const shiftDate = new Date(shift.date)
          const daysOverdue = Math.floor((today.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24))

          const shiftWithDetails = shift as typeof shift & {
            caregiver?: { name: string }
            shiftType?: {
              id: string
              name: string
              startTime: string
              endTime: string
              color: string
            }
          }

          missingReportsDetailed.push({
            shiftId: shift.id,
            date: shiftDateKey,
            caregiverId: shift.caregiverId as string,
            caregiverName: shiftWithDetails.caregiver?.name || "Onbekend",
            shiftType: {
              id: shiftWithDetails.shiftType?.id || "",
              name: shiftWithDetails.shiftType?.name || "Onbekend",
              startTime: shiftWithDetails.shiftType?.startTime || "",
              endTime: shiftWithDetails.shiftType?.endTime || "",
              color: shiftWithDetails.shiftType?.color || "#6b7280"
            },
            status: shift.status as string,
            daysOverdue
          })
        }
      }
    }

    // If details not requested, return simple count
    if (!includeDetails) {
      return NextResponse.json({ missingDays: missingDays.size })
    }

    // 7. Build summary statistics
    const uniqueCaregivers = new Set(missingReportsDetailed.map(r => r.caregiverId))
    const oldestDate = missingReportsDetailed.length > 0
      ? missingReportsDetailed.reduce((oldest, report) => {
          return report.date < oldest ? report.date : oldest
        }, missingReportsDetailed[0].date)
      : null

    const summary = {
      totalMissing: missingReportsDetailed.length,
      uniqueDays: missingDays.size,
      uniqueCaregivers: uniqueCaregivers.size,
      oldestMissingDate: oldestDate
    }

    return NextResponse.json({
      missingReports: missingReportsDetailed,
      summary
    })
  } catch (error) {
    console.error("Error fetching missing reports:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
