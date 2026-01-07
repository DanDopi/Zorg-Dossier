import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/scheduling/patterns - Get all shift patterns for a client
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

    let targetClientId: string | null = null

    if (user.role === "CLIENT" && user.clientProfile) {
      targetClientId = user.clientProfile.id
    } else if (clientId) {
      targetClientId = clientId
    } else {
      return NextResponse.json({ error: "Client ID vereist" }, { status: 400 })
    }

    const patterns = await prisma.shiftPattern.findMany({
      where: {
        clientId: targetClientId,
      },
      include: {
        shiftType: true,
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
      orderBy: [{ startDate: "asc" }, { shiftType: { startTime: "asc" } }],
    })

    // Parse daysOfWeek JSON strings to arrays
    const patternsWithParsedDays = patterns.map(pattern => ({
      ...pattern,
      daysOfWeek: pattern.daysOfWeek ? JSON.parse(pattern.daysOfWeek) : null,
    }))

    return NextResponse.json(patternsWithParsedDays)
  } catch (error) {
    console.error("Error fetching shift patterns:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de patronen" },
      { status: 500 }
    )
  }
}

// POST /api/scheduling/patterns - Create a new shift pattern
export async function POST(request: NextRequest) {
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
        { error: "Alleen clients kunnen patronen aanmaken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { caregiverId, shiftTypeId, recurrenceType, daysOfWeek, startDate, endDate } = body

    // Validate required fields (caregiverId is now optional)
    if (!shiftTypeId || !recurrenceType || !startDate) {
      return NextResponse.json(
        { error: "Diensttype, herhalingstype en startdatum zijn verplicht" },
        { status: 400 }
      )
    }

    // Validate recurrenceType
    const validRecurrenceTypes = ["DAILY", "WEEKLY", "BIWEEKLY", "FIRST_OF_MONTH", "LAST_OF_MONTH"]
    if (!validRecurrenceTypes.includes(recurrenceType)) {
      return NextResponse.json(
        { error: "Ongeldig herhalingstype" },
        { status: 400 }
      )
    }

    // Validate daysOfWeek for WEEKLY/BIWEEKLY patterns
    if ((recurrenceType === "WEEKLY" || recurrenceType === "BIWEEKLY") && (!daysOfWeek || daysOfWeek.length === 0)) {
      return NextResponse.json(
        { error: "Selecteer minimaal één dag van de week" },
        { status: 400 }
      )
    }

    // Validate end date is not too far in the future (max 1 year ahead)
    if (endDate) {
      const maxDate = new Date(new Date().getFullYear() + 1, 11, 31, 23, 59, 59, 999)
      const inputDate = new Date(endDate)

      if (inputDate > maxDate) {
        return NextResponse.json(
          { error: `Einddatum kan maximaal tot 31 december ${maxDate.getFullYear()}` },
          { status: 400 }
        )
      }
    }

    // Verify shift type belongs to this client
    const shiftType = await prisma.shiftType.findUnique({
      where: { id: shiftTypeId },
    })

    if (!shiftType || shiftType.clientId !== user.clientProfile.id) {
      return NextResponse.json({ error: "Ongeldig diensttype" }, { status: 400 })
    }

    // Verify caregiver relationship (only if caregiver is specified)
    if (caregiverId) {
      const relationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId,
          clientId: user.clientProfile.id,
          status: "ACTIVE",
        },
      })

      if (!relationship) {
        return NextResponse.json(
          { error: "Deze zorgverlener heeft geen actieve relatie met u" },
          { status: 400 }
        )
      }
    }

    // Note: We don't check for conflicts based on day anymore since recurrence patterns
    // can be complex (biweekly, first/last of month, etc.). The generate API will handle
    // any actual shift conflicts when creating shifts.

    const pattern = await prisma.shiftPattern.create({
      data: {
        clientId: user.clientProfile.id,
        caregiverId: caregiverId || null,
        shiftTypeId,
        recurrenceType,
        daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? JSON.stringify(daysOfWeek) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: session.user.id,
      },
      include: {
        shiftType: true,
        caregiver: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    // Parse daysOfWeek JSON string to array before returning
    const patternWithParsedDays = {
      ...pattern,
      daysOfWeek: pattern.daysOfWeek ? JSON.parse(pattern.daysOfWeek) : null,
    }

    return NextResponse.json(patternWithParsedDays, { status: 201 })
  } catch (error) {
    console.error("Error creating shift pattern:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van het patroon" },
      { status: 500 }
    )
  }
}

// PUT /api/scheduling/patterns - Update a shift pattern
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
        { error: "Alleen clients kunnen patronen bijwerken" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, isActive, endDate, caregiverId, shiftTypeId, recurrenceType, daysOfWeek, startDate, regenerateShifts } = body

    if (!id) {
      return NextResponse.json({ error: "Patroon ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingPattern = await prisma.shiftPattern.findUnique({
      where: { id },
    })

    if (!existingPattern) {
      return NextResponse.json({ error: "Patroon niet gevonden" }, { status: 404 })
    }

    if (existingPattern.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot dit patroon" },
        { status: 403 }
      )
    }

    // If caregiverId or shiftTypeId is being updated, validate them
    if (shiftTypeId && shiftTypeId !== existingPattern.shiftTypeId) {
      const shiftType = await prisma.shiftType.findUnique({
        where: { id: shiftTypeId },
      })

      if (!shiftType || shiftType.clientId !== user.clientProfile.id) {
        return NextResponse.json({ error: "Ongeldig diensttype" }, { status: 400 })
      }
    }

    if (caregiverId && caregiverId !== existingPattern.caregiverId) {
      const relationship = await prisma.caregiverClientRelationship.findFirst({
        where: {
          caregiverId,
          clientId: user.clientProfile.id,
          status: "ACTIVE",
        },
      })

      if (!relationship) {
        return NextResponse.json(
          { error: "Deze zorgverlener heeft geen actieve relatie met u" },
          { status: 400 }
        )
      }
    }

    // Validate daysOfWeek for WEEKLY/BIWEEKLY patterns
    const finalRecurrenceType = recurrenceType || existingPattern.recurrenceType
    if ((finalRecurrenceType === "WEEKLY" || finalRecurrenceType === "BIWEEKLY") && daysOfWeek !== undefined && (!daysOfWeek || daysOfWeek.length === 0)) {
      return NextResponse.json(
        { error: "Selecteer minimaal één dag van de week" },
        { status: 400 }
      )
    }

    // Validate end date is not too far in the future (max 1 year ahead)
    if (endDate) {
      const maxDate = new Date(new Date().getFullYear() + 1, 11, 31, 23, 59, 59, 999)
      const inputDate = new Date(endDate)

      if (inputDate > maxDate) {
        return NextResponse.json(
          { error: `Einddatum kan maximaal tot 31 december ${maxDate.getFullYear()}` },
          { status: 400 }
        )
      }
    }

    // If regenerateShifts is true, delete future pattern-generated shifts
    let deletedCount = 0
    if (regenerateShifts) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const deleteResult = await prisma.shift.deleteMany({
        where: {
          patternId: id,
          date: { gte: today },
          isPatternOverride: false, // Don't delete manually overridden shifts
        },
      })

      deletedCount = deleteResult.count
    }

    const updatedPattern = await prisma.shiftPattern.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(caregiverId && { caregiverId }),
        ...(shiftTypeId && { shiftTypeId }),
        ...(recurrenceType && { recurrenceType }),
        ...(daysOfWeek !== undefined && { daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? JSON.stringify(daysOfWeek) : null }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: {
        shiftType: true,
        caregiver: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    // Parse daysOfWeek JSON string to array before returning
    const patternWithParsedDays = {
      ...updatedPattern,
      daysOfWeek: updatedPattern.daysOfWeek ? JSON.parse(updatedPattern.daysOfWeek) : null,
    }

    return NextResponse.json({
      pattern: patternWithParsedDays,
      deletedShifts: deletedCount,
    })
  } catch (error) {
    console.error("Error updating shift pattern:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van het patroon" },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduling/patterns?id=xxx - Delete a shift pattern
export async function DELETE(request: NextRequest) {
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
        { error: "Alleen clients kunnen patronen verwijderen" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Patroon ID is verplicht" }, { status: 400 })
    }

    // Verify ownership
    const existingPattern = await prisma.shiftPattern.findUnique({
      where: { id },
    })

    if (!existingPattern) {
      return NextResponse.json({ error: "Patroon niet gevonden" }, { status: 404 })
    }

    if (existingPattern.clientId !== user.clientProfile.id) {
      return NextResponse.json(
        { error: "U heeft geen toegang tot dit patroon" },
        { status: 403 }
      )
    }

    // Delete all future shifts generated by this pattern
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const deleteShiftsResult = await prisma.shift.deleteMany({
      where: {
        patternId: id,
        date: { gte: today },
        isPatternOverride: false, // Don't delete manually overridden shifts
      },
    })

    // Soft delete: mark as inactive instead of deleting
    await prisma.shiftPattern.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      message: "Patroon succesvol verwijderd",
      deletedShifts: deleteShiftsResult.count,
    })
  } catch (error) {
    console.error("Error deleting shift pattern:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwijderen van het patroon" },
      { status: 500 }
    )
  }
}
