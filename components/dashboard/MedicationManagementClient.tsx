"use client"

import { useState, useEffect } from "react"
import { getMaxFileSizeClient } from "@/lib/fileValidation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClient } from "@/lib/ClientContext"

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

export default function MedicationManagementClient({ user }: MedicationManagementClientProps) {
  const { selectedClient } = useClient()
  const [medications, setMedications] = useState<Medication[]>([])
  const [dailySchedule, setDailySchedule] = useState<DailySchedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
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

  // Administer medication state
  const [administerDialogOpen, setAdministerDialogOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ScheduleItem | null>(null)
  const [administrationNotes, setAdministrationNotes] = useState("")
  const [wasGiven, setWasGiven] = useState(true)
  const [skipReason, setSkipReason] = useState("")

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"
  const isToday = selectedDate === new Date().toISOString().split("T")[0]
  const isTodayOrPast = selectedDate <= new Date().toISOString().split("T")[0]

  // Load max file size on mount
  useEffect(() => {
    async function loadMaxFileSize() {
      const size = await getMaxFileSizeClient()
      setMaxFileSize(size)
    }
    loadMaxFileSize()
  }, [])

  useEffect(() => {
    // For clients, load data immediately
    if (isClient) {
      loadData()
    }
    // For caregivers, only load if a client is selected
    else if (isCaregiver && selectedClient) {
      loadData()
    }
  }, [selectedClient, selectedDate])

  async function loadData() {
    setIsLoading(true)
    try {
      const clientId = isClient ? undefined : selectedClient?.id
      const params = new URLSearchParams()
      if (clientId) params.set("clientId", clientId)
      params.set("date", selectedDate)

      const [scheduleRes, medsRes] = await Promise.all([
        fetch(`/api/medications/schedule?${params}`),
        fetch(`/api/medications?${new URLSearchParams(clientId ? { clientId } : {})}`),
      ])

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setDailySchedule(scheduleData)
      }

      if (medsRes.ok) {
        const medsData = await medsRes.json()
        setMedications(medsData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddMedication() {
    try {
      let finalImageUrl = newMedication.imageUrl

      // If user uploaded a file, convert to base64 data URL
      if (selectedImage) {
        finalImageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(selectedImage)
        })
      }

      const response = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMedication,
          imageUrl: finalImageUrl,
          clientId: selectedClient?.id || undefined,
        }),
      })

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
        const error = await response.json()
        console.error("API Error:", error)
        alert(error.error || "Fout bij toevoegen medicatie")
      }
    } catch (error) {
      console.error("Error adding medication:", error)
      alert("Er is een fout opgetreden")
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
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

      setSelectedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
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

      setEditSelectedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij registreren medicatie")
      }
    } catch (error) {
      console.error("Error administering medication:", error)
      alert("Er is een fout opgetreden")
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
      let finalImageUrl = editMedicationForm.imageUrl

      // If user uploaded a new file, convert to base64 data URL
      if (editSelectedImage) {
        finalImageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(editSelectedImage)
        })
      }

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

  function changeDate(days: number) {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  function goToToday() {
    setSelectedDate(new Date().toISOString().split("T")[0])
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
            <h1 className="text-3xl font-bold text-gray-900">Medicatiebeheer</h1>
            <p className="text-muted-foreground mt-1">
              {isClient
                ? "Beheer uw medicatie en bekijk de toedieningsgeschiedenis"
                : "Bekijk medicatie en registreer toediening"}
            </p>
          </div>
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
                    />
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

        {/* Date Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => changeDate(-1)}>
                ← Vorige Dag
              </Button>
              <div className="flex items-center gap-4">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
                {!isToday && (
                  <Button variant="outline" onClick={goToToday}>
                    Naar Vandaag
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => changeDate(1)}>
                Volgende Dag →
              </Button>
            </div>
          </CardContent>
        </Card>

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
                      <Button
                        onClick={() => {
                          setSelectedScheduleItem(item)
                          setAdministerDialogOpen(true)
                        }}
                      >
                        Registreer
                      </Button>
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

        {/* Active Medications List */}
        {isClient && medications.length > 0 && (
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
              />
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
