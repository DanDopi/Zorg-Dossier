"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"

interface ShiftType {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
}

interface Caregiver {
  id: string
  name: string
  color?: string | null
}

interface CreateShiftDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  clientId: string
  shiftTypes: ShiftType[]
  caregivers: Caregiver[]
  selectedDate?: Date
}

export default function CreateShiftDialog({
  isOpen,
  onClose,
  onSave,
  clientId,
  shiftTypes,
  caregivers,
  selectedDate,
}: CreateShiftDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createPattern, setCreatePattern] = useState(false)

  const getYearEndDate = () => {
    const yearEnd = new Date(new Date().getFullYear(), 11, 31)
    return format(yearEnd, "yyyy-MM-dd")
  }

  const getMaxAllowedDate = () => {
    const nextYearEnd = new Date(new Date().getFullYear() + 1, 11, 31)
    return format(nextYearEnd, "yyyy-MM-dd")
  }

  const RECURRENCE_TYPES = [
    { value: "DAILY", label: "Elke dag" },
    { value: "WEEKLY", label: "Elke week" },
    { value: "BIWEEKLY", label: "Om de week" },
    { value: "FIRST_OF_MONTH", label: "Eerste van de maand" },
    { value: "LAST_OF_MONTH", label: "Laatste van de maand" },
  ] as const

  const [formData, setFormData] = useState({
    date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    shiftTypeId: shiftTypes[0]?.id || "",
    caregiverId: "unassigned",
    internalNotes: "",
    instructionNotes: "",
  })

  const [patternData, setPatternData] = useState({
    recurrenceType: "WEEKLY" as const,
    startDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    endDate: getYearEndDate(),
  })

  const selectedShiftType = shiftTypes.find((st) => st.id === formData.shiftTypeId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: Create the shift
      const shiftResponse = await fetch("/api/scheduling/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          shiftTypeId: formData.shiftTypeId,
          date: formData.date,
          startTime: selectedShiftType?.startTime,
          endTime: selectedShiftType?.endTime,
          caregiverId: formData.caregiverId === "unassigned" ? null : formData.caregiverId,
          internalNotes: formData.internalNotes || null,
          instructionNotes: formData.instructionNotes || null,
        }),
      })

      if (!shiftResponse.ok) {
        const data = await shiftResponse.json()
        throw new Error(data.error || "Fout bij aanmaken dienst")
      }

      // Step 2: If pattern is requested, create the pattern
      if (createPattern) {
        const patternResponse = await fetch("/api/scheduling/patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caregiverId: formData.caregiverId === "unassigned" ? null : formData.caregiverId,
            shiftTypeId: formData.shiftTypeId,
            recurrenceType: patternData.recurrenceType,
            startDate: patternData.startDate,
            endDate: patternData.endDate || null,
          }),
        })

        if (!patternResponse.ok) {
          const data = await patternResponse.json()
          console.error("Pattern creation failed:", data)
          // Don't throw - shift was created successfully
          alert(`Dienst aangemaakt, maar fout bij patroon aanmaken: ${data.error}`)
        } else {
          // Step 3: Generate shifts from the pattern
          const generateResponse = await fetch("/api/scheduling/generate", {
            method: "POST",
          })

          if (generateResponse.ok) {
            const result = await generateResponse.json()
            alert(
              `Dienst en patroon aangemaakt! ${result.generated} diensten automatisch gegenereerd.`
            )
          } else {
            alert("Dienst en patroon aangemaakt, maar fout bij genereren van diensten")
          }
        }
      }

      onSave()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een fout opgetreden")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      shiftTypeId: shiftTypes[0]?.id || "",
      caregiverId: "unassigned",
      internalNotes: "",
      instructionNotes: "",
    })
    setPatternData({
      recurrenceType: "WEEKLY",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: getYearEndDate(),
    })
    setCreatePattern(false)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe Dienst Aanmaken</DialogTitle>
          <DialogDescription>
            Maak een nieuwe dienst aan voor een specifieke datum
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shiftType">Diensttype</Label>
            <Select
              value={formData.shiftTypeId}
              onValueChange={(value) => setFormData({ ...formData, shiftTypeId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer diensttype" />
              </SelectTrigger>
              <SelectContent>
                {shiftTypes.map((shiftType) => (
                  <SelectItem key={shiftType.id} value={shiftType.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: shiftType.color }}
                      />
                      <span>
                        {shiftType.name} ({shiftType.startTime} - {shiftType.endTime})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caregiver">Zorgverlener (optioneel)</Label>
            <Select
              value={formData.caregiverId}
              onValueChange={(value) => setFormData({ ...formData, caregiverId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Niet toegewezen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                {caregivers.map((caregiver) => (
                  <SelectItem key={caregiver.id} value={caregiver.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: caregiver.color || "#9CA3AF" }}
                      >
                        {caregiver.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span>{caregiver.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              U kunt de dienst ook later toewijzen door erop te klikken in de kalender
            </p>
          </div>

          {/* Pattern Creation Option */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createPattern"
                checked={createPattern}
                onCheckedChange={(checked) => setCreatePattern(checked as boolean)}
              />
              <Label
                htmlFor="createPattern"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Maak terugkerend patroon van deze dienst
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatisch meerdere diensten aanmaken op basis van een herhaling
            </p>

            {createPattern && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="recurrenceType">Herhaling</Label>
                  <Select
                    value={patternData.recurrenceType}
                    onValueChange={(value) =>
                      setPatternData({ ...patternData, recurrenceType: value as typeof patternData.recurrenceType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Hoe vaak het patroon zich herhaalt
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patternStartDate">Patroon Startdatum</Label>
                  <Input
                    id="patternStartDate"
                    type="date"
                    value={patternData.startDate}
                    onChange={(e) =>
                      setPatternData({ ...patternData, startDate: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    De dag van de week wordt bepaald door de startdatum
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patternEndDate">Patroon Einddatum</Label>
                  <Input
                    id="patternEndDate"
                    type="date"
                    value={patternData.endDate}
                    max={getMaxAllowedDate()}
                    onChange={(e) =>
                      setPatternData({ ...patternData, endDate: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Standaard tot einde van het jaar. Maximum: 31 december{" "}
                    {new Date().getFullYear() + 1}.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Interne Notities</Label>
            <Textarea
              id="internalNotes"
              placeholder="Notities die alleen u kunt zien..."
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Deze notities zijn alleen zichtbaar voor u
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructionNotes">Instructies voor Zorgverlener</Label>
            <Textarea
              id="instructionNotes"
              placeholder="Instructies die de zorgverlener kan zien..."
              value={formData.instructionNotes}
              onChange={(e) =>
                setFormData({ ...formData, instructionNotes: e.target.value })
              }
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Deze instructies zijn zichtbaar voor de toegewezen zorgverlener
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Bezig..." : "Dienst Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
