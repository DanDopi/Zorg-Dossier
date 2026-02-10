import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/scheduling/shifts/pending-corrections
// Returns shifts with PENDING time corrections for the authenticated client
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user?.clientProfile || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Alleen clients hebben toegang" },
        { status: 403 }
      )
    }

    const shifts = await prisma.shift.findMany({
      where: {
        clientId: user.clientProfile.id,
        timeCorrectionStatus: "PENDING",
      },
      include: {
        shiftType: true,
        caregiver: true,
      },
      orderBy: { timeCorrectionAt: "desc" },
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error("Error fetching pending corrections:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
