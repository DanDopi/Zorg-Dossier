import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { validateFileSize } from "@/lib/fileValidation"
import { Prisma } from "@prisma/client"

// GET /api/reports - Get reports (filtered by role)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("client")

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
        clientProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      )
    }

    type CareReportWithRelations = Prisma.CareReportGetPayload<{
      include: {
        client: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
        caregiver: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    }>

    let reports: CareReportWithRelations[] = []

    if (user.role === "CAREGIVER" && user.caregiverProfile) {
      // Caregiver can see ALL reports for their active clients (from all caregivers)
      // First, get all active client IDs
      const activeRelationships = await prisma.caregiverClientRelationship.findMany({
        where: {
          caregiverId: user.caregiverProfile.id,
          status: "ACTIVE",
        },
        select: {
          clientId: true,
        },
      })

      const activeClientIds = activeRelationships.map(rel => rel.clientId)

      const where: Prisma.CareReportWhereInput = {
        clientId: {
          in: activeClientIds,
        },
      }

      if (clientId) {
        // If specific client requested, verify it's an active client
        if (activeClientIds.includes(clientId)) {
          where.clientId = clientId
        } else {
          return NextResponse.json(
            { error: "Geen toegang tot deze cliënt" },
            { status: 403 }
          )
        }
      }

      reports = await prisma.careReport.findMany({
        where,
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
        },
        orderBy: {
          reportDate: "desc",
        },
      })
    } else if (user.role === "CLIENT" && user.clientProfile) {
      // Client can see reports about them
      reports = await prisma.careReport.findMany({
        where: {
          clientId: user.clientProfile.id,
        },
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
        },
        orderBy: {
          reportDate: "desc",
        },
      })
    } else {
      return NextResponse.json(
        { error: "Niet geautoriseerd om rapporten te bekijken" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { reports },
      { status: 200 }
    )
  } catch (error) {
    console.error("Get reports error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      )
    }

    // Only caregivers can create reports
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { caregiverProfile: true },
    })

    if (!user || user.role !== "CAREGIVER" || !user.caregiverProfile) {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen rapporten maken" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const clientId = formData.get("clientId") as string
    const reportDate = formData.get("reportDate") as string
    const content = formData.get("content") as string

    // Validate required fields
    if (!clientId || !reportDate || !content) {
      return NextResponse.json(
        { error: "Alle velden zijn verplicht" },
        { status: 400 }
      )
    }

    // Verify client exists and relationship is active
    const relationship = await prisma.caregiverClientRelationship.findUnique({
      where: {
        caregiverId_clientId: {
          caregiverId: user.caregiverProfile.id,
          clientId: clientId,
        },
      },
    })

    if (!relationship) {
      return NextResponse.json(
        { error: "U heeft geen actieve relatie met deze cliënt" },
        { status: 403 }
      )
    }

    // Handle images (max 3, 5MB each)
    const images: { data: Buffer; mimeType: string; fileName: string; fileSize: number }[] = []

    for (let i = 0; i < 3; i++) {
      const image = formData.get(`image${i}`) as File | null
      if (image) {
        // Check file size
        const validation = await validateFileSize(image.size)
        if (!validation.isValid) {
          return NextResponse.json(
            { error: `Afbeelding ${i + 1}: ${validation.error}` },
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

    // Create report with images
    const report = await prisma.careReport.create({
      data: {
        clientId,
        caregiverId: user.caregiverProfile.id,
        reportDate: new Date(reportDate),
        content,
        images: {
          create: images.map((img) => ({
            imageData: img.data,
            mimeType: img.mimeType,
            fileName: img.fileName,
            fileSize: img.fileSize,
          })),
        },
      },
      include: {
        images: true,
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
      { message: "Rapport succesvol aangemaakt", report },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create report error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van het rapport" },
      { status: 500 }
    )
  }
}
