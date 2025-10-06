"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClient } from "@/lib/ClientContext"

interface DefecationRecord {
  id: string
  recordDate: string
  recordTime: string
  amount?: string
  consistency?: string
  notes?: string
  caregiver: {
    name: string
    user: {
      email: string
    }
  }
}

interface UrineRecord {
  id: string
  recordDate: string
  recordTime: string
  volume: number
  notes?: string
  caregiver: {
    name: string
    user: {
      email: string
    }
  }
}

interface FluidIntakeRecord {
  id: string
  recordDate: string
  recordTime: string
  volume: number
  fluidType?: string
  notes?: string
  caregiver: {
    name: string
    user: {
      email: string
    }
  }
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

interface IORegistratieClientProps {
  user: User
}

export default function IORegistratieClient({ user }: IORegistratieClientProps) {
  const { selectedClient } = useClient()
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(true)

  // Defecation state
  const [defecationRecords, setDefecationRecords] = useState<DefecationRecord[]>([])
  const [isDefecationDialogOpen, setIsDefecationDialogOpen] = useState(false)
  const [newDefecation, setNewDefecation] = useState({
    time: new Date().toTimeString().slice(0, 5),
    amount: "normal",
    consistency: "normal",
    notes: "",
  })

  // Urine state
  const [urineRecords, setUrineRecords] = useState<UrineRecord[]>([])
  const [isUrineDialogOpen, setIsUrineDialogOpen] = useState(false)
  const [newUrine, setNewUrine] = useState({
    time: new Date().toTimeString().slice(0, 5),
    volume: "",
    notes: "",
  })

  // Fluid intake state
  const [fluidIntakeRecords, setFluidIntakeRecords] = useState<FluidIntakeRecord[]>([])
  const [isFluidIntakeDialogOpen, setIsFluidIntakeDialogOpen] = useState(false)
  const [newFluidIntake, setNewFluidIntake] = useState({
    time: new Date().toTimeString().slice(0, 5),
    volume: "",
    fluidType: "water",
    notes: "",
  })

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"
  const isTodayOrPast = selectedDate <= new Date().toISOString().split("T")[0]

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

      const [defecationRes, urineRes, fluidIntakeRes] = await Promise.all([
        fetch(`/api/io/defecation?${params}`),
        fetch(`/api/io/urine?${params}`),
        fetch(`/api/io/fluid-intake?${params}`),
      ])

      if (defecationRes.ok) {
        const defecationData = await defecationRes.json()
        setDefecationRecords(defecationData)
      }

      if (urineRes.ok) {
        const urineData = await urineRes.json()
        setUrineRecords(urineData)
      }

      if (fluidIntakeRes.ok) {
        const fluidIntakeData = await fluidIntakeRes.json()
        setFluidIntakeRecords(fluidIntakeData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddDefecation() {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = newDefecation.time.split(":").map(Number)

      const recordDate = new Date(year, month - 1, day)
      const recordTime = new Date(year, month - 1, day, hours, minutes)

      const response = await fetch("/api/io/defecation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id || undefined,
          recordDate: recordDate.toISOString(),
          recordTime: recordTime.toISOString(),
          amount: newDefecation.amount,
          consistency: newDefecation.consistency,
          notes: newDefecation.notes || null,
        }),
      })

      if (response.ok) {
        setIsDefecationDialogOpen(false)
        setNewDefecation({
          time: new Date().toTimeString().slice(0, 5),
          amount: "normal",
          consistency: "normal",
          notes: "",
        })
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij toevoegen defecatie")
      }
    } catch (error) {
      console.error("Error adding defecation:", error)
      alert("Er is een fout opgetreden")
    }
  }

  async function handleDeleteDefecation(recordId: string) {
    if (!confirm("Weet u zeker dat u dit record wilt verwijderen?")) {
      return
    }

    try {
      const response = await fetch(`/api/io/defecation?id=${recordId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij verwijderen record")
      }
    } catch (error) {
      console.error("Error deleting defecation:", error)
      alert("Er is een fout opgetreden")
    }
  }

  async function handleAddUrine() {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = newUrine.time.split(":").map(Number)

      const recordDate = new Date(year, month - 1, day)
      const recordTime = new Date(year, month - 1, day, hours, minutes)

      const response = await fetch("/api/io/urine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id || undefined,
          recordDate: recordDate.toISOString(),
          recordTime: recordTime.toISOString(),
          volume: parseInt(newUrine.volume),
          notes: newUrine.notes || null,
        }),
      })

      if (response.ok) {
        setIsUrineDialogOpen(false)
        setNewUrine({
          time: new Date().toTimeString().slice(0, 5),
          volume: "",
          notes: "",
        })
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij toevoegen urine")
      }
    } catch (error) {
      console.error("Error adding urine:", error)
      alert("Er is een fout opgetreden")
    }
  }

  async function handleDeleteUrine(recordId: string) {
    if (!confirm("Weet u zeker dat u dit record wilt verwijderen?")) {
      return
    }

    try {
      const response = await fetch(`/api/io/urine?id=${recordId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij verwijderen record")
      }
    } catch (error) {
      console.error("Error deleting urine:", error)
      alert("Er is een fout opgetreden")
    }
  }

  async function handleAddFluidIntake() {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = newFluidIntake.time.split(":").map(Number)

      const recordDate = new Date(year, month - 1, day)
      const recordTime = new Date(year, month - 1, day, hours, minutes)

      const response = await fetch("/api/io/fluid-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id || undefined,
          recordDate: recordDate.toISOString(),
          recordTime: recordTime.toISOString(),
          volume: parseInt(newFluidIntake.volume),
          fluidType: newFluidIntake.fluidType,
          notes: newFluidIntake.notes || null,
        }),
      })

      if (response.ok) {
        setIsFluidIntakeDialogOpen(false)
        setNewFluidIntake({
          time: new Date().toTimeString().slice(0, 5),
          volume: "",
          fluidType: "water",
          notes: "",
        })
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij toevoegen vochtinname")
      }
    } catch (error) {
      console.error("Error adding fluid intake:", error)
      alert("Er is een fout opgetreden")
    }
  }

  async function handleDeleteFluidIntake(recordId: string) {
    if (!confirm("Weet u zeker dat u dit record wilt verwijderen?")) {
      return
    }

    try {
      const response = await fetch(`/api/io/fluid-intake?id=${recordId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij verwijderen record")
      }
    } catch (error) {
      console.error("Error deleting fluid intake:", error)
      alert("Er is een fout opgetreden")
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

  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">In- en outputlijst</h1>
            <p className="text-muted-foreground mt-1">
              Registreer en volg defecatie, urineproductie en vochtinname
            </p>
          </div>
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

        {/* Defecation Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Defecatielijst</CardTitle>
                <CardDescription>
                  Overzicht van defecaties voor {new Date(selectedDate).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </CardDescription>
              </div>
              {isCaregiver && isTodayOrPast && (
                <Dialog open={isDefecationDialogOpen} onOpenChange={setIsDefecationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Registreer Defecatie
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Defecatie Registreren</DialogTitle>
                      <DialogDescription>
                        Voeg een defecatie toe voor {selectedDate}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="time">Tijdstip *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newDefecation.time}
                          onChange={(e) =>
                            setNewDefecation({ ...newDefecation, time: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="amount">Hoeveelheid *</Label>
                        <Select
                          value={newDefecation.amount}
                          onValueChange={(value) =>
                            setNewDefecation({ ...newDefecation, amount: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Geen</SelectItem>
                            <SelectItem value="little">Weinig</SelectItem>
                            <SelectItem value="normal">Normaal</SelectItem>
                            <SelectItem value="alot">Veel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="consistency">Consistentie</Label>
                        <Select
                          value={newDefecation.consistency}
                          onValueChange={(value) =>
                            setNewDefecation({ ...newDefecation, consistency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normaal</SelectItem>
                            <SelectItem value="diarree">Diarree</SelectItem>
                            <SelectItem value="obstipatie">Obstipatie</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            <SelectItem value="zacht">Zacht</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notities</Label>
                        <Input
                          id="notes"
                          value={newDefecation.notes}
                          onChange={(e) =>
                            setNewDefecation({ ...newDefecation, notes: e.target.value })
                          }
                          placeholder="Eventuele opmerkingen"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDefecationDialogOpen(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleAddDefecation}>Toevoegen</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {defecationRecords.length > 0 ? (
              <div className="space-y-3">
                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Totaal aantal defecaties</p>
                      <p className="text-2xl font-bold text-blue-600">{defecationRecords.length}</p>
                    </div>
                    <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Records List */}
                {defecationRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="font-mono text-xl font-bold min-w-[80px]">
                        {new Date(record.recordTime).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-4">
                          {record.amount && (
                            <div className="font-medium text-sm">
                              <span className="text-muted-foreground">Hoeveelheid:</span>{" "}
                              <span className="capitalize">
                                {record.amount === "none" ? "Geen" :
                                 record.amount === "little" ? "Weinig" :
                                 record.amount === "normal" ? "Normaal" :
                                 record.amount === "alot" ? "Veel" : record.amount}
                              </span>
                            </div>
                          )}
                          {record.consistency && (
                            <div className="font-medium text-sm">
                              <span className="text-muted-foreground">Consistentie:</span>{" "}
                              <span className="capitalize">{record.consistency}</span>
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {record.notes}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Geregistreerd door {record.caregiver.name}
                        </div>
                      </div>
                    </div>
                    {isCaregiver && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDefecation(record.id)}
                      >
                        Verwijder
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Geen defecaties geregistreerd voor deze dag
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urine Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Urine-opbrengst</CardTitle>
                <CardDescription>
                  Urineproductie voor {new Date(selectedDate).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </CardDescription>
              </div>
              {isCaregiver && isTodayOrPast && (
                <Dialog open={isUrineDialogOpen} onOpenChange={setIsUrineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Registreer Urine
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Urine Registreren</DialogTitle>
                      <DialogDescription>
                        Voeg urineproductie toe voor {selectedDate}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="urine-time">Tijdstip *</Label>
                        <Input
                          id="urine-time"
                          type="time"
                          value={newUrine.time}
                          onChange={(e) =>
                            setNewUrine({ ...newUrine, time: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="volume">Volume (ml) *</Label>
                        <Input
                          id="volume"
                          type="number"
                          value={newUrine.volume}
                          onChange={(e) =>
                            setNewUrine({ ...newUrine, volume: e.target.value })
                          }
                          placeholder="Bijv. 250"
                          min="0"
                        />
                        <div className="flex gap-2 flex-wrap">
                          {[100, 250, 500, 750, 1000].map((vol) => (
                            <Button
                              key={vol}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNewUrine({ ...newUrine, volume: vol.toString() })}
                            >
                              {vol} ml
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="urine-notes">Notities</Label>
                        <Input
                          id="urine-notes"
                          value={newUrine.notes}
                          onChange={(e) =>
                            setNewUrine({ ...newUrine, notes: e.target.value })
                          }
                          placeholder="Eventuele opmerkingen"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsUrineDialogOpen(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleAddUrine}>Toevoegen</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {urineRecords.length > 0 ? (
              <div className="space-y-3">
                {/* Summary */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Totaal volume</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {urineRecords.reduce((sum, r) => sum + r.volume, 0)} ml
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Aantal metingen</p>
                      <p className="text-2xl font-bold text-amber-600">{urineRecords.length}</p>
                    </div>
                    <svg className="w-12 h-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>

                {/* Records List */}
                {urineRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="font-mono text-xl font-bold min-w-[80px]">
                        {new Date(record.recordTime).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          <span className="text-muted-foreground">Volume:</span>{" "}
                          <span className="text-lg font-bold text-amber-600">{record.volume} ml</span>
                        </div>
                        {record.notes && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {record.notes}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Geregistreerd door {record.caregiver.name}
                        </div>
                      </div>
                    </div>
                    {isCaregiver && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUrine(record.id)}
                      >
                        Verwijder
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Geen urine geregistreerd voor deze dag
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fluid Intake Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vochtbalans (Inname)</CardTitle>
                <CardDescription>
                  Vochtinname voor {new Date(selectedDate).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </CardDescription>
              </div>
              {isCaregiver && isTodayOrPast && (
                <Dialog open={isFluidIntakeDialogOpen} onOpenChange={setIsFluidIntakeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Registreer Vochtinname
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Vochtinname Registreren</DialogTitle>
                      <DialogDescription>
                        Voeg vochtinname toe voor {selectedDate}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fluid-time">Tijdstip *</Label>
                        <Input
                          id="fluid-time"
                          type="time"
                          value={newFluidIntake.time}
                          onChange={(e) =>
                            setNewFluidIntake({ ...newFluidIntake, time: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="fluid-volume">Volume (ml) *</Label>
                        <Input
                          id="fluid-volume"
                          type="number"
                          value={newFluidIntake.volume}
                          onChange={(e) =>
                            setNewFluidIntake({ ...newFluidIntake, volume: e.target.value })
                          }
                          placeholder="Bijv. 250"
                          min="0"
                        />
                        <div className="flex gap-2 flex-wrap">
                          {[100, 200, 250, 300, 500].map((vol) => (
                            <Button
                              key={vol}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNewFluidIntake({ ...newFluidIntake, volume: vol.toString() })}
                            >
                              {vol} ml
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="fluid-type">Type Vloeistof</Label>
                        <Select
                          value={newFluidIntake.fluidType}
                          onValueChange={(value) =>
                            setNewFluidIntake({ ...newFluidIntake, fluidType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="water">Water</SelectItem>
                            <SelectItem value="thee">Thee</SelectItem>
                            <SelectItem value="koffie">Koffie</SelectItem>
                            <SelectItem value="melk">Melk</SelectItem>
                            <SelectItem value="sap">Sap</SelectItem>
                            <SelectItem value="frisdrank">Frisdrank</SelectItem>
                            <SelectItem value="soep">Soep</SelectItem>
                            <SelectItem value="anders">Anders</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="fluid-notes">Notities</Label>
                        <Input
                          id="fluid-notes"
                          value={newFluidIntake.notes}
                          onChange={(e) =>
                            setNewFluidIntake({ ...newFluidIntake, notes: e.target.value })
                          }
                          placeholder="Eventuele opmerkingen"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsFluidIntakeDialogOpen(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleAddFluidIntake}>Toevoegen</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fluidIntakeRecords.length > 0 ? (
              <div className="space-y-3">
                {/* Summary with Balance */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Totaal Inname</p>
                      <p className="text-2xl font-bold text-green-600">
                        {fluidIntakeRecords.reduce((sum, r) => sum + r.volume, 0)} ml
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Totaal Uitscheiding</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {urineRecords.reduce((sum, r) => sum + r.volume, 0)} ml
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Balans (In - Uit)</p>
                      <p className={`text-2xl font-bold ${
                        (fluidIntakeRecords.reduce((sum, r) => sum + r.volume, 0) -
                         urineRecords.reduce((sum, r) => sum + r.volume, 0)) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {fluidIntakeRecords.reduce((sum, r) => sum + r.volume, 0) -
                         urineRecords.reduce((sum, r) => sum + r.volume, 0)} ml
                      </p>
                    </div>
                  </div>
                </div>

                {/* Records List */}
                {fluidIntakeRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="font-mono text-xl font-bold min-w-[80px]">
                        {new Date(record.recordTime).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-4">
                          <div className="font-medium text-sm">
                            <span className="text-muted-foreground">Volume:</span>{" "}
                            <span className="text-lg font-bold text-green-600">{record.volume} ml</span>
                          </div>
                          {record.fluidType && (
                            <div className="font-medium text-sm">
                              <span className="text-muted-foreground">Type:</span>{" "}
                              <span className="capitalize">{record.fluidType}</span>
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {record.notes}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Geregistreerd door {record.caregiver.name}
                        </div>
                      </div>
                    </div>
                    {isCaregiver && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFluidIntake(record.id)}
                      >
                        Verwijder
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Geen vochtinname geregistreerd voor deze dag
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
