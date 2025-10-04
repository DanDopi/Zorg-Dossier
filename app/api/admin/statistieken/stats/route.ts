import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Alleen administrators kunnen statistieken bekijken" },
        { status: 403 }
      )
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get first report date for average calculation
    const firstReport = await prisma.careReport.findFirst({
      orderBy: { createdAt: "asc" },
    })

    const [
      totalReports,
      reportsToday,
      reportsThisWeek,
      reportsThisMonth,
    ] = await Promise.all([
      prisma.careReport.count(),
      prisma.careReport.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.careReport.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      prisma.careReport.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ])

    // Calculate average reports per day
    let averageReportsPerDay = 0
    if (firstReport && totalReports > 0) {
      const daysSinceFirstReport = Math.max(
        1,
        Math.ceil((now.getTime() - firstReport.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      )
      averageReportsPerDay = totalReports / daysSinceFirstReport
    }

    // Get active users count
    const activeCaregiversCount = await prisma.caregiverProfile.count({
      where: {
        careReports: {
          some: {},
        },
      },
    })

    const activeClientsCount = await prisma.clientProfile.count({
      where: {
        careReports: {
          some: {},
        },
      },
    })

    const activeUsers = activeCaregiversCount + activeClientsCount

    // Get top caregivers
    const topCaregiversData = await prisma.caregiverProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
        _count: {
          select: {
            careReports: true,
          },
        },
      },
      orderBy: {
        careReports: {
          _count: "desc",
        },
      },
      take: 5,
    })

    const topCaregivers = topCaregiversData
      .filter((c) => c._count.careReports > 0)
      .map((c) => ({
        name: c.name,
        email: c.user.email,
        reportCount: c._count.careReports,
      }))

    // Get top clients
    const topClientsData = await prisma.clientProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
        _count: {
          select: {
            careReports: true,
          },
        },
      },
      orderBy: {
        careReports: {
          _count: "desc",
        },
      },
      take: 5,
    })

    const topClients = topClientsData
      .filter((c) => c._count.careReports > 0)
      .map((c) => ({
        name: c.name,
        email: c.user.email,
        reportCount: c._count.careReports,
      }))

    return NextResponse.json({
      totalReports,
      reportsToday,
      reportsThisWeek,
      reportsThisMonth,
      averageReportsPerDay,
      activeUsers,
      activeCaregivers: activeCaregiversCount,
      activeClients: activeClientsCount,
      topCaregivers,
      topClients,
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
