import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/reports/[id] - Get a single report
export async function GET(
  request: NextRequest,
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

    const { id: reportId } = await params

    const report = await prisma.careReport.findUnique({
      where: { id: reportId },
      include: {
        client: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        images: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: "Rapport niet gevonden" },
        { status: 404 }
      )
    }

    // Authorization: Client or any caregiver with active relationship to the client can view
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
        clientProfile: true,
      },
    })

    let isAuthorized = false
    let canEdit = false

    if (user?.clientProfile?.id === report.clientId) {
      // Client can view reports about them
      isAuthorized = true
      canEdit = false
    } else if (user?.caregiverProfile) {
      // Check if caregiver has active relationship with this client
      const activeRelationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId: user.caregiverProfile.id,
          clientId: report.clientId,
          status: "ACTIVE",
        },
      })

      if (activeRelationship) {
        isAuthorized = true
        // Only the original author can edit
        canEdit = user.caregiverProfile.id === report.caregiverId
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot dit rapport" },
        { status: 403 }
      )
    }

    // Add flags to help client determine permissions
    const viewerRole = user?.caregiverProfile ? "CAREGIVER" : "CLIENT"

    return NextResponse.json(
      { report, canEdit, viewerRole },
      { status: 200 }
    )
  } catch (error) {
    console.error("Get report error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// PUT /api/reports/[id] - Update a report
export async function PUT(
  request: NextRequest,
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

    const { id: reportId } = await params

    // Get current report
    const existingReport = await prisma.careReport.findUnique({
      where: { id: reportId },
      include: {
        caregiver: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: "Rapport niet gevonden" },
        { status: 404 }
      )
    }

    // Only the caregiver who created it can edit
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { caregiverProfile: true },
    })

    if (user?.caregiverProfile?.id !== existingReport.caregiverId) {
      return NextResponse.json(
        { error: "U kunt alleen uw eigen rapporten bewerken" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const content = formData.get("content") as string
    const reportDate = formData.get("reportDate") as string

    if (!content || !reportDate) {
      return NextResponse.json(
        { error: "Inhoud en datum zijn verplicht" },
        { status: 400 }
      )
    }

    // Handle images (max 3, 5MB each)
    const images: { data: Buffer; mimeType: string; fileName: string; fileSize: number }[] = []

    for (let i = 0; i < 3; i++) {
      const image = formData.get(`image${i}`) as File | null
      if (image) {
        // Check file size (5MB)
        if (image.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: `Afbeelding ${i + 1} is te groot (max 5MB)` },
            { status: 400 }
          )
        }

        // Check file type
        if (!image.type.startsWith("image/")) {
          return NextResponse.json(
            { error: `Bestand ${i + 1} is geen afbeelding` },
            { status: 400 }
          )
        }

        const arrayBuffer = await image.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        images.push({
          data: buffer,
          mimeType: image.type,
          fileName: image.name,
          fileSize: image.size,
        })
      }
    }

    // Check if new images were uploaded
    const deleteExistingImages = formData.get("deleteExistingImages") === "true"

    // Update report
    const updatedReport = await prisma.careReport.update({
      where: { id: reportId },
      data: {
        content,
        reportDate: new Date(reportDate),
        updatedAt: new Date(),
        // Delete existing images if new ones are uploaded or if explicitly requested
        ...(deleteExistingImages && {
          images: {
            deleteMany: {},
          },
        }),
        // Add new images
        ...(images.length > 0 && {
          images: {
            ...(deleteExistingImages && { deleteMany: {} }),
            create: images.map((img) => ({
              imageData: img.data,
              mimeType: img.mimeType,
              fileName: img.fileName,
              fileSize: img.fileSize,
            })),
          },
        }),
      },
      include: {
        images: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        client: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
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

    return NextResponse.json(
      { message: "Rapport succesvol bijgewerkt", report: updatedReport },
      { status: 200 }
    )
  } catch (error) {
    console.error("Update report error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van het rapport" },
      { status: 500 }
    )
  }
}
