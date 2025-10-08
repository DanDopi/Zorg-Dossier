"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CAREGIVER_COLORS } from "@/lib/constants/colors"
import { Trash2, Edit2, Plus, X, Check, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ShiftType {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
  createdAt: Date
  updatedAt: Date
}

interface ShiftTypeManagementProps {
  initialShiftTypes: ShiftType[]
}

export default function ShiftTypeManagement({
  initialShiftTypes,
}: ShiftTypeManagementProps) {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(initialShiftTypes)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    startTime: "06:00",
    endTime: "14:00",
    color: CAREGIVER_COLORS[0].hex,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      name: "",
      startTime: "06:00",
      endTime: "14:00",
      color: CAREGIVER_COLORS[0].hex,
    })
    setIsCreating(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert("Naam is verplicht")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/scheduling/shift-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newShiftType = await response.json()
        setShiftTypes([...shiftTypes, newShiftType])
        resetForm()
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

  const handleEdit = (shiftType: ShiftType) => {
    setFormData({
      name: shiftType.name,
      startTime: shiftType.startTime,
      endTime: shiftType.endTime,
      color: shiftType.color,
    })
    setEditingId(shiftType.id)
    setIsCreating(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) {
      alert("Naam is verplicht")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/scheduling/shift-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...formData }),
      })

      if (response.ok) {
        const updatedShiftType = await response.json()
        setShiftTypes(
          shiftTypes.map((st) => (st.id === editingId ? updatedShiftType : st))
        )
        resetForm()
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

  const handleDelete = async (id: string) => {
    if (!confirm("Weet u zeker dat u dit diensttype wilt verwijderen?")) {
      return
    }

    try {
      const response = await fetch(`/api/scheduling/shift-types?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShiftTypes(shiftTypes.filter((st) => st.id !== id))
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diensttypes Beheren</h1>
          <p className="text-muted-foreground mt-2">
            Configureer de verschillende diensttypes voor uw rooster
          </p>
        </div>
        <div className="flex gap-2">
          {!isCreating && !editingId && (
            <>
              <Button asChild variant="outline">
                <Link href="/dashboard/rooster">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Terug naar Rooster
                </Link>
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nieuw Diensttype
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Diensttype Bewerken" : "Nieuw Diensttype"}
            </CardTitle>
            <CardDescription>
              Vul de gegevens in voor het diensttype
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  placeholder="Bijv. Vroege Dienst"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Kleur</Label>
                <div className="grid grid-cols-10 gap-2">
                  {CAREGIVER_COLORS.slice(0, 10).map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: color.hex })
                      }
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.color === color.hex
                          ? "ring-2 ring-offset-2 ring-black scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-10 gap-2 mt-2">
                  {CAREGIVER_COLORS.slice(10, 20).map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: color.hex })
                      }
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.color === color.hex
                          ? "ring-2 ring-offset-2 ring-black scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Starttijd</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Eindtijd</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={isSubmitting}
              >
                <Check className="mr-2 h-4 w-4" />
                {isSubmitting ? "Bezig..." : editingId ? "Bijwerken" : "Aanmaken"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="mr-2 h-4 w-4" />
                Annuleren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Types List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shiftTypes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-lg">Nog geen diensttypes aangemaakt</p>
              <p className="text-sm mt-2">
                Klik op &quot;Nieuw Diensttype&quot; om te beginnen
              </p>
            </CardContent>
          </Card>
        ) : (
          shiftTypes.map((shiftType) => (
            <Card key={shiftType.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: shiftType.color }}
              />
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{shiftType.name}</span>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: shiftType.color }}
                  />
                </CardTitle>
                <CardDescription>
                  {shiftType.startTime} - {shiftType.endTime}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(shiftType)}
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Bewerken
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(shiftType.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Verwijderen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
