import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST - Caregiver (or client) signs off a procedure execution
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
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

    const body = await request.json()
    const { procedureId, performedAt, notes } = body

    if (!procedureId || !performedAt) {
      return NextResponse.json({ error: "procedureId en performedAt zijn verplicht" }, { status: 400 })
    }

    // Fetch the procedure
    const procedure = await prisma.nursingProcedure.findUnique({
      where: { id: procedureId },
    })

    if (!procedure || !procedure.isActive) {
      return NextResponse.json({ error: "Handeling niet gevonden" }, { status: 404 })
    }

    // Auth check: caregiver must have relationship with client, or user is the client
    let caregiverProfileId: string

    if (user.role === "CAREGIVER") {
      if (!user.caregiverProfile) {
        return NextResponse.json({ error: "Geen zorgverlener profiel" }, { status: 403 })
      }
      const hasRelationship = user.caregiverProfile.clientRelationships.some(
        (rel) => rel.clientId === procedure.clientId && rel.status === "ACTIVE"
      )
      if (!hasRelationship) {
        return NextResponse.json({ error: "Geen toegang tot deze cliënt" }, { status: 403 })
      }
      caregiverProfileId = user.caregiverProfile.id
    } else if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== procedure.clientId) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
      }
      // For client sign-off, we still need a caregiver ID - use assigned caregiver or require it
      if (!procedure.assignedCaregiverId) {
        return NextResponse.json({ error: "Geen zorgverlener toegewezen" }, { status: 400 })
      }
      caregiverProfileId = procedure.assignedCaregiverId
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const performedDate = new Date(performedAt)

    // Create log and update nextDueDate in a transaction
    const [log] = await prisma.$transaction([
      prisma.nursingProcedureLog.create({
        data: {
          procedureId: procedure.id,
          clientId: procedure.clientId,
          performedBy: caregiverProfileId,
          performedAt: performedDate,
          notes: notes || null,
        },
        include: {
          caregiver: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.nursingProcedure.update({
        where: { id: procedure.id },
        data: {
          nextDueDate: new Date(
            performedDate.getTime() + procedure.frequencyDays * 24 * 60 * 60 * 1000
          ),
        },
      }),
    ])

    return NextResponse.json(log)
  } catch (error) {
    console.error("Error performing nursing procedure:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 })
  }
}
