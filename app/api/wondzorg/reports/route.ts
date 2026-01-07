import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch wound care reports
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
    const woundCarePlanId = searchParams.get("woundCarePlanId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

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

    // Determine which client's wound care reports to fetch
    let targetClientId = clientId

    if (user.role === "CLIENT") {
      // Clients can only see their own wound care reports
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

    // Build where clause
    const whereClause: any = {
      clientId: targetClientId!,
    }

    if (woundCarePlanId) {
      whereClause.woundCarePlanId = woundCarePlanId
    }

    if (startDate || endDate) {
      whereClause.reportDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        whereClause.reportDate.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        whereClause.reportDate.lte = end
      }
    }

    const woundCareReports = await prisma.woundCareReport.findMany({
      where: whereClause,
      include: {
        caregiver: {
          select: {
            name: true,
          },
        },
        woundCarePlan: {
          select: {
            location: true,
            woundType: true,
          },
        },
      },
      orderBy: [
        { reportDate: "desc" },
        { reportTime: "desc" },
      ],
    })

    return NextResponse.json(woundCareReports)
  } catch (error) {
    console.error("Fetch wound care reports error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST - Create new wound care report
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
      woundCarePlanId,
      clientId,
      reportDate,
      reportTime,
      cleaningPerformed,
      productsUsed,
      woundColor,
      woundOdor,
      exudateAmount,
      painLevel,
      sizeChange,
      edgeCondition,
      skinCondition,
      clientPain,
      clientComfort,
      clientAnxiety,
      complications,
      evaluation,
      generalNotes,
      photo,
      photoDate,
      nextCareDate,
    } = body

    // Validate required fields
    if (!woundCarePlanId || !reportDate || !reportTime || !cleaningPerformed || !productsUsed || !evaluation) {
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

    // Verify the wound care plan exists
    const woundCarePlan = await prisma.woundCarePlan.findUnique({
      where: { id: woundCarePlanId },
    })

    if (!woundCarePlan) {
      return NextResponse.json({ error: "Wondzorgplan niet gevonden" }, { status: 404 })
    }

    // Determine the target client and caregiver
    let targetClientId = clientId || woundCarePlan.clientId
    let caregiverId: string

    if (user.role === "CLIENT") {
      return NextResponse.json(
        { error: "Cliënten kunnen geen wondrapportages aanmaken" },
        { status: 403 }
      )
    } else if (user.role === "CAREGIVER") {
      if (!user.caregiverProfile) {
        return NextResponse.json({ error: "Geen zorgverlener profiel" }, { status: 403 })
      }

      const hasRelationship = user.caregiverProfile.clientRelationships.some(
        (rel) => rel.clientId === targetClientId && rel.status === "ACTIVE"
      )

      if (!hasRelationship) {
        return NextResponse.json(
          { error: "Geen toegang tot deze cliënt" },
          { status: 403 }
        )
      }

      caregiverId = user.caregiverProfile.id
    } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      if (!clientId) {
        return NextResponse.json({ error: "clientId vereist voor admins" }, { status: 400 })
      }
      // For admins, we need a caregiverId to be provided or use a system ID
      // For now, we'll require it to be provided
      return NextResponse.json(
        { error: "Admins moeten een caregiverId opgeven" },
        { status: 400 }
      )
    } else {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 })
    }

    const woundCareReport = await prisma.woundCareReport.create({
      data: {
        woundCarePlanId,
        clientId: targetClientId,
        caregiverId: caregiverId!,
        reportDate: new Date(reportDate),
        reportTime: new Date(reportTime),
        cleaningPerformed,
        productsUsed,
        woundColor: woundColor || null,
        woundOdor: woundOdor || null,
        exudateAmount: exudateAmount || null,
        painLevel: painLevel || null,
        sizeChange: sizeChange || null,
        edgeCondition: edgeCondition || null,
        skinCondition: skinCondition || null,
        clientPain: clientPain || null,
        clientComfort: clientComfort || null,
        clientAnxiety: clientAnxiety || null,
        complications: complications || null,
        evaluation,
        generalNotes: generalNotes || null,
        photo: photo && photo.trim() ? photo.trim() : null,
        photoDate: photoDate ? new Date(photoDate) : null,
        nextCareDate: nextCareDate ? new Date(nextCareDate) : null,
      },
      include: {
        caregiver: {
          select: {
            name: true,
          },
        },
        woundCarePlan: {
          select: {
            location: true,
            woundType: true,
          },
        },
      },
    })

    return NextResponse.json(woundCareReport)
  } catch (error) {
    console.error("Create wound care report error:", error)
    console.error("Error details:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// PUT - Update wound care report
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
      reportDate,
      reportTime,
      cleaningPerformed,
      productsUsed,
      woundColor,
      woundOdor,
      exudateAmount,
      painLevel,
      sizeChange,
      edgeCondition,
      skinCondition,
      clientPain,
      clientComfort,
      clientAnxiety,
      complications,
      evaluation,
      generalNotes,
      photo,
      photoDate,
      nextCareDate,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Wondrapportage ID vereist" },
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

    // Get the wound care report to check ownership
    const woundCareReport = await prisma.woundCareReport.findUnique({
      where: { id },
    })

    if (!woundCareReport) {
      return NextResponse.json({ error: "Wondrapportage niet gevonden" }, { status: 404 })
    }

    // Check permissions
    if (user.role === "CLIENT") {
      return NextResponse.json(
        { error: "Cliënten kunnen wondrapportages niet bewerken" },
        { status: 403 }
      )
    } else if (user.role === "CAREGIVER") {
      // Caregivers can only edit their own reports
      if (!user.caregiverProfile || user.caregiverProfile.id !== woundCareReport.caregiverId) {
        return NextResponse.json(
          { error: "U kunt alleen uw eigen wondrapportages bewerken" },
          { status: 403 }
        )
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Geen toegang" },
        { status: 403 }
      )
    }

    // Update the wound care report
    const updatedWoundCareReport = await prisma.woundCareReport.update({
      where: { id },
      data: {
        ...(reportDate && { reportDate: new Date(reportDate) }),
        ...(reportTime && { reportTime: new Date(reportTime) }),
        ...(cleaningPerformed && { cleaningPerformed }),
        ...(productsUsed && { productsUsed }),
        woundColor: woundColor !== undefined ? woundColor || null : undefined,
        woundOdor: woundOdor !== undefined ? woundOdor || null : undefined,
        exudateAmount: exudateAmount !== undefined ? exudateAmount || null : undefined,
        painLevel: painLevel !== undefined ? painLevel || null : undefined,
        sizeChange: sizeChange !== undefined ? sizeChange || null : undefined,
        edgeCondition: edgeCondition !== undefined ? edgeCondition || null : undefined,
        skinCondition: skinCondition !== undefined ? skinCondition || null : undefined,
        clientPain: clientPain !== undefined ? clientPain || null : undefined,
        clientComfort: clientComfort !== undefined ? clientComfort || null : undefined,
        clientAnxiety: clientAnxiety !== undefined ? clientAnxiety || null : undefined,
        complications: complications !== undefined ? complications || null : undefined,
        ...(evaluation && { evaluation }),
        generalNotes: generalNotes !== undefined ? generalNotes || null : undefined,
        photo: photo !== undefined ? (photo && photo.trim() ? photo.trim() : null) : undefined,
        photoDate: photoDate !== undefined ? (photoDate ? new Date(photoDate) : null) : undefined,
        nextCareDate: nextCareDate !== undefined ? (nextCareDate ? new Date(nextCareDate) : null) : undefined,
      },
      include: {
        caregiver: {
          select: {
            name: true,
          },
        },
        woundCarePlan: {
          select: {
            location: true,
            woundType: true,
          },
        },
      },
    })

    return NextResponse.json(updatedWoundCareReport)
  } catch (error) {
    console.error("Update wound care report error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a wound care report
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
    const reportId = searchParams.get("id")

    if (!reportId) {
      return NextResponse.json(
        { error: "Wondrapportage ID vereist" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
        caregiverProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    // Get the wound care report to check ownership
    const woundCareReport = await prisma.woundCareReport.findUnique({
      where: { id: reportId },
    })

    if (!woundCareReport) {
      return NextResponse.json({ error: "Wondrapportage niet gevonden" }, { status: 404 })
    }

    // Check permissions
    if (user.role === "CLIENT") {
      return NextResponse.json(
        { error: "Cliënten kunnen wondrapportages niet verwijderen" },
        { status: 403 }
      )
    } else if (user.role === "CAREGIVER") {
      // Caregivers can only delete their own reports
      if (!user.caregiverProfile || user.caregiverProfile.id !== woundCareReport.caregiverId) {
        return NextResponse.json(
          { error: "U kunt alleen uw eigen wondrapportages verwijderen" },
          { status: 403 }
        )
      }
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Geen toegang" },
        { status: 403 }
      )
    }

    // Delete the wound care report
    await prisma.woundCareReport.delete({
      where: { id: reportId },
    })

    return NextResponse.json({
      message: "Wondrapportage succesvol verwijderd"
    })
  } catch (error) {
    console.error("Delete wound care report error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
