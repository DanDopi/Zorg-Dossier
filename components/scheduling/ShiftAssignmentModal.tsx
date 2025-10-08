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
import { AlertCircle } from "lucide-react"
import { formatFullDate } from "@/lib/utils/calendar"

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  internalNotes?: string | null
  instructionNotes?: string | null
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

  useEffect(() => {
    if (shift) {
      setCaregiverId(shift.caregiver?.id || "unassigned")
      setStartTime(shift.startTime)
      setEndTime(shift.endTime)
      setInternalNotes(shift.internalNotes || "")
      setInstructionNotes(shift.instructionNotes || "")
      setConflicts([])
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
      const response = await fetch("/api/scheduling/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: shift.id,
          caregiverId: caregiverId === "unassigned" ? null : caregiverId,
          startTime,
          endTime,
          internalNotes,
          instructionNotes,
        }),
      })

      if (response.ok) {
        const updatedShift = await response.json()
        onSave(updatedShift)
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

  if (!shift) return null

  const isUnassigned = !shift.caregiver
  const isChangingAssignment = shift.caregiver && caregiverId !== shift.caregiver.id && caregiverId !== "unassigned"

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
