"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { useClient } from "@/lib/ClientContext"

// Interface for caregiver shifts
interface CaregiverShift {
  id: string
  date: string
  startTime: string
  endTime: string
  caregiverId: string
  status: string
}

interface ScheduleItem {
  medication: {
    id: string
    name: string
    dosage: string
    unit: string
    instructions?: string
  }
  scheduledTime: string
  time: string
  status: "pending" | "given" | "skipped"
  isOrphaned?: boolean
  isExtra?: boolean
  administration?: {
    id: string
    administeredAt: string
    dosageGiven: string
    notes?: string
    skipReason?: string
    caregiver: {
      name: string
      email: string
    }
  }
}

interface DailySchedule {
  date: string
  schedule: ScheduleItem[]
  summary: {
    total: number
    given: number
    skipped: number
    pending: number
  }
}

interface User {
  id: string
  email: string
  role: string
  clientProfile?: {
    id: string
    name: string
    userId?: string
    createdAt?: Date
    updatedAt?: Date
    dateOfBirth?: Date
    address?: string
  } | null
  caregiverProfile?: {
    id: string
    name: string
    userId?: string
    createdAt?: Date
    updatedAt?: Date
    phoneNumber?: string
    address?: string
    bio?: string | null
    clientRelationships: Array<{
      client: {
        id: string
        name: string
        user: {
          email: string
        }
      }
    }>
  } | null
}

interface MedicationManagementClientProps {
  user: User
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`)
}

export default function MedicationManagementClient({ user }: MedicationManagementClientProps) {
  const { selectedClient } = useClient()
  const searchParams = useSearchParams()

  // URL parameter for date takes priority, then default to today
  const preselectedDate = searchParams.get("date") || formatLocalDate(new Date())

  const [dailySchedule, setDailySchedule] = useState<DailySchedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(preselectedDate)
  const [isLoading, setIsLoading] = useState(true)
  const [missingMedicationsCount, setMissingMedicationsCount] = useState<number>(0)
  const [openDays, setOpenDays] = useState<string[]>([])

  // Administer medication state
  const [administerDialogOpen, setAdministerDialogOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ScheduleItem | null>(null)
  const [administrationNotes, setAdministrationNotes] = useState("")
  const [wasGiven, setWasGiven] = useState(true)
  const [skipReason, setSkipReason] = useState("")

  // Extra medication dialog state
  const [extraMedDialogOpen, setExtraMedDialogOpen] = useState(false)
  const [extraMed, setExtraMed] = useState({
    name: "",
    dosage: "",
    unit: "mg",
    time: new Date().toTimeString().slice(0, 5),
    notes: "",
  })

  // Caregiver shift state for medication time restriction
  const [caregiverShifts, setCaregiverShifts] = useState<CaregiverShift[]>([])

  const todayLocal = formatLocalDate(new Date())
  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"
  const isToday = selectedDate === todayLocal
  const isTodayOrPast = selectedDate <= todayLocal

  useEffect(() => {
    // For clients, load data immediately
    if (isClient) {
      loadData()
      fetchMissingMedications()
    }
    // For caregivers, only load if a client is selected
    else if (isCaregiver && selectedClient) {
      loadData()
      fetchMissingMedications()
      fetchOpenDays()
    }
  }, [selectedClient, selectedDate])

  // Fetch caregiver shifts when date changes (for shift-based medication restriction)
  useEffect(() => {
    if (!isCaregiver || !selectedClient) {
      setCaregiverShifts([])
      return
    }

    async function fetchCaregiverShifts() {
      try {
        // Get previous day for overnight shift handling
        const currentDate = parseLocalDate(selectedDate)
        const previousDate = new Date(currentDate)
        previousDate.setDate(previousDate.getDate() - 1)
        const previousDateStr = formatLocalDate(previousDate)

        const response = await fetch(
          `/api/scheduling/shifts?clientId=${selectedClient.id}&startDate=${previousDateStr}&endDate=${selectedDate}`
        )

        if (response.ok) {
          const shifts = await response.json()
          console.log('[MedicationManagement] Raw shifts from API:', shifts)
          console.log('[MedicationManagement] User caregiverProfile id:', user.caregiverProfile?.id)
          // API returns array directly, filter to only current caregiver's shifts with FILLED or COMPLETED status
          const myShifts = (Array.isArray(shifts) ? shifts : []).filter(
            (s: CaregiverShift) =>
              s.caregiverId === user.caregiverProfile?.id &&
              (s.status === "FILLED" || s.status === "COMPLETED")
          )
          console.log('[MedicationManagement] Filtered myShifts:', myShifts)
          setCaregiverShifts(myShifts)
        }
      } catch (error) {
        console.error("Error fetching caregiver shifts:", error)
        setCaregiverShifts([])
      }
    }

    fetchCaregiverShifts()
  }, [selectedDate, isCaregiver, selectedClient, user.caregiverProfile?.id])

  // Helper function to check if medication time is within caregiver's shift
  function isMedicationTimeWithinShift(medicationTime: string): boolean {
    // Clients can always register their own medications
    if (!isCaregiver) return true

    // No shifts assigned = can't register any medication
    if (caregiverShifts.length === 0) {
      console.log('[ShiftCheck] No shifts found, returning false')
      return false
    }

    const medHour = parseInt(medicationTime.split(":")[0])
    const medMinute = parseInt(medicationTime.split(":")[1])
    const medTimeMinutes = medHour * 60 + medMinute

    console.log('[ShiftCheck] Checking time:', medicationTime, 'medTimeMinutes:', medTimeMinutes, 'selectedDate:', selectedDate)
    console.log('[ShiftCheck] Available shifts:', caregiverShifts)

    for (const shift of caregiverShifts) {
      const shiftDate = new Date(shift.date)
      const shiftDateStr = formatLocalDate(shiftDate)
      const startHour = parseInt(shift.startTime.split(":")[0])
      const startMinute = parseInt(shift.startTime.split(":")[1])
      const endHour = parseInt(shift.endTime.split(":")[0])
      const endMinute = parseInt(shift.endTime.split(":")[1])
      const startTimeMinutes = startHour * 60 + startMinute
      const endTimeMinutes = endHour * 60 + endMinute

      console.log('[ShiftCheck] Shift:', shift.startTime, '-', shift.endTime, 'shiftDateStr:', shiftDateStr, 'startMinutes:', startTimeMinutes, 'endMinutes:', endTimeMinutes)

      const isOvernightShift = endTimeMinutes < startTimeMinutes

      if (isOvernightShift) {
        // Shift spans midnight (e.g., 18:00 - 00:30)
        // Check if medication is on shift date AND after start time
        if (shiftDateStr === selectedDate && medTimeMinutes >= startTimeMinutes) {
          return true
        }
        // Check if medication is on NEXT day (selectedDate) AND before end time
        const nextDay = new Date(shiftDate)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextDayStr = formatLocalDate(nextDay)
        if (nextDayStr === selectedDate && medTimeMinutes <= endTimeMinutes) {
          return true
        }
      } else {
        // Normal shift (same day, e.g., 08:00 - 16:00)
        console.log('[ShiftCheck] Normal shift check:', shiftDateStr, '===', selectedDate, '?', shiftDateStr === selectedDate, 'timeInRange:', medTimeMinutes >= startTimeMinutes && medTimeMinutes <= endTimeMinutes)
        if (
          shiftDateStr === selectedDate &&
          medTimeMinutes >= startTimeMinutes &&
          medTimeMinutes <= endTimeMinutes
        ) {
          return true
        }
      }
    }

    return false
  }

  async function loadData() {
    setIsLoading(true)
    try {
      const clientId = isClient ? undefined : selectedClient?.id
      const params = new URLSearchParams()
      if (clientId) params.set("clientId", clientId)
      params.set("date", selectedDate)

      const scheduleRes = await fetch(`/api/medications/schedule?${params}`)

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setDailySchedule(scheduleData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMissingMedications() {
    try {
      const clientId = isClient ? undefined : selectedClient?.id
      const params = new URLSearchParams()
      if (clientId) params.set("clientId", clientId)

      console.log('[MedicationManagement] Fetching missing medications...')
      const response = await fetch(`/api/medications/missing?${params}`)
      console.log('[MedicationManagement] Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[MedicationManagement] API Response:', data)
        const totalMissing = (data.summary?.totalMissing || 0) + (data.summary?.totalSkipped || 0)
        console.log('[MedicationManagement] Total missing count:', totalMissing)
        setMissingMedicationsCount(totalMissing)
      } else {
        console.error('[MedicationManagement] API returned error:', response.status)
      }
    } catch (error) {
      console.error("Error fetching missing medications:", error)
    }
  }

  async function handleAdministerMedication() {
    if (!selectedScheduleItem) return

    try {
      const response = await fetch("/api/medications/administer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: selectedScheduleItem.medication.id,
          scheduledTime: selectedScheduleItem.scheduledTime,
          dosageGiven: selectedScheduleItem.medication.dosage,
          notes: administrationNotes,
          wasGiven,
          skipReason: !wasGiven ? skipReason : null,
        }),
      })

      if (response.ok) {
        setAdministerDialogOpen(false)
        setSelectedScheduleItem(null)
        setAdministrationNotes("")
        setWasGiven(true)
        setSkipReason("")
        loadData()
        fetchMissingMedications() // Also refresh the missing count badge
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij registreren medicatie")
      }
    } catch (error) {
      console.error("Error administering medication:", error)
      alert("Er is een fout opgetreden")
    }
  }

  async function handleExtraMedication() {
    const clientId = selectedClient?.id
    if (!clientId) return

    if (!extraMed.name || !extraMed.dosage || !extraMed.unit || !extraMed.time) {
      alert("Vul alle verplichte velden in")
      return
    }

    try {
      const response = await fetch("/api/medications/administer-extra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name: extraMed.name,
          dosage: extraMed.dosage,
          unit: extraMed.unit,
          time: extraMed.time,
          date: selectedDate,
          notes: extraMed.notes || null,
        }),
      })

      if (response.ok) {
        setExtraMedDialogOpen(false)
        setExtraMed({
          name: "",
          dosage: "",
          unit: "mg",
          time: new Date().toTimeString().slice(0, 5),
          notes: "",
        })
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij registreren extra medicatie")
      }
    } catch (error) {
      console.error("Error registering extra medication:", error)
      alert("Er is een fout opgetreden")
    }
  }

  function changeDate(days: number) {
    const currentDate = parseLocalDate(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    setSelectedDate(formatLocalDate(currentDate))
  }

  function goToToday() {
    setSelectedDate(todayLocal)
  }

  async function fetchOpenDays() {
    if (!isCaregiver) return
    try {
      const response = await fetch("/api/caregiver/missed-tasks")
      if (response.ok) {
        const result = await response.json()
        const dates: string[] = (result.missedDays || [])
          .map((d: { date: string }) => d.date)
          .sort()
        setOpenDays(dates)
      }
    } catch {
      // Silently fail - open day navigation is supplementary
    }
  }

  function goToPreviousOpenDay() {
    const prev = openDays.filter((d) => d < selectedDate)
    if (prev.length > 0) setSelectedDate(prev[prev.length - 1])
  }

  function goToNextOpenDay() {
    const next = openDays.filter((d) => d > selectedDate)
    if (next.length > 0) setSelectedDate(next[0])
  }

  const hasPreviousOpenDay = openDays.some((d) => d < selectedDate)
  const hasNextOpenDay = openDays.some((d) => d > selectedDate)

  console.log('[MedicationManagement] Rendering with missingMedicationsCount:', missingMedicationsCount)

  if (isLoading) {
    return (
      <div className="text-center py-8">Laden...</div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medicatiebeheer</h1>
          <p className="text-muted-foreground mt-1">
            Dagelijks medicatieschema en toedieningen
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/medicatie/missing">
              <Button variant="outline">
                Ontbrekende Toedieningen Details
                {missingMedicationsCount > 0 && (
                  <span className="ml-2 bg-orange-600 text-white rounded-full px-2 py-0.5 text-xs">
                    {missingMedicationsCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/dashboard/medicatie/overview">
              <Button variant="outline">Medicatie Overzicht →</Button>
            </Link>
          </div>
          {isCaregiver && (
            <Button
              disabled={!isTodayOrPast || caregiverShifts.length === 0}
              onClick={() => setExtraMedDialogOpen(true)}
              title={
                !isTodayOrPast
                  ? "Kan geen toekomstige registraties maken"
                  : caregiverShifts.length === 0
                  ? "U heeft geen dienst op deze dag"
                  : undefined
              }
            >
              + Extra Medicatie
            </Button>
          )}
        </div>

        {/* Daily Summary */}
        {dailySchedule && dailySchedule.schedule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Overzicht {new Date(selectedDate).toLocaleDateString("nl-NL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{dailySchedule.summary.total}</div>
                  <div className="text-sm text-muted-foreground">Totaal</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{dailySchedule.summary.given}</div>
                  <div className="text-sm text-muted-foreground">Toegediend</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{dailySchedule.summary.skipped}</div>
                  <div className="text-sm text-muted-foreground">Overgeslagen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{dailySchedule.summary.pending}</div>
                  <div className="text-sm text-muted-foreground">Nog te doen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isCaregiver && openDays.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousOpenDay}
                    disabled={!hasPreviousOpenDay}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    title="Vorige dag met ontbrekende taken"
                  >
                    <ChevronsLeft className="h-4 w-4 mr-1" />
                    Vorige Open Dag
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>
                  &larr; Vorige Dag
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {isCaregiver && openDays.length > 0 && (
                  <span className="text-xs text-amber-600 font-medium hidden md:inline">
                    {openDays.length} dag{openDays.length !== 1 ? "en" : ""} open
                  </span>
                )}
                <Input
                  type="date"
                  title="Selecteer datum"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
                {!isToday && (
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Naar Vandaag
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => changeDate(1)}>
                  Volgende Dag &rarr;
                </Button>
                {isCaregiver && openDays.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextOpenDay}
                    disabled={!hasNextOpenDay}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    title="Volgende dag met ontbrekende taken"
                  >
                    Volgende Open Dag
                    <ChevronsRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medication Schedule */}
        {dailySchedule && dailySchedule.schedule.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Medicatieschema</CardTitle>
              <CardDescription>
                Alle geplande medicatie voor deze dag
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailySchedule.schedule.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      item.status === "given"
                        ? "bg-green-50 border-green-200"
                        : item.status === "skipped"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="font-mono text-xl font-bold min-w-[80px]">
                        {item.time}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-lg">
                          {item.medication.name}
                          {item.isExtra && (
                            <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Extra
                            </span>
                          )}
                          {item.isOrphaned && (
                            <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              Vorig schema
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.medication.dosage} {item.medication.unit}
                          {item.medication.instructions && ` - ${item.medication.instructions}`}
                        </div>
                        {item.administration && (
                          <div className="text-sm mt-1">
                            {item.status === "given" ? (
                              <span className="text-green-700">
                                ✓ Toegediend door {item.administration.caregiver.name} om{" "}
                                {new Date(item.administration.administeredAt).toLocaleTimeString("nl-NL", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              <span className="text-yellow-700">
                                Overgeslagen: {item.administration.skipReason}
                              </span>
                            )}
                            {item.administration.notes && (
                              <div className="text-muted-foreground mt-1">
                                Notitie: {item.administration.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {isCaregiver && item.status === "pending" && isTodayOrPast && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setSelectedScheduleItem(item)
                            setAdministerDialogOpen(true)
                          }}
                          disabled={!isMedicationTimeWithinShift(item.time)}
                          title={
                            !isMedicationTimeWithinShift(item.time)
                              ? "Deze medicatie valt buiten uw dienst"
                              : undefined
                          }
                        >
                          Registreer
                        </Button>
                        {!isMedicationTimeWithinShift(item.time) && (
                          <span className="text-xs text-muted-foreground">
                            (Buiten uw dienst)
                          </span>
                        )}
                      </div>
                    )}
                    {item.status === "pending" && !isTodayOrPast && (
                      <span className="text-muted-foreground text-sm">
                        Toekomstige medicatie
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Geen medicatie gepland voor deze dag
            </CardContent>
          </Card>
        )}

      {/* Administer medication dialog */}
      <Dialog open={administerDialogOpen} onOpenChange={setAdministerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medicatie Toediening Registreren</DialogTitle>
            <DialogDescription>
              {selectedScheduleItem?.medication.name} - {selectedScheduleItem?.time}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={wasGiven ? "given" : "skipped"}
                onValueChange={(value) => setWasGiven(value === "given")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="given">Toegediend</SelectItem>
                  <SelectItem value="skipped">Overgeslagen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!wasGiven && (
              <div className="grid gap-2">
                <Label htmlFor="skipReason">Reden voor overslaan *</Label>
                <Input
                  id="skipReason"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Bijv. Cliënt weigerde"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notities</Label>
              <Input
                id="notes"
                value={administrationNotes}
                onChange={(e) => setAdministrationNotes(e.target.value)}
                placeholder="Eventuele opmerkingen"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdministerDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAdministerMedication}>Registreren</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extra medication dialog */}
      <Dialog open={extraMedDialogOpen} onOpenChange={setExtraMedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extra Medicatie Registreren</DialogTitle>
            <DialogDescription>
              Registreer medicatie die niet in het dagelijks schema staat
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="extraMedName">Medicijn naam *</Label>
              <Input
                id="extraMedName"
                value={extraMed.name}
                onChange={(e) => setExtraMed({ ...extraMed, name: e.target.value })}
                placeholder="Bijv. Paracetamol"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="extraMedDosage">Dosering *</Label>
                <Input
                  id="extraMedDosage"
                  value={extraMed.dosage}
                  onChange={(e) => setExtraMed({ ...extraMed, dosage: e.target.value })}
                  placeholder="Bijv. 500"
                />
              </div>
              <div className="grid gap-2">
                <Label>Eenheid *</Label>
                <Select
                  value={extraMed.unit}
                  onValueChange={(value) => setExtraMed({ ...extraMed, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="tabletten">tabletten</SelectItem>
                    <SelectItem value="druppels">druppels</SelectItem>
                    <SelectItem value="stuks">stuks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="extraMedTime">Tijdstip *</Label>
              <Input
                id="extraMedTime"
                type="time"
                value={extraMed.time}
                onChange={(e) => setExtraMed({ ...extraMed, time: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="extraMedNotes">Notities</Label>
              <Textarea
                id="extraMedNotes"
                value={extraMed.notes}
                onChange={(e) => setExtraMed({ ...extraMed, notes: e.target.value })}
                placeholder="Bijv. Hoofdpijn, op verzoek cliënt"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExtraMedDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleExtraMedication}
              disabled={!extraMed.name || !extraMed.dosage || !extraMed.unit || !extraMed.time}
            >
              Registreren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
