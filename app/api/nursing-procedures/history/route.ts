import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch execution history for a procedure
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const procedureId = searchParams.get("procedureId")

    if (!procedureId) {
      return NextResponse.json({ error: "procedureId is verplicht" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: { clientRelationships: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Fetch the procedure to check access
    const procedure = await prisma.nursingProcedure.findUnique({
      where: { id: procedureId },
    })

    if (!procedure) {
      return NextResponse.json({ error: "Handeling niet gevonden" }, { status: 404 })
    }

    // Auth check
    if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== procedure.clientId) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
      }
    } else if (user.role === "CAREGIVER") {
      const hasRelationship = user.caregiverProfile?.clientRelationships.some(
        (rel) => rel.clientId === procedure.clientId && rel.status === "ACTIVE"
      )
      if (!hasRelationship) {
        return NextResponse.json({ error: "Geen toegang tot deze cliënt" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const logs = await prisma.nursingProcedureLog.findMany({
      where: { procedureId },
      include: {
        caregiver: {
          select: { id: true, name: true },
        },
      },
      orderBy: { performedAt: "desc" },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching procedure history:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
