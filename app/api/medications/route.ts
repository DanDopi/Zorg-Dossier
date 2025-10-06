import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch medications for a client
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

    // Determine which client's medications to fetch
    let targetClientId = clientId

    if (user.role === "CLIENT") {
      // Clients can only see their own medications
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }
      targetClientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER") {
      // Caregivers need a clientId and must have a relationship
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
      // Admins need clientId
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const medications = await prisma.medication.findMany({
      where: {
        clientId: targetClientId!,
        isActive: true,
      },
      orderBy: [
        { startDate: "desc" },
        { name: "asc" },
      ],
    })

    return NextResponse.json(medications)
  } catch (error) {
    console.error("Fetch medications error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST - Create new medication
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
    const { clientId, name, dosage, unit, frequency, instructions, times, startDate, endDate, imageUrl } = body

    if (!name || !dosage || !unit || !frequency || !times || !Array.isArray(times)) {
      return NextResponse.json(
        { error: "Verplichte velden ontbreken" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Determine the target client
    let targetClientId = clientId

    if (user.role === "CLIENT") {
      // Clients can only add medications for themselves
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }
      targetClientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER") {
      // Caregivers cannot create medications, only clients
      return NextResponse.json(
        { error: "Alleen cliënten kunnen medicatie toevoegen" },
        { status: 403 }
      )
    } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const medication = await prisma.medication.create({
      data: {
        clientId: targetClientId!,
        name,
        dosage,
        unit,
        frequency,
        instructions: instructions || null,
        times: JSON.stringify(times),
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : null,
        createdBy: user.id,
      },
    })

    return NextResponse.json(medication)
  } catch (error) {
    console.error("Create medication error:", error)
    console.error("Error details:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// PUT - Update medication
export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, dosage, unit, frequency, instructions, times, startDate, endDate, imageUrl } = body

    if (!id) {
      return NextResponse.json(
        { error: "Medicatie ID vereist" },
        { status: 400 }
      )
    }

    if (!name || !dosage || !unit || !frequency || !times || !Array.isArray(times)) {
      return NextResponse.json(
        { error: "Verplichte velden ontbreken" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Get the medication to check ownership
    const medication = await prisma.medication.findUnique({
      where: { id },
    })

    if (!medication) {
      return NextResponse.json({ error: "Medicatie niet gevonden" }, { status: 404 })
    }

    // Check permissions
    if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== medication.clientId) {
        return NextResponse.json(
          { error: "Geen toegang tot deze medicatie" },
          { status: 403 }
        )
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen medicatie bewerken" },
        { status: 403 }
      )
    }

    // Update the medication
    const updatedMedication = await prisma.medication.update({
      where: { id },
      data: {
        name,
        dosage,
        unit,
        frequency,
        instructions: instructions || null,
        times: JSON.stringify(times),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : null,
      },
    })

    return NextResponse.json(updatedMedication)
  } catch (error) {
    console.error("Update medication error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// DELETE - Deactivate a medication
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
    const medicationId = searchParams.get("id")

    if (!medicationId) {
      return NextResponse.json(
        { error: "Medicatie ID vereist" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Get the medication to check ownership
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    })

    if (!medication) {
      return NextResponse.json({ error: "Medicatie niet gevonden" }, { status: 404 })
    }

    // Check permissions
    if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== medication.clientId) {
        return NextResponse.json(
          { error: "Geen toegang tot deze medicatie" },
          { status: 403 }
        )
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Alleen cliënten kunnen medicatie verwijderen" },
        { status: 403 }
      )
    }

    // Soft delete by setting isActive to false
    const updatedMedication = await prisma.medication.update({
      where: { id: medicationId },
      data: {
        isActive: false,
        endDate: new Date(), // Set end date to now
      },
    })

    return NextResponse.json({
      message: "Medicatie succesvol verwijderd",
      medication: updatedMedication
    })
  } catch (error) {
    console.error("Delete medication error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
