import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    const totalReports = await prisma.careReport.count()
    const totalUsers = await prisma.user.count()
    const totalClients = await prisma.clientProfile.count()
    const totalCaregivers = await prisma.caregiverProfile.count()

    console.log("Database Statistics:")
    console.log(`Total Reports: ${totalReports}`)
    console.log(`Total Users: ${totalUsers}`)
    console.log(`Total Clients: ${totalClients}`)
    console.log(`Total Caregivers: ${totalCaregivers}`)

    // Get recent reports
    const recentReports = await prisma.careReport.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    })

    console.log("\nRecent Reports:")
    recentReports.forEach((report) => {
      console.log(`- ${report.content.substring(0, 50)}... (${report.createdAt})`)
    })
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
