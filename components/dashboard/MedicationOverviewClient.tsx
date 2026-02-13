"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getMaxFileSizeClient } from "@/lib/fileValidation"
import { compressImage } from "@/lib/imageCompression"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClient } from "@/lib/ClientContext"

interface Medication {
  id: string
  name: string
  dosage: string
  unit: string
  frequency: string
  instructions?: string
  times: string
  isActive: boolean
  startDate?: Date | null
  endDate?: Date | null
  imageUrl?: string | null
}

interface User {
  id: string
  email: string
  role: string
  clientProfile?: {
    id: string
    name: string
  } | null
  caregiverProfile?: {
    id: string
    name: string
  } | null
}

interface MedicationOverviewClientProps {
  user: User
}

export default function MedicationOverviewClient({ user }: MedicationOverviewClientProps) {
  const { selectedClient } = useClient()
  const [medications, setMedications] = useState<Medication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [maxFileSize, setMaxFileSize] = useState(5 * 1024 * 1024) // Default 5MB

  // Add medication dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    unit: "mg",
    frequency: "daily",
    instructions: "",
    times: ["08:00"],
    startDate: "",
    endDate: "",
    imageUrl: "",
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Edit medication dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null)
  const [editMedicationForm, setEditMedicationForm] = useState({
    name: "",
    dosage: "",
    unit: "mg",
    frequency: "daily",
    instructions: "",
    times: ["08:00"],
    startDate: "",
    endDate: "",
    imageUrl: "",
  })
  const [editSelectedImage, setEditSelectedImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)

  // Image view dialog state
  const [imageViewDialogOpen, setImageViewDialogOpen] = useState(false)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)

  const isClient = user.role === "CLIENT"

  useEffect(() => {
    // Get max file size from client-side function
    getMaxFileSizeClient().then(size => {
      setMaxFileSize(size)
    })

    loadData()
  }, [selectedClient])

  async function loadData() {
    try {
      const clientId = isClient ? user.clientProfile?.id : selectedClient?.id
      if (!clientId) {
        setIsLoading(false)
        return
      }

      const params = new URLSearchParams({
        clientId,
      })

      const response = await fetch(`/api/medications?${params}`)
      if (!response.ok) throw new Error("Kon medicatie niet laden")

      const data = await response.json()
      setMedications(data)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddMedication() {
    try {
      // Use compressed base64 from preview, or existing imageUrl
      const finalImageUrl = imagePreview || newMedication.imageUrl

      // Build request payload - only include clientId if it exists
      const payload: any = {
        ...newMedication,
        imageUrl: finalImageUrl,
      }

      // For caregivers, include clientId if selected
      if (selectedClient?.id) {
        payload.clientId = selectedClient.id
      }

      console.log("Sending medication data:", { ...payload, imageUrl: payload.imageUrl ? `[${payload.imageUrl.substring(0, 30)}...]` : null })

      const response = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      console.log("Response status:", response.status, response.statusText)

      if (response.ok) {
        setIsAddDialogOpen(false)
        setNewMedication({
          name: "",
          dosage: "",
          unit: "mg",
          frequency: "daily",
          instructions: "",
          times: ["08:00"],
          startDate: "",
          endDate: "",
          imageUrl: "",
        })
        setSelectedImage(null)
        setImagePreview(null)
        loadData()
      } else {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)

        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: "Er is een fout opgetreden" }
        }

        console.error("API Error:", error)
        alert(error.error || error.details || "Fout bij toevoegen medicatie")
      }
    } catch (error) {
      console.error("Error adding medication:", error)
      alert("Er is een fout opgetreden")
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Selecteer een geldig afbeeldingsbestand')
        return
      }

      // Validate file size
      if (file.size > maxFileSize) {
        const maxMB = (maxFileSize / (1024 * 1024)).toFixed(0)
        alert(`Afbeelding is te groot. Maximaal ${maxMB}MB toegestaan.`)
        return
      }

      try {
        const result = await compressImage(file)
        setSelectedImage(result.file)
        setImagePreview(result.base64)
      } catch {
        alert('Kon afbeelding niet verwerken. Probeer een ander bestand.')
      }
    }
  }

  async function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Selecteer een geldig afbeeldingsbestand')
        return
      }

      // Validate file size
      if (file.size > maxFileSize) {
        const maxMB = (maxFileSize / (1024 * 1024)).toFixed(0)
        alert(`Afbeelding is te groot. Maximaal ${maxMB}MB toegestaan.`)
        return
      }

      try {
        const result = await compressImage(file)
        setEditSelectedImage(result.file)
        setEditImagePreview(result.base64)
      } catch {
        alert('Kon afbeelding niet verwerken. Probeer een ander bestand.')
      }
    }
  }

  async function handleDeleteMedication(medicationId: string) {
    if (!confirm("Weet u zeker dat u deze medicatie wilt verwijderen?")) {
      return
    }

    try {
      const response = await fetch(`/api/medications?id=${medicationId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij verwijderen medicatie")
      }
    } catch (error) {
      console.error("Error deleting medication:", error)
      alert("Er is een fout opgetreden")
    }
  }

  function openEditDialog(medication: Medication) {
    setEditingMedication(medication)
    setEditMedicationForm({
      name: medication.name,
      dosage: medication.dosage,
      unit: medication.unit,
      frequency: medication.frequency,
      instructions: medication.instructions || "",
      times: JSON.parse(medication.times),
      startDate: medication.startDate ? new Date(medication.startDate).toISOString().split("T")[0] : "",
      endDate: medication.endDate ? new Date(medication.endDate).toISOString().split("T")[0] : "",
      imageUrl: medication.imageUrl || "",
    })
    setEditImagePreview(medication.imageUrl || null)
    setEditSelectedImage(null)
    setIsEditDialogOpen(true)
  }

  async function handleUpdateMedication() {
    if (!editingMedication) return

    try {
      // Use compressed base64 from edit preview, or existing imageUrl
      const finalImageUrl = editImagePreview || editMedicationForm.imageUrl

      const response = await fetch("/api/medications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMedication.id,
          ...editMedicationForm,
          imageUrl: finalImageUrl,
        }),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingMedication(null)
        setEditMedicationForm({
          name: "",
          dosage: "",
          unit: "mg",
          frequency: "daily",
          instructions: "",
          times: ["08:00"],
          startDate: "",
          endDate: "",
          imageUrl: "",
        })
        setEditSelectedImage(null)
        setEditImagePreview(null)
        loadData()
      } else {
        const error = await response.json()
        console.error("API Error:", error)
        alert(error.error || "Fout bij bijwerken medicatie")
      }
    } catch (error) {
      console.error("Error updating medication:", error)
      alert("Er is een fout opgetreden")
    }
  }

  function addEditTimeSlot() {
    setEditMedicationForm({
      ...editMedicationForm,
      times: [...editMedicationForm.times, "12:00"],
    })
  }

  function updateEditTimeSlot(index: number, value: string) {
    const newTimes = [...editMedicationForm.times]
    newTimes[index] = value
    setEditMedicationForm({ ...editMedicationForm, times: newTimes })
  }

  function removeEditTimeSlot(index: number) {
    if (editMedicationForm.times.length > 1) {
      setEditMedicationForm({
        ...editMedicationForm,
        times: editMedicationForm.times.filter((_, i) => i !== index),
      })
    }
  }

  function addTimeSlot() {
    setNewMedication({
      ...newMedication,
      times: [...newMedication.times, "12:00"],
    })
  }

  function updateTimeSlot(index: number, value: string) {
    const newTimes = [...newMedication.times]
    newTimes[index] = value
    setNewMedication({ ...newMedication, times: newTimes })
  }

  function removeTimeSlot(index: number) {
    if (newMedication.times.length > 1) {
      setNewMedication({
        ...newMedication,
        times: newMedication.times.filter((_, i) => i !== index),
      })
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medicatie Overzicht</h1>
            <p className="text-muted-foreground mt-1">
              Beheer al uw actieve medicatie
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/medicatie">
              <Button variant="outline">
                ← Terug naar Medicatiebeheer
              </Button>
            </Link>
            {isClient && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Medicatie Toevoegen</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Medicatie Toevoegen</DialogTitle>
                    <DialogDescription>
                      Voeg een nieuwe medicatie toe aan uw medicatielijst
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Medicijnnaam *</Label>
                      <Input
                        id="name"
                        value={newMedication.name}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, name: e.target.value })
                        }
                        placeholder="Bijv. Paracetamol"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="dosage">Dosering *</Label>
                        <Input
                          id="dosage"
                          value={newMedication.dosage}
                          onChange={(e) =>
                            setNewMedication({ ...newMedication, dosage: e.target.value })
                          }
                          placeholder="Bijv. 500"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="unit">Eenheid *</Label>
                        <Select
                          value={newMedication.unit}
                          onValueChange={(value) =>
                            setNewMedication({ ...newMedication, unit: value })
                          }
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
                      <Label htmlFor="frequency">Frequentie *</Label>
                      <Select
                        value={newMedication.frequency}
                        onValueChange={(value) =>
                          setNewMedication({ ...newMedication, frequency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Dagelijks</SelectItem>
                          <SelectItem value="twice-daily">2x per dag</SelectItem>
                          <SelectItem value="three-times-daily">3x per dag</SelectItem>
                          <SelectItem value="weekly">Wekelijks</SelectItem>
                          <SelectItem value="as-needed">Zo nodig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Tijdstippen *</Label>
                      {newMedication.times.map((time, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => updateTimeSlot(index, e.target.value)}
                          />
                          {newMedication.times.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeTimeSlot(index)}
                            >
                              Verwijder
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addTimeSlot}>
                        + Tijdstip Toevoegen
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="instructions">Instructies</Label>
                      <Input
                        id="instructions"
                        value={newMedication.instructions}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, instructions: e.target.value })
                        }
                        placeholder="Bijv. Innemen met voedsel"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Startdatum (optioneel)</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newMedication.startDate}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, startDate: e.target.value })
                        }
                        max={`${new Date().getFullYear() + 1}-12-31`}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="endDate">Einddatum (optioneel)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newMedication.endDate}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, endDate: e.target.value })
                        }
                        max={`${new Date().getFullYear() + 1}-12-31`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum: 31 december {new Date().getFullYear() + 1}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="imageFile">Afbeelding (optioneel)</Label>
                      <Input
                        id="imageFile"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="Medicatie voorbeeld"
                            className="max-w-xs max-h-40 object-contain border rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button onClick={handleAddMedication}>Toevoegen</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Active Medications List */}
        {medications.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Actieve Medicatie</CardTitle>
              <CardDescription>
                Al uw actieve medicijnen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {medications.map((med) => (
                  <div key={med.id} className="p-3 border rounded-lg flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium">{med.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {med.dosage} {med.unit} - {med.frequency}
                        {med.instructions && ` - ${med.instructions}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tijden: {JSON.parse(med.times).join(", ")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {med.imageUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingImageUrl(med.imageUrl!)
                            setImageViewDialogOpen(true)
                          }}
                        >
                          Afbeelding
                        </Button>
                      )}
                      {isClient && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(med)}
                          >
                            Bewerk
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteMedication(med.id)}
                          >
                            Verwijder
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Nog geen actieve medicatie</p>
              {isClient && (
                <p className="text-sm mt-2">Voeg uw eerste medicatie toe met de knop hierboven</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit medication dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medicatie Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de gegevens van {editingMedication?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Medicijnnaam *</Label>
              <Input
                id="edit-name"
                value={editMedicationForm.name}
                onChange={(e) =>
                  setEditMedicationForm({ ...editMedicationForm, name: e.target.value })
                }
                placeholder="Bijv. Paracetamol"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-dosage">Dosering *</Label>
                <Input
                  id="edit-dosage"
                  value={editMedicationForm.dosage}
                  onChange={(e) =>
                    setEditMedicationForm({ ...editMedicationForm, dosage: e.target.value })
                  }
                  placeholder="Bijv. 500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-unit">Eenheid *</Label>
                <Select
                  value={editMedicationForm.unit}
                  onValueChange={(value) =>
                    setEditMedicationForm({ ...editMedicationForm, unit: value })
                  }
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
              <Label htmlFor="edit-frequency">Frequentie *</Label>
              <Select
                value={editMedicationForm.frequency}
                onValueChange={(value) =>
                  setEditMedicationForm({ ...editMedicationForm, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Dagelijks</SelectItem>
                  <SelectItem value="twice-daily">2x per dag</SelectItem>
                  <SelectItem value="three-times-daily">3x per dag</SelectItem>
                  <SelectItem value="weekly">Wekelijks</SelectItem>
                  <SelectItem value="as-needed">Zo nodig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tijdstippen *</Label>
              {editMedicationForm.times.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateEditTimeSlot(index, e.target.value)}
                  />
                  {editMedicationForm.times.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeEditTimeSlot(index)}
                    >
                      Verwijder
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addEditTimeSlot}>
                + Tijdstip Toevoegen
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-instructions">Instructies</Label>
              <Input
                id="edit-instructions"
                value={editMedicationForm.instructions}
                onChange={(e) =>
                  setEditMedicationForm({ ...editMedicationForm, instructions: e.target.value })
                }
                placeholder="Bijv. Innemen met voedsel"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-startDate">Startdatum (optioneel)</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={editMedicationForm.startDate}
                onChange={(e) =>
                  setEditMedicationForm({ ...editMedicationForm, startDate: e.target.value })
                }
                max={`${new Date().getFullYear() + 1}-12-31`}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-endDate">Einddatum (optioneel)</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={editMedicationForm.endDate}
                onChange={(e) =>
                  setEditMedicationForm({ ...editMedicationForm, endDate: e.target.value })
                }
                max={`${new Date().getFullYear() + 1}-12-31`}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: 31 december {new Date().getFullYear() + 1}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-imageFile">Afbeelding (optioneel)</Label>
              <Input
                id="edit-imageFile"
                type="file"
                accept="image/*"
                onChange={handleEditImageSelect}
              />
              {editImagePreview && (
                <div className="mt-2">
                  <img
                    src={editImagePreview}
                    alt="Medicatie voorbeeld"
                    className="max-w-xs max-h-40 object-contain border rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleUpdateMedication}>Opslaan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image view dialog */}
      <Dialog open={imageViewDialogOpen} onOpenChange={setImageViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Medicatie Afbeelding</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {viewingImageUrl && (
              <img
                src={viewingImageUrl}
                alt="Medicatie afbeelding"
                className="max-w-full max-h-[70vh] object-contain"
                onError={(e) => {
                  e.currentTarget.src = ""
                  e.currentTarget.alt = "Afbeelding kon niet geladen worden"
                }}
              />
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setImageViewDialogOpen(false)}>Sluiten</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
