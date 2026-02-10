import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    // 1. Auth check
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Get user with both client and caregiver profiles
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        clientProfile: true,
        caregiverProfile: {
          include: {
            clientRelationships: {
              where: { status: "ACTIVE" }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 3. Determine target client ID
    let targetClientId: string

    const { searchParams } = new URL(request.url)
    const clientIdParam = searchParams.get("clientId")

    if (user.clientProfile) {
      // USER is a CLIENT - use their own client ID
      targetClientId = user.clientProfile.id
    } else if (user.caregiverProfile && clientIdParam) {
      // USER is a CAREGIVER - verify relationship with requested client
      const hasRelationship = user.caregiverProfile.clientRelationships.some(
        rel => rel.clientId === clientIdParam
      )

      if (!hasRelationship) {
        return NextResponse.json(
          { error: "No access to this client" },
          { status: 403 }
        )
      }

      targetClientId = clientIdParam
    } else {
      return NextResponse.json(
        { error: "Client ID required for caregivers" },
        { status: 400 }
      )
    }

    // Determine if user is a caregiver and get their shifts for filtering
    // Caregivers only see missing medications from days they had a shift
    // AND the medication time must fall within their shift hours
    // Clients see ALL missing medications
    interface ShiftTimeRange {
      startTime: string  // "06:00"
      endTime: string    // "18:00"
    }

    // Map from date string (YYYY-MM-DD) to array of time ranges
    let caregiverShiftTimeRanges: Map<string, ShiftTimeRange[]> = new Map()
    const isCaregiver = !user.clientProfile && !!user.caregiverProfile

    // Helper function to convert time string to minutes for comparison
    function timeToMinutes(time: string): number {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    // Helper function to check if medication time falls within any shift on that date
    function isMedicationTimeWithinShift(medicationTime: string, shifts: ShiftTimeRange[]): boolean {
      const medMinutes = timeToMinutes(medicationTime)

      for (const shift of shifts) {
        const startMinutes = timeToMinutes(shift.startTime)
        const endMinutes = timeToMinutes(shift.endTime)

        // Handle overnight shifts (e.g., 22:00 - 06:00)
        if (endMinutes < startMinutes) {
          // Overnight shift: medication is within if before end OR after start
          if (medMinutes >= startMinutes || medMinutes <= endMinutes) {
            return true
          }
        } else {
          // Normal shift: medication is within if between start and end (inclusive)
          if (medMinutes >= startMinutes && medMinutes <= endMinutes) {
            return true
          }
        }
      }
      return false
    }

    if (isCaregiver && user.caregiverProfile) {
      // Fetch all shifts this caregiver has worked for this client, including time ranges
      const shifts = await prisma.shift.findMany({
        where: {
          caregiverId: user.caregiverProfile.id,
          clientId: targetClientId,
          status: { in: ["FILLED", "COMPLETED"] },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      })

      // Build a map of dates to time ranges when caregiver had shifts
      for (const shift of shifts) {
        // Use local date components to avoid timezone issues
        const shiftDate = new Date(shift.date)
        const year = shiftDate.getFullYear()
        const month = String(shiftDate.getMonth() + 1).padStart(2, '0')
        const day = String(shiftDate.getDate()).padStart(2, '0')
        const dateKey = `${year}-${month}-${day}`

        // Get existing time ranges for this date or create new array
        const existingRanges = caregiverShiftTimeRanges.get(dateKey) || []
        existingRanges.push({
          startTime: shift.startTime,
          endTime: shift.endTime,
        })
        caregiverShiftTimeRanges.set(dateKey, existingRanges)
      }
    }

    // Check if details are requested
    const includeDetails = searchParams.get("details") === "true"

    // For CLIENT users, fetch all shifts to know who was assigned each day
    // This is used to show which caregiver should have given missing medications
    let allShiftsForClient: Array<{
      date: Date
      caregiverId: string | null
      caregiver: { id: string; name: string } | null
    }> = []

    if (!isCaregiver && includeDetails) {
      // Client needs to see who was assigned each day
      allShiftsForClient = await prisma.shift.findMany({
        where: {
          clientId: targetClientId,
          status: { in: ["FILLED", "COMPLETED"] },
          caregiverId: { not: null }
        },
        select: {
          date: true,
          caregiverId: true,
          caregiver: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    }

    // Get today's date at midnight to exclude today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 4. Get all active medications for the client
    const medications = await prisma.medication.findMany({
      where: {
        clientId: targetClientId,
        isActive: true,
        startDate: { lte: today },
        OR: [
          { endDate: null },
          { endDate: { gte: today } }
        ]
      },
      select: {
        id: true,
        name: true,
        dosage: true,
        unit: true,
        frequency: true,
        instructions: true,
        times: true,
        startDate: true,
        endDate: true
      }
    })

    // 5. Get all medication administrations for the client
    const administrations = await prisma.medicationAdministration.findMany({
      where: {
        clientId: targetClientId
      },
      select: {
        medicationId: true,
        scheduledTime: true,
        wasGiven: true,
        skipReason: true,
        administeredAt: true,
        ...(includeDetails && {
          caregiver: {
            select: {
              id: true,
              name: true
            }
          }
        })
      }
    })

    // 6. Calculate missing and skipped administrations
    interface MissingAdministration {
      medicationId: string
      medicationName: string
      dosage: string
      unit: string
      scheduledDate: string
      scheduledTime: string
      type: "MISSING"
      daysOverdue: number
      frequency: string
      instructions?: string
      assignedCaregiverId?: string | null
      assignedCaregiverName?: string | null
    }

    interface SkippedAdministration {
      medicationId: string
      medicationName: string
      dosage: string
      unit: string
      scheduledDate: string
      scheduledTime: string
      type: "SKIPPED"
      skipReason: string
      daysOverdue: number
      caregiverId: string
      caregiverName: string
      administeredAt: string
    }

    const missingAdministrations: MissingAdministration[] = []
    const skippedAdministrations: SkippedAdministration[] = []
    let missingCount = 0
    let skippedCount = 0
    const uniqueMedicationIds = new Set<string>()
    const uniqueDaysSet = new Set<string>()

    for (const medication of medications) {
      // Parse times array
      let times: string[] = []
      try {
        times = JSON.parse(medication.times)
      } catch {
        continue // Skip medication with invalid times
      }

      // Get start and end dates - use UTC to avoid timezone issues
      const startDate = medication.startDate ? new Date(medication.startDate) : today
      // Extract just the date components to avoid timezone shifting
      const startDateLocal = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())

      const endDate = medication.endDate ? new Date(medication.endDate) : today
      const endDateLocal = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

      // For each time in the medication schedule
      for (const time of times) {
        // For each day from startDate to yesterday
        const currentDate = new Date(startDateLocal)
        while (currentDate < today) {
          // Check frequency
          let shouldCheck = false
          if (medication.frequency === "daily") {
            shouldCheck = true
          } else if (medication.frequency === "as_needed") {
            shouldCheck = false // Not scheduled, so can't be missing
          } else {
            // For MVP, only handle daily frequency
            // weekly, monthly can be added later
            shouldCheck = true // Conservative - assume it should be given
          }

          if (shouldCheck && currentDate >= startDateLocal && currentDate <= endDateLocal) {
            // Format date as YYYY-MM-DD using local date components (not ISO which converts to UTC)
            const year = currentDate.getFullYear()
            const month = String(currentDate.getMonth() + 1).padStart(2, '0')
            const day = String(currentDate.getDate()).padStart(2, '0')
            const scheduledDateStr = `${year}-${month}-${day}`

            // For caregivers, skip medications when:
            // 1. They didn't have a shift on this date, OR
            // 2. The medication time doesn't fall within their shift hours
            // Clients see ALL missing medications
            if (isCaregiver) {
              const shiftsOnDate = caregiverShiftTimeRanges.get(scheduledDateStr)
              if (!shiftsOnDate || !isMedicationTimeWithinShift(time, shiftsOnDate)) {
                currentDate.setDate(currentDate.getDate() + 1)
                continue
              }
            }

            const scheduledDateTime = new Date(`${scheduledDateStr}T${time}:00`)

            // Look for administration record
            const administration = administrations.find(adm => {
              const admDate = new Date(adm.scheduledTime)
              // Use local date components for comparison
              const admYear = admDate.getFullYear()
              const admMonth = String(admDate.getMonth() + 1).padStart(2, '0')
              const admDay = String(admDate.getDate()).padStart(2, '0')
              const admDateStr = `${admYear}-${admMonth}-${admDay}`
              const admTime = `${admDate.getHours().toString().padStart(2, '0')}:${admDate.getMinutes().toString().padStart(2, '0')}`

              return adm.medicationId === medication.id &&
                     admDateStr === scheduledDateStr &&
                     admTime === time
            })

            if (!administration) {
              // NO RECORD FOUND - MISSING
              missingCount += 1
              if (includeDetails) {
                const daysOverdue = Math.floor(
                  (today.getTime() - scheduledDateTime.getTime()) / (1000 * 60 * 60 * 24)
                )

                // For clients: find which caregiver had a shift on this date
                let assignedCaregiverId: string | null = null
                let assignedCaregiverName: string | null = null

                if (!isCaregiver && allShiftsForClient.length > 0) {
                  const shiftForDate = allShiftsForClient.find(shift => {
                    const shiftDate = new Date(shift.date)
                    const shiftYear = shiftDate.getFullYear()
                    const shiftMonth = String(shiftDate.getMonth() + 1).padStart(2, '0')
                    const shiftDay = String(shiftDate.getDate()).padStart(2, '0')
                    const shiftDateStr = `${shiftYear}-${shiftMonth}-${shiftDay}`
                    return shiftDateStr === scheduledDateStr
                  })

                  if (shiftForDate?.caregiver) {
                    assignedCaregiverId = shiftForDate.caregiver.id
                    assignedCaregiverName = shiftForDate.caregiver.name
                  }
                }

                missingAdministrations.push({
                  medicationId: medication.id,
                  medicationName: medication.name,
                  dosage: medication.dosage,
                  unit: medication.unit,
                  scheduledDate: scheduledDateStr,
                  scheduledTime: time,
                  type: "MISSING",
                  daysOverdue,
                  frequency: medication.frequency,
                  instructions: medication.instructions || undefined,
                  assignedCaregiverId,
                  assignedCaregiverName: assignedCaregiverName || "Geen zorgverlener toegewezen"
                })

                uniqueMedicationIds.add(medication.id)
                uniqueDaysSet.add(scheduledDateStr)
              }
            } else if (!administration.wasGiven) {
              // RECORD EXISTS BUT SKIPPED
              skippedCount += 1
              if (includeDetails) {
                const daysOverdue = Math.floor(
                  (today.getTime() - scheduledDateTime.getTime()) / (1000 * 60 * 60 * 24)
                )

                const admWithDetails = administration as typeof administration & {
                  caregiver?: { id: string; name: string }
                }

                skippedAdministrations.push({
                  medicationId: medication.id,
                  medicationName: medication.name,
                  dosage: medication.dosage,
                  unit: medication.unit,
                  scheduledDate: scheduledDateStr,
                  scheduledTime: time,
                  type: "SKIPPED",
                  skipReason: administration.skipReason || "Geen reden opgegeven",
                  daysOverdue,
                  caregiverId: admWithDetails.caregiver?.id || "",
                  caregiverName: admWithDetails.caregiver?.name || "Onbekend",
                  administeredAt: administration.administeredAt?.toISOString() || new Date().toISOString()
                })

                uniqueMedicationIds.add(medication.id)
                uniqueDaysSet.add(scheduledDateStr)
              }
            }
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
    }

    // If details not requested, return simple counts (still in summary format for consistency)
    if (!includeDetails) {
      return NextResponse.json({
        summary: {
          totalMissing: missingCount,
          totalSkipped: skippedCount
        }
      })
    }

    // 7. Build summary statistics
    const oldestMissing = [...missingAdministrations, ...skippedAdministrations]
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]?.scheduledDate || null

    const summary = {
      totalMissing: missingCount,
      totalSkipped: skippedCount,
      uniqueMedications: uniqueMedicationIds.size,
      uniqueDays: uniqueDaysSet.size,
      oldestMissing
    }

    return NextResponse.json({
      missingAdministrations,
      skippedAdministrations,
      summary
    })
  } catch (error) {
    console.error("Error fetching missing medication administrations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
