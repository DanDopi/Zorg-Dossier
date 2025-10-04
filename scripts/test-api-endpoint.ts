import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

async function testAPI() {
  try {
    console.log("Testing API endpoint logic...")

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    console.log("\n1. Testing basic counts...")
    const totalReports = await prisma.careReport.count()
    console.log(`Total reports: ${totalReports}`)

    console.log("\n2. Testing active caregivers count...")
    const activeCaregiversCount = await prisma.caregiverProfile.count({
      where: {
        careReports: {
          some: {},
        },
      },
    })
    console.log(`Active caregivers: ${activeCaregiversCount}`)

    console.log("\n3. Testing active clients count...")
    const activeClientsCount = await prisma.clientProfile.count({
      where: {
        careReports: {
          some: {},
        },
      },
    })
    console.log(`Active clients: ${activeClientsCount}`)

    console.log("\n4. Testing top caregivers query...")
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
    console.log(`Top caregivers: ${JSON.stringify(topCaregiversData, null, 2)}`)

    console.log("\n5. Testing top clients query...")
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
    console.log(`Top clients: ${JSON.stringify(topClientsData, null, 2)}`)

    console.log("\n✅ All queries successful!")

  } catch (error) {
    console.error("\n❌ ERROR:", error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPI()
