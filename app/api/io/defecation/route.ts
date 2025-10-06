import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch defecation records for a specific date
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const dateStr = searchParams.get("date") // YYYY-MM-DD format

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: {
            clientRelationships: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Determine target client
    let targetClientId = clientId

    if (user.role === "CLIENT") {
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }
      targetClientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }

      const hasRelationship = user.caregiverProfile?.clientRelationships.some(
        (rel) => rel.clientId === clientId && rel.status === "ACTIVE"
      )

      if (!hasRelationship) {
        return NextResponse.json(
          { error: "Geen toegang tot deze cliënt" },
          { status: 403 }
        )
      }
    } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    // Parse date
    let targetDate: Date
    if (dateStr) {
      const [year, month, day] = dateStr.split("-").map(Number)
      targetDate = new Date(year, month - 1, day)
    } else {
      targetDate = new Date()
    }

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const records = await prisma.defecationRecord.findMany({
      where: {
        clientId: targetClientId!,
        recordDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: { recordTime: "asc" },
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error("Fetch defecation records error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST - Create defecation record
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { clientId, recordDate, recordTime, amount, consistency, notes } = body

    if (!recordDate || !recordTime) {
      return NextResponse.json(
        { error: "recordDate en recordTime zijn verplicht" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: {
          include: {
            clientRelationships: true,
          },
        },
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Only caregivers can add I&O records
    if (user.role !== "CAREGIVER" || !user.caregiverProfile) {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen I&O registraties toevoegen" },
        { status: 403 }
      )
    }

    if (!clientId) {
      return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
    }

    // Check if caregiver has relationship with this client
    const hasRelationship = user.caregiverProfile.clientRelationships.some(
      (rel) => rel.clientId === clientId && rel.status === "ACTIVE"
    )

    if (!hasRelationship) {
      return NextResponse.json(
        { error: "Geen toegang tot deze cliënt" },
        { status: 403 }
      )
    }

    const targetClientId = clientId
    const targetCaregiverId = user.caregiverProfile.id

    const record = await prisma.defecationRecord.create({
      data: {
        clientId: targetClientId!,
        caregiverId: targetCaregiverId,
        recordDate: new Date(recordDate),
        recordTime: new Date(recordTime),
        amount: amount || null,
        consistency: consistency || null,
        notes: notes || null,
      },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error("Create defecation record error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// DELETE - Delete defecation record
export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get("id")

    if (!recordId) {
      return NextResponse.json(
        { error: "Record ID vereist" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Get the record
    const record = await prisma.defecationRecord.findUnique({
      where: { id: recordId },
    })

    if (!record) {
      return NextResponse.json({ error: "Record niet gevonden" }, { status: 404 })
    }

    // Check if user has permission to delete
    if (user.role === "CAREGIVER") {
      if (!user.caregiverProfile || user.caregiverProfile.id !== record.caregiverId) {
        return NextResponse.json(
          { error: "Geen toegang tot dit record" },
          { status: 403 }
        )
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    await prisma.defecationRecord.delete({
      where: { id: recordId },
    })

    return NextResponse.json({ message: "Record verwijderd" })
  } catch (error) {
    console.error("Delete defecation record error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
