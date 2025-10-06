import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/reports/images/[id] - Get an image from a report
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

    const { id: imageId } = await params

    // Get image with report information
    const image = await prisma.careReportImage.findUnique({
      where: { id: imageId },
      include: {
        report: {
          select: {
            caregiverId: true,
            clientId: true,
          },
        },
      },
    })

    if (!image) {
      return NextResponse.json(
        { error: "Afbeelding niet gevonden" },
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

    if (user?.clientProfile?.id === image.report.clientId) {
      // Client can view images in reports about them
      isAuthorized = true
    } else if (user?.caregiverProfile) {
      // Check if caregiver has active relationship with this client
      const activeRelationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId: user.caregiverProfile.id,
          clientId: image.report.clientId,
          status: "ACTIVE",
        },
      })

      if (activeRelationship) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze afbeelding" },
        { status: 403 }
      )
    }

    // Return image as binary data
    return new NextResponse(Buffer.from(image.imageData), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Content-Disposition": `inline; filename="${image.fileName}"`,
        "Cache-Control": "private, max-age=31536000",
      },
    })
  } catch (error) {
    console.error("Get image error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
