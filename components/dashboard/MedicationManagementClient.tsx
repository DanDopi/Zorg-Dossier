"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}

interface User {
  id: string
  email: string
  role: string
  clientProfile?: {
    id: string
    name: string
  }
  caregiverProfile?: {
    id: string
    name: string
    clientRelationships: Array<{
      client: {
        id: string
        name: string
        user: {
          email: string
        }
      }
    }>
  }
}

interface MedicationManagementClientProps {
  user: User
}

export default function MedicationManagementClient({ user }: MedicationManagementClientProps) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [dailySchedule, setDailySchedule] = useState<DailySchedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string>("")

  // Add medication dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    unit: "mg",
    frequency: "daily",
    instructions: "",
    times: ["08:00"],
  })

  // Administer medication state
  const [administerDialogOpen, setAdministerDialogOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ScheduleItem | null>(null)
  const [administrationNotes, setAdministrationNotes] = useState("")
  const [wasGiven, setWasGiven] = useState(true)
  const [skipReason, setSkipReason] = useState("")

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"
  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (isCaregiver && user.caregiverProfile?.clientRelationships.length) {
      setSelectedClient(user.caregiverProfile.clientRelationships[0].client.id)
    } else if (isClient) {
      // For clients, load data immediately
      loadData()
    }
  }, [])

  useEffect(() => {
    // For caregivers: reload when client or date changes
    if (isCaregiver && selectedClient) {
      loadData()
    }
    // For clients: reload when date changes
    else if (isClient) {
      loadData()
    }
  }, [selectedClient, selectedDate])

  async function loadData() {
    setIsLoading(true)
    try {
      const clientId = isClient ? undefined : selectedClient
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
      const response = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMedication,
          clientId: selectedClient || undefined,
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
        })
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij toevoegen medicatie")
      }
    } catch (error) {
      console.error("Error adding medication:", error)
      alert("Er is een fout opgetreden")
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

        {/* Client selector for caregivers */}
        {isCaregiver && user.caregiverProfile?.clientRelationships && (
          <Card>
            <CardHeader>
              <CardTitle>Selecteer Cliënt</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een cliënt" />
                </SelectTrigger>
                <SelectContent>
                  {user.caregiverProfile.clientRelationships.map((rel) => (
                    <SelectItem key={rel.client.id} value={rel.client.id}>
                      {rel.client.name} ({rel.client.user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

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
                        <div className="font-medium text-lg">{item.medication.name}</div>
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
                    {isCaregiver && item.status === "pending" && isToday && (
                      <Button
                        onClick={() => {
                          setSelectedScheduleItem(item)
                          setAdministerDialogOpen(true)
                        }}
                      >
                        Registreer
                      </Button>
                    )}
                    {item.status === "pending" && !isToday && (
                      <span className="text-muted-foreground text-sm">
                        Niet toegediend
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
                  <div key={med.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{med.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {med.dosage} {med.unit} - {med.frequency}
                      {med.instructions && ` - ${med.instructions}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tijden: {JSON.parse(med.times).join(", ")}
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
    </div>
  )
}
