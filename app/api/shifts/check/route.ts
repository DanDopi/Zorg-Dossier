import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/shifts/check?clientId=X&date=YYYY-MM-DD
// Returns: { hasShift: boolean }
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const date = searchParams.get("date")

    if (!clientId || !date) {
      return NextResponse.json({ error: "clientId en date zijn verplicht" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { caregiverProfile: true },
    })

    if (!user?.caregiverProfile) {
      return NextResponse.json({ hasShift: false })
    }

    const dateObj = new Date(date + "T12:00:00")
    const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0)
    const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59)

    const shift = await prisma.shift.findFirst({
      where: {
        caregiverId: user.caregiverProfile.id,
        clientId,
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ["FILLED", "COMPLETED"] },
      },
    })

    return NextResponse.json({ hasShift: !!shift })
  } catch (error) {
    console.error("Check shift error:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
