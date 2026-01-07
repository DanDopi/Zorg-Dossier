import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getTimeOffRequestEmailHtml, getTimeOffApprovedEmailHtml, getTimeOffDeniedEmailHtml } from "@/lib/email"

// GET /api/scheduling/time-off - Get time-off requests
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
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

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const caregiverId = searchParams.get("caregiverId")
    const includeDismissed = searchParams.get("includeDismissed") === "true"
    const recent = searchParams.get("recent")
    const status = searchParams.get("status")
    const requestType = searchParams.get("requestType")

    const where: {
      clientId?: string
      caregiverId?: string
      reviewedAt?: {
        gte: Date
      }
      status?: string | {
        in: string[]
      }
      requestType?: string
    } = {}

    if (user.role === "CLIENT" && user.clientProfile) {
      where.clientId = user.clientProfile.id
    } else if (user.role === "CAREGIVER" && user.caregiverProfile) {
      where.caregiverId = user.caregiverProfile.id
    } else if (clientId) {
      where.clientId = clientId
    } else if (caregiverId) {
      where.caregiverId = caregiverId
    }

    // If status parameter is provided, filter by status
    if (status && !recent) {
      where.status = status
    }

    // If requestType parameter is provided, filter by request type
    if (requestType) {
      where.requestType = requestType
    }

    // If recent parameter is provided, filter by reviewedAt date
    if (recent) {
      const daysAgo = parseInt(recent, 10)
      if (!isNaN(daysAgo)) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

        where.reviewedAt = {
          gte: cutoffDate,
        }
        // Only show approved/denied requests for recent notifications
        // But if a specific status was provided in the URL, use that instead
        if (status) {
          where.status = status
        } else {
          where.status = {
            in: ["APPROVED", "DENIED"]
          }
        }
      }
    }

    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where,
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Filter out dismissed notifications unless explicitly requested
    if (!includeDismissed) {
      const dismissedIds = await prisma.dismissedNotification.findMany({
        where: {
          userId: session.user.id,
          timeOffRequestId: {
            in: timeOffRequests.map(r => r.id),
          },
        },
        select: {
          timeOffRequestId: true,
        },
      })

      const dismissedIdSet = new Set(dismissedIds.map(d => d.timeOffRequestId))
      const filteredRequests = timeOffRequests.filter(
        req => !dismissedIdSet.has(req.id)
      )

      return NextResponse.json(filteredRequests)
    }

    return NextResponse.json(timeOffRequests)
  } catch (error) {
    console.error("Error fetching time-off requests:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van verlofaanvragen" },
      { status: 500 }
    )
  }
}

// POST /api/scheduling/time-off - Create a new time-off request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
      },
    })

    if (!user?.caregiverProfile || user.role !== "CAREGIVER") {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen verlof aanvragen" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientIds, requestType, startDate, endDate, reason, isEmergency } = body

    // Validate input
    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: "Selecteer minimaal één client" },
        { status: 400 }
      )
    }

    if (!requestType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Type, start- en einddatum zijn verplicht" },
        { status: 400 }
      )
    }

    // Generate a group ID to link all requests
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Verify active relationships for all selected clients
    const relationships = await prisma.caregiverClientRelationship.findMany({
      where: {
        caregiverId: user.caregiverProfile.id,
        clientId: { in: clientIds },
        status: "ACTIVE",
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                email: true,
                emailVerified: true,
              },
            },
          },
        },
      },
    })

    if (relationships.length !== clientIds.length) {
      return NextResponse.json(
        { error: "Geen actieve relatie met één of meer geselecteerde clients" },
        { status: 400 }
      )
    }

    // Determine initial status
    const initialStatus = (isEmergency && requestType === "SICK_LEAVE")
      ? "APPROVED"
      : "PENDING"

    // Create one TimeOffRequest for each selected client
    const timeOffRequests = await Promise.all(
      clientIds.map((clientId) =>
        prisma.timeOffRequest.create({
          data: {
            caregiverId: user.caregiverProfile.id,
            clientId,
            groupId,  // Link them together
            requestType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            isEmergency: isEmergency || false,
            status: initialStatus,
          },
          include: {
            caregiver: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )
    )

    // If emergency sick leave, unassign shifts for all clients
    const affectedShiftsMap: Record<string, number> = {}
    if (initialStatus === "APPROVED") {
      for (const request of timeOffRequests) {
        const updateResult = await prisma.shift.updateMany({
          where: {
            clientId: request.clientId,
            caregiverId: request.caregiverId,
            date: {
              gte: request.startDate,
              lte: request.endDate,
            },
          },
          data: {
            caregiverId: null,
            status: "UNFILLED",
          },
        })

        // Track affected shifts count per client
        affectedShiftsMap[request.clientId] = updateResult.count
      }
    }

    // Send email notifications to clients
    for (const request of timeOffRequests) {
      try {
        const relationship = relationships.find(
          r => r.clientId === request.clientId
        )
        const clientEmail = relationship?.client?.user?.email

        if (clientEmail && relationship?.client?.user?.emailVerified) {
          const emailSubject = isEmergency
            ? `URGENT: Ziekmelding van ${user.caregiverProfile.name}`
            : `Nieuwe verlofaanvraag van ${user.caregiverProfile.name}`

          const emailHtml = getTimeOffRequestEmailHtml(
            relationship.client.name,
            user.caregiverProfile.name,
            requestType,
            new Date(startDate),
            new Date(endDate),
            reason,
            isEmergency,
            initialStatus === "APPROVED" ? affectedShiftsMap[request.clientId] : undefined
          )

          await sendEmail({
            to: clientEmail,
            subject: emailSubject,
            html: emailHtml,
          })
        }
      } catch (emailError) {
        console.error(`Failed to send email to client ${request.clientId}:`, emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      requests: timeOffRequests,
      groupId,
      count: timeOffRequests.length,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating time-off request:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de verlofaanvraag" },
      { status: 500 }
    )
  }
}

// PUT /api/scheduling/time-off - Update a time-off request (approve/deny)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: true,
      },
    })

    if (!user?.clientProfile || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Alleen clients kunnen verlofaanvragen goedkeuren" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, status, reviewNotes } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID en status zijn verplicht" },
        { status: 400 }
      )
    }

    // Verify ownership and fetch time-off details
    const existingRequest = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                email: true,
                emailVerified: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Verlofaanvraag niet gevonden" },
        { status: 404 }
      )
    }

    if (existingRequest.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze aanvraag" },
        { status: 403 }
      )
    }

    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status,
        reviewNotes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
      include: {
        caregiver: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    // If APPROVED, unassign caregiver from shifts during time-off period
    let affectedShiftsCount = 0
    if (status === "APPROVED" && existingRequest.status !== "APPROVED") {
      const updateResult = await prisma.shift.updateMany({
        where: {
          clientId: existingRequest.clientId,
          caregiverId: existingRequest.caregiverId,
          date: {
            gte: existingRequest.startDate,
            lte: existingRequest.endDate,
          },
        },
        data: {
          caregiverId: null,
          status: "UNFILLED",
        },
      })

      affectedShiftsCount = updateResult.count
    }

    // Send email notification to caregiver on status change
    if (status !== existingRequest.status) {
      try {
        const caregiverEmail = existingRequest.caregiver.user.email

        if (caregiverEmail && existingRequest.caregiver.user.emailVerified) {
          const emailSubject = status === "APPROVED"
            ? `Verlofaanvraag goedgekeurd door ${user.clientProfile.name}`
            : `Verlofaanvraag afgewezen door ${user.clientProfile.name}`

          const emailHtml = status === "APPROVED"
            ? getTimeOffApprovedEmailHtml(
                existingRequest.caregiver.name,
                user.clientProfile.name,
                existingRequest.requestType,
                existingRequest.startDate,
                existingRequest.endDate,
                reviewNotes
              )
            : getTimeOffDeniedEmailHtml(
                existingRequest.caregiver.name,
                user.clientProfile.name,
                existingRequest.requestType,
                existingRequest.startDate,
                existingRequest.endDate,
                reviewNotes
              )

          await sendEmail({
            to: caregiverEmail,
            subject: emailSubject,
            html: emailHtml,
          })
        }
      } catch (emailError) {
        console.error('Failed to send status change email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      ...updatedRequest,
      affectedShifts: affectedShiftsCount,
    })
  } catch (error) {
    console.error("Error updating time-off request:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de verlofaanvraag" },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduling/time-off?id=xxx - Delete a time-off request
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        caregiverProfile: true,
      },
    })

    if (!user?.caregiverProfile || user.role !== "CAREGIVER") {
      return NextResponse.json(
        { error: "Alleen zorgverleners kunnen hun aanvragen verwijderen" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Aanvraag ID is verplicht" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingRequest = await prisma.timeOffRequest.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Verlofaanvraag niet gevonden" },
        { status: 404 }
      )
    }

    if (existingRequest.caregiverId !== user.caregiverProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot deze aanvraag" },
        { status: 403 }
      )
    }

    // Can't delete approved requests
    if (existingRequest.status === "APPROVED") {
      return NextResponse.json(
        { error: "Goedgekeurde aanvragen kunnen niet worden verwijderd" },
        { status: 400 }
      )
    }

    await prisma.timeOffRequest.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Verlofaanvraag succesvol verwijderd" })
  } catch (error) {
    console.error("Error deleting time-off request:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwijderen van de verlofaanvraag" },
      { status: 500 }
    )
  }
}

// PATCH /api/scheduling/time-off - Dismiss a notification
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 })
    }

    const body = await request.json()
    const { timeOffRequestId, action } = body

    if (!timeOffRequestId || action !== "dismiss") {
      return NextResponse.json(
        { error: "Ongeldige parameters" },
        { status: 400 }
      )
    }

    // Verify access to this notification
    const timeOffRequest = await prisma.timeOffRequest.findUnique({
      where: { id: timeOffRequestId },
      select: { caregiverId: true, clientId: true },
    })

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: "Verlofaanvraag niet gevonden" },
        { status: 404 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true, caregiverProfile: true },
    })

    // Check user has access to this notification
    let hasAccess = false
    if (user?.role === "CAREGIVER" && user.caregiverProfile) {
      hasAccess = timeOffRequest.caregiverId === user.caregiverProfile.id
    } else if (user?.role === "CLIENT" && user.clientProfile) {
      hasAccess = timeOffRequest.clientId === user.clientProfile.id
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Geen toegang" },
        { status: 403 }
      )
    }

    // Create/update dismissed notification
    await prisma.dismissedNotification.upsert({
      where: {
        userId_timeOffRequestId: {
          userId: session.user.id,
          timeOffRequestId,
        },
      },
      create: {
        userId: session.user.id,
        timeOffRequestId,
      },
      update: {
        dismissedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error dismissing notification:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    )
  }
}
