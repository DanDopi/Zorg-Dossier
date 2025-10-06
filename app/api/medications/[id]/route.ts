import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PUT - Update medication
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const medicationId = resolvedParams.id
    const body = await request.json()
    const { name, dosage, unit, frequency, instructions, times, startDate, endDate, isActive } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Check if medication exists and user has access
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    })

    if (!medication) {
      return NextResponse.json({ error: "Medicatie niet gevonden" }, { status: 404 })
    }

    // Only the client or admin can update medications
    if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== medication.clientId) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const updated = await prisma.medication.update({
      where: { id: medicationId },
      data: {
        ...(name && { name }),
        ...(dosage && { dosage }),
        ...(unit && { unit }),
        ...(frequency && { frequency }),
        ...(instructions !== undefined && { instructions }),
        ...(times && { times: JSON.stringify(times) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update medication error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// DELETE - Delete (deactivate) medication
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const medicationId = resolvedParams.id

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Check if medication exists and user has access
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    })

    if (!medication) {
      return NextResponse.json({ error: "Medicatie niet gevonden" }, { status: 404 })
    }

    // Only the client or admin can delete medications
    if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== medication.clientId) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    // Soft delete by setting isActive to false
    const deleted = await prisma.medication.update({
      where: { id: medicationId },
      data: { isActive: false },
    })

    return NextResponse.json(deleted)
  } catch (error) {
    console.error("Delete medication error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
