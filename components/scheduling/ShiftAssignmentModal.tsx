"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle } from "lucide-react"
import { formatFullDate } from "@/lib/utils/calendar"

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  internalNotes?: string | null
  instructionNotes?: string | null
  clientVerified?: boolean
  clientVerifiedAt?: string | null
  actualStartTime?: string | null
  actualEndTime?: string | null
  caregiverNote?: string | null
  timeCorrectionStatus?: string | null
  timeCorrectionAt?: string | null
  shiftType: {
    id: string
    name: string
  }
  caregiver?: {
    id: string
    name: string
  } | null
}

interface Caregiver {
  id: string
  name: string
  color?: string | null
}

interface Conflict {
  id: string
  clientName: string
  shiftTypeName: string
  startTime: string
  endTime: string
  date: Date
}

interface ShiftAssignmentModalProps {
  shift: Shift | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedShift: Shift) => void
  availableCaregivers: Caregiver[]
}

export default function ShiftAssignmentModal({
  shift,
  isOpen,
  onClose,
  onSave,
  availableCaregivers,
}: ShiftAssignmentModalProps) {
  const [caregiverId, setCaregiverId] = useState<string>("unassigned")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [instructionNotes, setInstructionNotes] = useState("")
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<string>("NONE")
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("")

  // Get day name in Dutch for display
  function getDutchDayName(date: Date): string {
    const days = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"]
    return days[new Date(date).getDay()]
  }

  // Get day name in English for API
  function getEnglishDayName(date: Date): string {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return days[new Date(date).getDay()]
  }

  useEffect(() => {
    if (shift) {
      setCaregiverId(shift.caregiver?.id || "unassigned")
      setStartTime(shift.startTime)
      setEndTime(shift.endTime)
      setInternalNotes(shift.internalNotes || "")
      setInstructionNotes(shift.instructionNotes || "")
      setConflicts([])
      setRecurrenceType("NONE")
      // Default end date to end of current year
      const year = new Date(shift.date).getFullYear()
      setRecurrenceEndDate(`${year}-12-31`)
    }
  }, [shift])

  useEffect(() => {
    if (caregiverId && caregiverId !== "unassigned" && shift) {
      checkConflicts()
    } else {
      setConflicts([])
    }
  }, [caregiverId, startTime, endTime])

  const checkConflicts = async () => {
    if (!shift || !caregiverId) return

    try {
      const response = await fetch("/api/scheduling/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverId,
          date: shift.date,
          startTime,
          endTime,
          excludeShiftId: shift.id,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.hasConflict) {
          setConflicts(result.conflicts)
        } else {
          setConflicts([])
        }
      }
    } catch (error) {
      console.error("Error checking conflicts:", error)
    }
  }

  const handleSave = async () => {
    if (!shift) return

    setIsSubmitting(true)
    try {
      const requestBody: Record<string, unknown> = {
        id: shift.id,
        caregiverId: caregiverId === "unassigned" ? null : caregiverId,
        startTime,
        endTime,
        internalNotes,
        instructionNotes,
      }

      // Include recurrence if selected and assigning a caregiver
      if (recurrenceType !== "NONE" && caregiverId !== "unassigned") {
        requestBody.recurrence = {
          type: recurrenceType,
          endDate: recurrenceEndDate || undefined,
          dayOfWeek: getEnglishDayName(shift.date),
        }
      }

      const response = await fetch("/api/scheduling/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.recurringUpdated > 0) {
          alert(`Zorgverlener toegewezen aan deze dienst en ${result.recurringUpdated} toekomstige diensten.`)
        }
        onSave(result.shift || result)
        onClose()
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!shift) return

    if (!confirm("Weet u zeker dat u deze dienst wilt verwijderen?")) {
      return
    }

    try {
      const response = await fetch(`/api/scheduling/shifts?id=${shift.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onSave(shift) // Trigger refresh
        onClose()
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const handleVerify = async (verified: boolean) => {
    if (!shift) return
    setIsVerifying(true)
    try {
      const response = await fetch("/api/scheduling/shifts/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: shift.id, verified }),
      })
      if (response.ok) {
        onSave(shift)
        onClose()
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    } finally {
      setIsVerifying(false)
    }
  }

  if (!shift) return null

  const isUnassigned = !shift.caregiver
  const isChangingAssignment = shift.caregiver && caregiverId !== shift.caregiver.id && caregiverId !== "unassigned"

  const isPastShift = (() => {
    const shiftDate = new Date(shift.date)
    shiftDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return shiftDate < today
  })()

  const isVerifiable = isPastShift &&
    shift.caregiver != null &&
    (shift.status === "FILLED" || shift.status === "COMPLETED")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isUnassigned ? "Zorgverlener Toewijzen" : "Dienst Bewerken"}
          </DialogTitle>
          <DialogDescription>
            {formatFullDate(shift.date)} - {shift.shiftType.name}
          </DialogDescription>
        </DialogHeader>

        {/* Time Correction Banner - for clients */}
        {shift.timeCorrectionStatus === "PENDING" && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-2">
                  Zorgverlener heeft afwijkende tijden doorgegeven
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-white rounded p-2 border border-orange-200">
                    <div className="text-xs text-muted-foreground">Ingepland</div>
                    <div className="font-medium text-sm">{shift.startTime} - {shift.endTime}</div>
                  </div>
                  <div className="bg-orange-100 rounded p-2 border border-orange-300">
                    <div className="text-xs text-orange-700">Werkelijk gewerkt</div>
                    <div className="font-medium text-sm text-orange-900">
                      {shift.actualStartTime} - {shift.actualEndTime}
                    </div>
                  </div>
                </div>
                {shift.caregiverNote && (
                  <p className="text-sm text-orange-800 italic mb-2">
                    &quot;{shift.caregiverNote}&quot;
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-400 text-orange-800 hover:bg-orange-100"
                  onClick={() => {
                    if (shift.actualStartTime) setStartTime(shift.actualStartTime)
                    if (shift.actualEndTime) setEndTime(shift.actualEndTime)
                  }}
                >
                  Tijden overnemen
                </Button>
              </div>
            </div>
          </div>
        )}

        {shift.timeCorrectionStatus === "ACKNOWLEDGED" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-900 font-medium">
              Tijdcorrectie van zorgverlener is verwerkt
            </span>
          </div>
        )}

        {/* Current Assignment Status */}
        {isUnassigned ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-orange-900 font-medium">
              Deze dienst is nog niet toegewezen aan een zorgverlener
            </span>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-900">
              <span className="font-medium">Huidige zorgverlener:</span>{" "}
              <span>{shift.caregiver?.name}</span>
            </div>
          </div>
        )}

        {/* Verification Section - only for verifiable past shifts */}
        {isVerifiable && (
          <div className={`border rounded-lg p-3 flex items-center justify-between ${
            shift.clientVerified
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-2">
              {shift.clientVerified ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-900 font-medium">
                    Gecontroleerd
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-900 font-medium">
                    Nog niet gecontroleerd
                  </span>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant={shift.clientVerified ? "outline" : "default"}
              onClick={() => handleVerify(!shift.clientVerified)}
              disabled={isVerifying}
            >
              {isVerifying
                ? "Bezig..."
                : shift.clientVerified
                ? "Markering ongedaan maken"
                : "Markeer als gecontroleerd"}
            </Button>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Starttijd</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Eindtijd</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Caregiver Selection */}
          <div className="space-y-2">
            <Label>Zorgverlener</Label>
            <Select value={caregiverId} onValueChange={setCaregiverId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer zorgverlener..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                {availableCaregivers.map((caregiver) => (
                  <SelectItem key={caregiver.id} value={caregiver.id}>
                    {caregiver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    ⚠️ Waarschuwing: Conflicterend Dienst
                  </h4>
                  {conflicts.map((conflict) => (
                    <p key={conflict.id} className="text-sm text-yellow-800">
                      Deze zorgverlener heeft al een dienst bij{" "}
                      <strong>{conflict.clientName}</strong> op dit tijdstip (
                      {conflict.shiftTypeName}: {conflict.startTime} -{" "}
                      {conflict.endTime})
                    </p>
                  ))}
                  <p className="text-sm text-yellow-700 mt-2">
                    Wilt u toch doorgaan met toewijzen?
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recurrence Option - only show when assigning a caregiver */}
          {caregiverId !== "unassigned" && (
            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <div className="space-y-2">
                <Label>Herhaling</Label>
                <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Geen herhaling" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Geen herhaling</SelectItem>
                    <SelectItem value="WEEKLY">
                      Elke week op {shift ? getDutchDayName(shift.date) : ""}
                    </SelectItem>
                    <SelectItem value="BIWEEKLY">
                      Om de week op {shift ? getDutchDayName(shift.date) : ""}
                    </SelectItem>
                    <SelectItem value="FIRST_OF_MONTH">
                      Eerste {shift ? getDutchDayName(shift.date) : ""} van de maand
                    </SelectItem>
                    <SelectItem value="LAST_OF_MONTH">
                      Laatste {shift ? getDutchDayName(shift.date) : ""} van de maand
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrenceType !== "NONE" && (
                <div className="space-y-2">
                  <Label htmlFor="recurrenceEndDate">Einddatum herhaling</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Zorgverlener wordt toegewezen aan alle overeenkomende onbezette diensten tot deze datum.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internalNotes">
              Interne Notitie{" "}
              <span className="text-xs text-muted-foreground">(alleen u)</span>
            </Label>
            <Textarea
              id="internalNotes"
              placeholder="Notities die alleen u kunt zien..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Instruction Notes */}
          <div className="space-y-2">
            <Label htmlFor="instructionNotes">
              Dienst Instructies{" "}
              <span className="text-xs text-muted-foreground">
                (zichtbaar voor zorgverlener)
              </span>
            </Label>
            <Textarea
              id="instructionNotes"
              placeholder="Instructies voor de zorgverlener..."
              value={instructionNotes}
              onChange={(e) => setInstructionNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDelete}>
            Verwijderen
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting
                ? "Bezig..."
                : isUnassigned
                ? "Toewijzen"
                : "Wijzigingen Opslaan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
