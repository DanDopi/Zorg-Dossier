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

    // Fetch all statistics
    const [totalUsers, totalClients, totalCaregivers, totalReports] = await Promise.all([
      prisma.user.count(),
      prisma.clientProfile.count(),
      prisma.caregiverProfile.count(),
      prisma.careReport.count(),
    ])

    return NextResponse.json({
      totalUsers,
      totalClients,
      totalCaregivers,
      totalReports,
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
