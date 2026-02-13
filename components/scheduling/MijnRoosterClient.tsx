"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ScheduleCalendar from "./ScheduleCalendar"
import TimeOffRequest from "./TimeOffRequest"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// Tabs removed - using manual state with styled buttons
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatFullDate } from "@/lib/utils/calendar"
import { Calendar, Clock, FileText, CheckCircle } from "lucide-react"
import PdfDownloadButton from "./pdf/PdfDownloadButton"

interface Client {
  id: string
  name: string
}

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  internalNotes?: string | null
  instructionNotes?: string | null
  actualStartTime?: string | null
  actualEndTime?: string | null
  caregiverNote?: string | null
  timeCorrectionStatus?: string | null
  timeCorrectionAt?: string | null
  shiftType: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

interface ShiftTypeInfo {
  id: string
  name: string
  color: string
}

interface MijnRoosterClientProps {
  caregiverId: string
  clients: Client[]
}

export default function MijnRoosterClient({
  caregiverId,
  clients,
}: MijnRoosterClientProps) {
  const [activeTab, setActiveTab] = useState<"schedule" | "timeoff">("schedule")
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([])
  const [correctionStartTime, setCorrectionStartTime] = useState("")
  const [correctionEndTime, setCorrectionEndTime] = useState("")
  const [correctionNote, setCorrectionNote] = useState("")
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false)
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeInfo[]>([])
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date())

  useEffect(() => {
    fetchUpcomingShifts()
    fetchShiftTypes()
  }, [caregiverId, refreshKey])

  const fetchShiftTypes = async () => {
    try {
      // Fetch shift types from all clients
      const allShiftTypes: ShiftTypeInfo[] = []
      for (const client of clients) {
        const response = await fetch(`/api/scheduling/shift-types?clientId=${client.id}`)
        if (response.ok) {
          const data = await response.json()
          allShiftTypes.push(...data)
        }
      }
      // Remove duplicates by id
      const uniqueShiftTypes = Array.from(
        new Map(allShiftTypes.map((item) => [item.id, item])).values()
      )
      setShiftTypes(uniqueShiftTypes)
    } catch (error) {
      console.error("Error fetching shift types:", error)
    }
  }

  useEffect(() => {
    if (selectedShift) {
      setCorrectionStartTime(selectedShift.actualStartTime || selectedShift.startTime)
      setCorrectionEndTime(selectedShift.actualEndTime || selectedShift.endTime)
      setCorrectionNote(selectedShift.caregiverNote || "")
      setShowCorrectionForm(false)
    }
  }, [selectedShift])

  const fetchUpcomingShifts = async () => {
    try {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const params = new URLSearchParams({
        caregiverId,
        startDate: today.toISOString(),
        endDate: nextWeek.toISOString(),
      })

      const response = await fetch(`/api/scheduling/shifts?${params}`)
      if (response.ok) {
        const data = await response.json()
        const shiftsWithDates = (data as Shift[]).map((shift) => ({
          ...shift,
          date: new Date(shift.date as unknown as string),
        }))
        setUpcomingShifts(shiftsWithDates.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching upcoming shifts:", error)
    }
  }

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift)
    setIsModalOpen(true)
  }

  const handleSubmitCorrection = async () => {
    if (!selectedShift) return
    setIsSubmittingCorrection(true)
    try {
      const response = await fetch("/api/scheduling/shifts/time-correction", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: selectedShift.id,
          actualStartTime: correctionStartTime,
          actualEndTime: correctionEndTime,
          caregiverNote: correctionNote || undefined,
        }),
      })
      if (response.ok) {
        setSelectedShift({
          ...selectedShift,
          actualStartTime: correctionStartTime,
          actualEndTime: correctionEndTime,
          caregiverNote: correctionNote,
          timeCorrectionStatus: "PENDING",
          timeCorrectionAt: new Date().toISOString(),
        })
        setShowCorrectionForm(false)
        setRefreshKey((prev) => prev + 1)
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    } finally {
      setIsSubmittingCorrection(false)
    }
  }

  const isPastShift = selectedShift ? (() => {
    const d = new Date(selectedShift.date)
    d.setHours(0, 0, 0, 0)
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return d < t
  })() : false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mijn Rooster</h1>
        <p className="text-muted-foreground mt-1">
          Bekijk uw ingeplande diensten
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className={activeTab === "schedule" ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
            onClick={() => setActiveTab("schedule")}
          >
            Rooster
          </Button>
          <Button
            variant="outline"
            className={activeTab === "timeoff" ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
            onClick={() => setActiveTab("timeoff")}
          >
            Verlof & Ziekmeldingen
          </Button>
        </div>
        {clients.length > 0 && shiftTypes.length > 0 && (
          <PdfDownloadButton
            clientId={clients[0].id}
            shiftTypes={shiftTypes}
            caregiverId={caregiverId}
            currentDate={currentCalendarDate}
            variant="outline"
          />
        )}
      </div>

      {/* Schedule Tab Content */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {/* Upcoming Shifts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Aankomende Diensten
              </CardTitle>
              <CardDescription>Uw diensten voor de komende 7 dagen</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingShifts.length === 0 ? (
                <p className="text-muted-foreground">
                  Geen aankomende diensten ingepland
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleShiftClick(shift)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-white rounded-lg border">
                          <div className="text-xs text-muted-foreground">
                            {shift.date.toLocaleDateString("nl-NL", {
                              month: "short",
                            })}
                          </div>
                          <div className="text-lg font-bold">
                            {shift.date.getDate()}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">{shift.shiftType.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {shift.client?.name || "Onbekend"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar */}
          <ScheduleCalendar
            caregiverId={caregiverId}
            isReadOnly
            onShiftClick={handleShiftClick}
            onDateChange={setCurrentCalendarDate}
          />
        </div>
      )}

      {/* Time-off Tab Content */}
      {activeTab === "timeoff" && (
        <TimeOffRequest caregiverId={caregiverId} clients={clients} />
      )}

      {/* Shift Detail Modal */}
      {selectedShift && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Dienst Details</DialogTitle>
              <DialogDescription>
                {formatFullDate(selectedShift.date)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Cliënt
                  </label>
                  <p className="text-base mt-1">{selectedShift.client?.name || "Onbekend"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Diensttype
                  </label>
                  <p className="text-base mt-1">
                    {selectedShift.shiftType.name}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Ingeplande tijd
                </label>
                <p className="text-base mt-1">
                  {selectedShift.startTime} - {selectedShift.endTime}
                </p>
              </div>

              {selectedShift.instructionNotes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Instructies
                  </label>
                  <p className="text-base mt-1 whitespace-pre-wrap">
                    {selectedShift.instructionNotes}
                  </p>
                </div>
              )}

              {/* Correction acknowledged by client */}
              {selectedShift.timeCorrectionStatus === "ACKNOWLEDGED" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">
                      Tijden aangepast door cliënt
                    </span>
                  </div>
                  <p className="text-sm text-green-800">
                    Uw correctie is verwerkt. De dienst is aangepast naar {selectedShift.startTime} - {selectedShift.endTime}.
                  </p>
                </div>
              )}

              {/* Correction pending */}
              {selectedShift.timeCorrectionStatus === "PENDING" && !showCorrectionForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">
                      Correctie in behandeling
                    </span>
                  </div>
                  <p className="text-sm text-amber-800">
                    U heeft afwijkende tijden doorgegeven: {selectedShift.actualStartTime} - {selectedShift.actualEndTime}
                  </p>
                  {selectedShift.caregiverNote && (
                    <p className="text-sm text-amber-700 mt-1 italic">
                      &quot;{selectedShift.caregiverNote}&quot;
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowCorrectionForm(true)}
                  >
                    Correctie wijzigen
                  </Button>
                </div>
              )}

              {/* Button to start correction - only for past shifts without existing correction */}
              {isPastShift && !showCorrectionForm && !selectedShift.timeCorrectionStatus && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCorrectionForm(true)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Afwijkende tijden doorgeven
                </Button>
              )}

              {/* Correction form */}
              {showCorrectionForm && (
                <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <h4 className="font-semibold text-sm">Werkelijke tijden doorgeven</h4>
                  <p className="text-xs text-muted-foreground">
                    Geef de tijden door waarop u daadwerkelijk heeft gewerkt. De cliënt ontvangt een melding.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="corrStartTime">Starttijd</Label>
                      <Input
                        id="corrStartTime"
                        type="time"
                        value={correctionStartTime}
                        onChange={(e) => setCorrectionStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="corrEndTime">Eindtijd</Label>
                      <Input
                        id="corrEndTime"
                        type="time"
                        value={correctionEndTime}
                        onChange={(e) => setCorrectionEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="corrNote">Toelichting (optioneel)</Label>
                    <Textarea
                      id="corrNote"
                      placeholder="Bijv. later begonnen door verkeersproblemen..."
                      value={correctionNote}
                      onChange={(e) => setCorrectionNote(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCorrectionForm(false)}
                    >
                      Annuleren
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitCorrection}
                      disabled={isSubmittingCorrection}
                    >
                      {isSubmittingCorrection ? "Bezig..." : "Correctie indienen"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Contact info - for future shifts without correction */}
              {!showCorrectionForm && !selectedShift.timeCorrectionStatus && !isPastShift && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Let op:</strong> Neem bij vragen of problemen contact
                    op met uw cliënt.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
