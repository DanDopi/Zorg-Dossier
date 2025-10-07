import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function testStatsAPI() {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    console.log("Testing stats API logic...")

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

    console.log("Basic counts OK")
    console.log(`Total: ${totalReports}, Today: ${reportsToday}, Week: ${reportsThisWeek}, Month: ${reportsThisMonth}`)

    // Calculate average reports per day
    let averageReportsPerDay = 0
    if (firstReport && totalReports > 0) {
      const daysSinceFirstReport = Math.max(
        1,
        Math.ceil((now.getTime() - firstReport.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      )
      averageReportsPerDay = totalReports / daysSinceFirstReport
    }

    console.log(`Average: ${averageReportsPerDay}`)

    // Get active users count
    console.log("Fetching active caregivers...")
    const activeCaregiversCount = await prisma.caregiverProfile.count({
      where: {
        careReports: {
          some: {},
        },
      },
    })

    console.log(`Active caregivers: ${activeCaregiversCount}`)

    console.log("Fetching active clients...")
    const activeClientsCount = await prisma.clientProfile.count({
      where: {
        careReports: {
          some: {},
        },
      },
    })

    console.log(`Active clients: ${activeClientsCount}`)

    const activeUsers = activeCaregiversCount + activeClientsCount

    // Get top caregivers
    console.log("Fetching top caregivers...")
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

    console.log(`Found ${topCaregiversData.length} caregivers`)

    const topCaregivers = topCaregiversData
      .filter((c) => c._count.careReports > 0)
      .map((c) => ({
        name: c.name,
        email: c.user.email,
        reportCount: c._count.careReports,
      }))

    // Get top clients
    console.log("Fetching top clients...")
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

    console.log(`Found ${topClientsData.length} clients`)

    const topClients = topClientsData
      .filter((c) => c._count.careReports > 0)
      .map((c) => ({
        name: c.name,
        email: c.user.email,
        reportCount: c._count.careReports,
      }))

    const result = {
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
    }

    console.log("\n✅ SUCCESS! Result:")
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("\n❌ ERROR:", error)
  } finally {
    await prisma.$disconnect()
  }
}

testStatsAPI()
