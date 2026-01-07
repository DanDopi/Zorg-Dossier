import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch wound care plans for a client
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
    const includeInactive = searchParams.get("includeInactive") === "true"

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

    // Determine which client's wound care plans to fetch
    let targetClientId = clientId

    if (user.role === "CLIENT") {
      // Clients can only see their own wound care plans
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

    const woundCarePlans = await prisma.woundCarePlan.findMany({
      where: {
        clientId: targetClientId!,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        reports: {
          orderBy: {
            reportDate: "desc",
          },
          take: 1, // Include most recent report
        },
      },
      orderBy: [
        { isActive: "desc" },
        { startDate: "desc" },
      ],
    })

    return NextResponse.json(woundCarePlans)
  } catch (error) {
    console.error("Fetch wound care plans error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST - Create new wound care plan
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
    const {
      clientId,
      dateOfOnset,
      cause,
      location,
      woundType,
      length,
      width,
      depth,
      woundEdges,
      woundBed,
      exudate,
      surroundingSkin,
      initialPhoto,
      photoDate,
      treatmentGoal,
      products,
      frequency,
      cleaningMethod,
      instructions,
      performedBy,
      evaluationSchedule,
      startDate,
    } = body

    // Validate required fields
    if (!dateOfOnset || !cause || !location || !woundType || !treatmentGoal || !products || !frequency || !cleaningMethod) {
      return NextResponse.json(
        { error: "Verplichte velden ontbreken" },
        { status: 400 }
      )
    }

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

    // Determine the target client
    let targetClientId = clientId

    if (user.role === "CLIENT") {
      // Clients can create wound care plans for themselves
      if (!user.clientProfile) {
        return NextResponse.json({ error: "Geen cliënt profiel" }, { status: 403 })
      }
      targetClientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER") {
      // Caregivers can create wound care plans for their clients
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

    const woundCarePlan = await prisma.woundCarePlan.create({
      data: {
        clientId: targetClientId!,
        dateOfOnset: new Date(dateOfOnset),
        cause,
        location,
        woundType,
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        depth: depth ? parseFloat(depth) : null,
        woundEdges: woundEdges || null,
        woundBed: woundBed || null,
        exudate: exudate || null,
        surroundingSkin: surroundingSkin || null,
        initialPhoto: initialPhoto && initialPhoto.trim() ? initialPhoto.trim() : null,
        photoDate: photoDate ? new Date(photoDate) : null,
        treatmentGoal,
        products,
        frequency,
        cleaningMethod,
        instructions: instructions || null,
        performedBy: performedBy || null,
        evaluationSchedule: evaluationSchedule || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        createdBy: user.id,
      },
    })

    return NextResponse.json(woundCarePlan)
  } catch (error) {
    console.error("Create wound care plan error:", error)
    console.error("Error details:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// PUT - Update wound care plan
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
    const {
      id,
      dateOfOnset,
      cause,
      location,
      woundType,
      length,
      width,
      depth,
      woundEdges,
      woundBed,
      exudate,
      surroundingSkin,
      initialPhoto,
      photoDate,
      treatmentGoal,
      products,
      frequency,
      cleaningMethod,
      instructions,
      performedBy,
      evaluationSchedule,
      isActive,
      endDate,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Wondzorgplan ID vereist" },
        { status: 400 }
      )
    }

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

    // Get the wound care plan to check ownership
    const woundCarePlan = await prisma.woundCarePlan.findUnique({
      where: { id },
    })

    if (!woundCarePlan) {
      return NextResponse.json({ error: "Wondzorgplan niet gevonden" }, { status: 404 })
    }

    // Check permissions
    if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== woundCarePlan.clientId) {
        return NextResponse.json(
          { error: "Geen toegang tot dit wondzorgplan" },
          { status: 403 }
        )
      }
    } else if (user.role === "CAREGIVER") {
      const hasRelationship = user.caregiverProfile?.clientRelationships.some(
        (rel) => rel.clientId === woundCarePlan.clientId && rel.status === "ACTIVE"
      )

      if (!hasRelationship) {
        return NextResponse.json(
          { error: "Geen toegang tot dit wondzorgplan" },
          { status: 403 }
        )
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Geen toegang" },
        { status: 403 }
      )
    }

    // Update the wound care plan
    const updatedWoundCarePlan = await prisma.woundCarePlan.update({
      where: { id },
      data: {
        ...(dateOfOnset && { dateOfOnset: new Date(dateOfOnset) }),
        ...(cause && { cause }),
        ...(location && { location }),
        ...(woundType && { woundType }),
        length: length !== undefined ? (length ? parseFloat(length) : null) : undefined,
        width: width !== undefined ? (width ? parseFloat(width) : null) : undefined,
        depth: depth !== undefined ? (depth ? parseFloat(depth) : null) : undefined,
        woundEdges: woundEdges !== undefined ? woundEdges || null : undefined,
        woundBed: woundBed !== undefined ? woundBed || null : undefined,
        exudate: exudate !== undefined ? exudate || null : undefined,
        surroundingSkin: surroundingSkin !== undefined ? surroundingSkin || null : undefined,
        initialPhoto: initialPhoto !== undefined ? (initialPhoto && initialPhoto.trim() ? initialPhoto.trim() : null) : undefined,
        photoDate: photoDate !== undefined ? (photoDate ? new Date(photoDate) : null) : undefined,
        ...(treatmentGoal && { treatmentGoal }),
        ...(products && { products }),
        ...(frequency && { frequency }),
        ...(cleaningMethod && { cleaningMethod }),
        instructions: instructions !== undefined ? instructions || null : undefined,
        performedBy: performedBy !== undefined ? performedBy || null : undefined,
        evaluationSchedule: evaluationSchedule !== undefined ? evaluationSchedule || null : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      },
    })

    return NextResponse.json(updatedWoundCarePlan)
  } catch (error) {
    console.error("Update wound care plan error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// DELETE - Deactivate a wound care plan
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
    const planId = searchParams.get("id")

    if (!planId) {
      return NextResponse.json(
        { error: "Wondzorgplan ID vereist" },
        { status: 400 }
      )
    }

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

    // Get the wound care plan to check ownership
    const woundCarePlan = await prisma.woundCarePlan.findUnique({
      where: { id: planId },
    })

    if (!woundCarePlan) {
      return NextResponse.json({ error: "Wondzorgplan niet gevonden" }, { status: 404 })
    }

    // Check permissions
    if (user.role === "CLIENT") {
      if (!user.clientProfile || user.clientProfile.id !== woundCarePlan.clientId) {
        return NextResponse.json(
          { error: "Geen toegang tot dit wondzorgplan" },
          { status: 403 }
        )
      }
    } else if (user.role === "CAREGIVER") {
      const hasRelationship = user.caregiverProfile?.clientRelationships.some(
        (rel) => rel.clientId === woundCarePlan.clientId && rel.status === "ACTIVE"
      )

      if (!hasRelationship) {
        return NextResponse.json(
          { error: "Geen toegang tot dit wondzorgplan" },
          { status: 403 }
        )
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Geen toegang" },
        { status: 403 }
      )
    }

    // Soft delete by setting isActive to false
    const updatedWoundCarePlan = await prisma.woundCarePlan.update({
      where: { id: planId },
      data: {
        isActive: false,
        endDate: new Date(), // Set end date to now
      },
    })

    return NextResponse.json({
      message: "Wondzorgplan succesvol afgesloten",
      woundCarePlan: updatedWoundCarePlan
    })
  } catch (error) {
    console.error("Delete wound care plan error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
