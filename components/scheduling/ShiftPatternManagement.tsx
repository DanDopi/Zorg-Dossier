"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Trash2, Calendar, RefreshCw, Settings as SettingsIcon, Pencil, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import Link from "next/link"

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

interface ShiftPattern {
  id: string
  recurrenceType: "DAILY" | "WEEKLY" | "BIWEEKLY" | "FIRST_OF_MONTH" | "LAST_OF_MONTH"
  startDate: Date
  endDate: Date | null
  isActive: boolean
  shiftType: ShiftType
  caregiver?: {
    id: string
    name: string
    color?: string | null
  } | null
}

interface Settings {
  id: string
  weeksAhead: number
  lastGenerated: Date | null
}

interface ShiftPatternManagementProps {
  clientId: string
  shiftTypes: ShiftType[]
  caregivers: Caregiver[]
}

const RECURRENCE_TYPES = [
  { value: "DAILY", label: "Elke dag" },
  { value: "WEEKLY", label: "Elke week" },
  { value: "BIWEEKLY", label: "Om de week" },
  { value: "FIRST_OF_MONTH", label: "Eerste van de maand" },
  { value: "LAST_OF_MONTH", label: "Laatste van de maand" },
] as const

export default function ShiftPatternManagement({
  clientId,
  shiftTypes,
  caregivers,
}: ShiftPatternManagementProps) {
  const [patterns, setPatterns] = useState<ShiftPattern[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null)

  // Calculate year-end date for default
  const getYearEndDate = () => {
    const yearEnd = new Date(new Date().getFullYear(), 11, 31)
    return format(yearEnd, "yyyy-MM-dd")
  }

  // Calculate maximum allowed end date (end of next year)
  const getMaxAllowedDate = () => {
    const nextYearEnd = new Date(new Date().getFullYear() + 1, 11, 31)
    return format(nextYearEnd, "yyyy-MM-dd")
  }

  // Validate end date is not too far in the future
  const validateEndDate = (endDate: string): boolean => {
    if (!endDate) return true // Empty is OK (will default to year-end)

    const inputDate = new Date(endDate)
    const maxDate = new Date(new Date().getFullYear() + 1, 11, 31, 23, 59, 59, 999)

    return inputDate <= maxDate
  }

  const [formData, setFormData] = useState({
    caregiverId: caregivers[0]?.id || "",
    shiftTypeId: shiftTypes[0]?.id || "",
    recurrenceType: "WEEKLY" as const,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: getYearEndDate(),
  })

  const [editFormData, setEditFormData] = useState({
    caregiverId: "",
    shiftTypeId: "",
    recurrenceType: "WEEKLY" as const,
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    fetchPatterns()
  }, [])

  const fetchPatterns = async () => {
    try {
      const response = await fetch(`/api/scheduling/patterns?clientId=${clientId}`)
      if (response.ok) {
        const data = await response.json()
        const patternsWithDates = data.map((p: ShiftPattern) => ({
          ...p,
          startDate: new Date(p.startDate),
          endDate: p.endDate ? new Date(p.endDate) : null,
        }))
        setPatterns(patternsWithDates)
      }
    } catch (error) {
      console.error("Error fetching patterns:", error)
    } finally {
      setLoading(false)
    }
  }


  const handleCreatePattern = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate end date
    if (formData.endDate && !validateEndDate(formData.endDate)) {
      const currentYear = new Date().getFullYear()
      alert(`Einddatum kan maximaal tot 31 december ${currentYear + 1}`)
      return
    }

    try {
      const response = await fetch("/api/scheduling/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          endDate: formData.endDate || null,
        }),
      })

      if (response.ok) {
        await fetchPatterns()
        setIsCreateDialogOpen(false)
        setFormData({
          caregiverId: caregivers[0]?.id || "",
          shiftTypeId: shiftTypes[0]?.id || "",
          recurrenceType: "WEEKLY",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: getYearEndDate(),
        })

        // Automatically generate shifts for the new pattern
        const generateResponse = await fetch("/api/scheduling/generate", {
          method: "POST",
        })

        if (generateResponse.ok) {
          const result = await generateResponse.json()
          alert(
            `Patroon aangemaakt! ${result.generated} diensten automatisch gegenereerd.`
          )
        } else {
          alert("Patroon aangemaakt, maar fout bij genereren van diensten")
        }
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const handleDeletePattern = async (id: string) => {
    if (!confirm("Weet u zeker dat u dit patroon wilt verwijderen? Alle toekomstige diensten van dit patroon worden ook verwijderd.")) {
      return
    }

    try {
      const response = await fetch(`/api/scheduling/patterns?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const result = await response.json()
        setPatterns(patterns.filter((p) => p.id !== id))
        alert(`Patroon verwijderd! ${result.deletedShifts} toekomstige diensten zijn ook verwijderd.`)
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const handleEditPattern = (pattern: ShiftPattern) => {
    setEditingPattern(pattern)
    setEditFormData({
      caregiverId: pattern.caregiver.id,
      shiftTypeId: pattern.shiftType.id,
      recurrenceType: pattern.recurrenceType,
      startDate: format(pattern.startDate, "yyyy-MM-dd"),
      endDate: pattern.endDate ? format(pattern.endDate, "yyyy-MM-dd") : getYearEndDate(),
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdatePattern = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPattern) return

    // Validate end date
    if (editFormData.endDate && !validateEndDate(editFormData.endDate)) {
      const currentYear = new Date().getFullYear()
      alert(`Einddatum kan maximaal tot 31 december ${currentYear + 1}`)
      return
    }

    if (
      !confirm(
        "Dit zal alle toekomstige diensten van dit patroon verwijderen en opnieuw genereren. Doorgaan?"
      )
    ) {
      return
    }

    try {
      const response = await fetch("/api/scheduling/patterns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPattern.id,
          caregiverId: editFormData.caregiverId,
          shiftTypeId: editFormData.shiftTypeId,
          recurrenceType: editFormData.recurrenceType,
          startDate: editFormData.startDate,
          endDate: editFormData.endDate || null,
          regenerateShifts: true,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        await fetchPatterns()
        setIsEditDialogOpen(false)
        const patternId = editingPattern.id
        setEditingPattern(null)

        // Trigger shift regeneration for only this specific pattern
        const generateResponse = await fetch("/api/scheduling/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patternId }),
        })

        if (generateResponse.ok) {
          const generateResult = await generateResponse.json()
          alert(
            `Patroon bijgewerkt! ${result.deletedShifts} oude diensten verwijderd, ${generateResult.generated} nieuwe diensten aangemaakt.`
          )
        } else {
          alert("Patroon bijgewerkt, maar fout bij genereren van nieuwe diensten")
        }
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const getRecurrenceLabel = (recurrenceType: string) => {
    return RECURRENCE_TYPES.find((r) => r.value === recurrenceType)?.label || ""
  }

  if (loading) {
    return <div>Laden...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Terugkerende Patronen</h1>
          <p className="text-muted-foreground mt-2">
            Stel in welke zorgverlener op welke dag werkt en genereer automatisch diensten
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/rooster">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar Rooster
            </Link>
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nieuw Patroon
          </Button>
        </div>
      </div>

      {/* Pattern Stats */}
      <Card>
        <CardContent className="pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Actieve patronen</p>
            <p className="text-2xl font-bold">
              {patterns.filter((p) => p.isActive).length}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Patterns List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Patronen</h2>
        {patterns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">Nog geen patronen aangemaakt</p>
              <p className="text-sm mt-2">
                Klik op &quot;Nieuw Patroon&quot; om te beginnen
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {patterns
              .filter((p) => p.isActive)
              .map((pattern) => (
                <Card key={pattern.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{
                              backgroundColor: pattern.caregiver?.color || "#9CA3AF",
                            }}
                          >
                            {pattern.caregiver
                              ? pattern.caregiver.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "?"}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {pattern.caregiver?.name || "Niet toegewezen"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getRecurrenceLabel(pattern.recurrenceType)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: pattern.shiftType.color }}
                            />
                            <span className="text-sm">
                              {pattern.shiftType.name} ({pattern.shiftType.startTime} -{" "}
                              {pattern.shiftType.endTime})
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Vanaf {format(pattern.startDate, "d MMM yyyy", { locale: nl })}
                            {pattern.endDate &&
                              ` tot ${format(pattern.endDate, "d MMM yyyy", { locale: nl })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPattern(pattern)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePattern(pattern.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Create Pattern Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuw Terugkerend Patroon</DialogTitle>
            <DialogDescription>
              Maak een patroon aan voor een vaste dienst op een bepaalde dag
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePattern} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="caregiver">Zorgverlener</Label>
              <Select
                value={formData.caregiverId}
                onValueChange={(value) => setFormData({ ...formData, caregiverId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {caregivers.map((cg) => (
                    <SelectItem key={cg.id} value={cg.id}>
                      {cg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shiftType">Diensttype</Label>
              <Select
                value={formData.shiftTypeId}
                onValueChange={(value) => setFormData({ ...formData, shiftTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shiftTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name} ({st.startTime} - {st.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrenceType">Herhaling</Label>
              <Select
                value={formData.recurrenceType}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, recurrenceType: value })
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Startdatum</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Einddatum</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                max={getMaxAllowedDate()}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Standaard tot einde van het jaar. Maximum: 31 december {new Date().getFullYear() + 1}.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit">Patroon Aanmaken</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Pattern Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patroon Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig het terugkerende patroon. Bestaande diensten worden bijgewerkt.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePattern} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-caregiver">Zorgverlener</Label>
              <Select
                value={editFormData.caregiverId}
                onValueChange={(value) => setEditFormData({ ...editFormData, caregiverId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {caregivers.map((cg) => (
                    <SelectItem key={cg.id} value={cg.id}>
                      {cg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-shiftType">Diensttype</Label>
              <Select
                value={editFormData.shiftTypeId}
                onValueChange={(value) => setEditFormData({ ...editFormData, shiftTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shiftTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name} ({st.startTime} - {st.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-recurrenceType">Herhaling</Label>
              <Select
                value={editFormData.recurrenceType}
                onValueChange={(value: any) =>
                  setEditFormData({ ...editFormData, recurrenceType: value })
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Startdatum</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={editFormData.startDate}
                onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-endDate">Einddatum</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={editFormData.endDate}
                max={getMaxAllowedDate()}
                onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Standaard tot einde van het jaar. Maximum: 31 december {new Date().getFullYear() + 1}.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit">Patroon Bijwerken</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
