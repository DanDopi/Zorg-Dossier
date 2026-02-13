"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClient } from "@/lib/ClientContext"

interface DefecationRecord {
  id: string
  caregiverId: string
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
  caregiverId: string
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

  // Edit defecation state
  const [isEditDefecationDialogOpen, setIsEditDefecationDialogOpen] = useState(false)
  const [editDefecation, setEditDefecation] = useState<{
    id: string
    time: string
    amount: string
    consistency: string
    notes: string
  } | null>(null)

  // Edit urine state
  const [isEditUrineDialogOpen, setIsEditUrineDialogOpen] = useState(false)
  const [editUrine, setEditUrine] = useState<{
    id: string
    time: string
    volume: string
    notes: string
  } | null>(null)

  // Caregiver shift state
  const [hasShiftOnDate, setHasShiftOnDate] = useState(false)

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"
  const isTodayOrPast = selectedDate <= new Date().toISOString().split("T")[0]
  const canRegister = isCaregiver && isTodayOrPast && hasShiftOnDate

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

  // Fetch caregiver shifts when date changes
  useEffect(() => {
    if (!isCaregiver || !selectedClient) {
      setHasShiftOnDate(false)
      return
    }

    async function fetchShifts() {
      try {
        const response = await fetch(
          `/api/scheduling/shifts?clientId=${selectedClient!.id}&startDate=${selectedDate}&endDate=${selectedDate}`
        )

        if (response.ok) {
          const shifts = await response.json()
          const myShifts = (Array.isArray(shifts) ? shifts : []).filter(
            (s: { caregiverId: string; status: string }) =>
              s.caregiverId === user.caregiverProfile?.id &&
              (s.status === "FILLED" || s.status === "COMPLETED")
          )
          setHasShiftOnDate(myShifts.length > 0)
        } else {
          setHasShiftOnDate(false)
        }
      } catch (error) {
        console.error("Error fetching shifts:", error)
        setHasShiftOnDate(false)
      }
    }

    fetchShifts()
  }, [selectedDate, isCaregiver, selectedClient, user.caregiverProfile?.id])

  async function loadData() {
    setIsLoading(true)
    try {
      const clientId = isClient ? undefined : selectedClient?.id
      const params = new URLSearchParams()
      if (clientId) params.set("clientId", clientId)
      params.set("date", selectedDate)

      const [defecationRes, urineRes] = await Promise.all([
        fetch(`/api/io/defecation?${params}`),
        fetch(`/api/io/urine?${params}`),
      ])

      if (defecationRes.ok) {
        const defecationData = await defecationRes.json()
        setDefecationRecords(defecationData)
      }

      if (urineRes.ok) {
        const urineData = await urineRes.json()
        setUrineRecords(urineData)
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

  function openEditDefecation(record: DefecationRecord) {
    const time = new Date(record.recordTime).toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    setEditDefecation({
      id: record.id,
      time,
      amount: record.amount || "normal",
      consistency: record.consistency || "normal",
      notes: record.notes || "",
    })
    setIsEditDefecationDialogOpen(true)
  }

  async function handleEditDefecation() {
    if (!editDefecation) return

    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = editDefecation.time.split(":").map(Number)
      const recordTime = new Date(year, month - 1, day, hours, minutes)

      const response = await fetch("/api/io/defecation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDefecation.id,
          recordTime: recordTime.toISOString(),
          amount: editDefecation.amount,
          consistency: editDefecation.consistency,
          notes: editDefecation.notes || null,
        }),
      })

      if (response.ok) {
        setIsEditDefecationDialogOpen(false)
        setEditDefecation(null)
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij bewerken defecatie")
      }
    } catch (error) {
      console.error("Error editing defecation:", error)
      alert("Er is een fout opgetreden")
    }
  }

  function openEditUrine(record: UrineRecord) {
    const time = new Date(record.recordTime).toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    setEditUrine({
      id: record.id,
      time,
      volume: record.volume.toString(),
      notes: record.notes || "",
    })
    setIsEditUrineDialogOpen(true)
  }

  async function handleEditUrine() {
    if (!editUrine) return

    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = editUrine.time.split(":").map(Number)
      const recordTime = new Date(year, month - 1, day, hours, minutes)

      const response = await fetch("/api/io/urine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editUrine.id,
          recordTime: recordTime.toISOString(),
          volume: parseInt(editUrine.volume),
          notes: editUrine.notes || null,
        }),
      })

      if (response.ok) {
        setIsEditUrineDialogOpen(false)
        setEditUrine(null)
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || "Fout bij bewerken urine")
      }
    } catch (error) {
      console.error("Error editing urine:", error)
      alert("Er is een fout opgetreden")
    }
  }

  function isOwnRecord(caregiverId: string) {
    return isCaregiver && user.caregiverProfile?.id === caregiverId
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
      <div className="text-center py-8">Laden...</div>
    )
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">In- en outputlijst</h1>
          <p className="text-muted-foreground mt-1">
            Registreer en volg defecatie, urineproductie en vochtinname
          </p>
        </div>

        {/* Action Buttons */}
        {isCaregiver && (
          <div className="flex items-center justify-end gap-3">
            <Button
              disabled={!canRegister}
              onClick={() => setIsDefecationDialogOpen(true)}
              title={
                !isTodayOrPast
                  ? "Kan geen toekomstige registraties maken"
                  : !hasShiftOnDate
                  ? "U heeft geen dienst op deze dag"
                  : undefined
              }
            >
              + Registreer Defecatie
            </Button>
            <Button
              disabled={!canRegister}
              onClick={() => setIsUrineDialogOpen(true)}
              title={
                !isTodayOrPast
                  ? "Kan geen toekomstige registraties maken"
                  : !hasShiftOnDate
                  ? "U heeft geen dienst op deze dag"
                  : undefined
              }
            >
              + Registreer Urine
            </Button>
          </div>
        )}

        {/* Daily Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Overzicht {new Date(selectedDate + "T12:00:00").toLocaleDateString("nl-NL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{defecationRecords.length}</div>
                <div className="text-sm text-muted-foreground">Defecaties</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{urineRecords.length}</div>
                <div className="text-sm text-muted-foreground">Urine metingen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {urineRecords.reduce((sum, r) => sum + r.volume, 0)} ml
                </div>
                <div className="text-sm text-muted-foreground">Totaal urine volume</div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Warning banners for caregivers */}
        {isCaregiver && !isTodayOrPast && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium">
              U kunt geen registraties aanmaken voor een toekomstige datum.
            </p>
          </div>
        )}
        {isCaregiver && isTodayOrPast && !hasShiftOnDate && selectedClient && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium">
              U kunt geen registraties aanmaken omdat u geen dienst heeft op deze dag.
            </p>
          </div>
        )}

        {/* Defecation Section */}
        <Card>
          <CardHeader>
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
          </CardHeader>
          <CardContent>
            {defecationRecords.length > 0 ? (
              <div className="space-y-3">
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
                    {isOwnRecord(record.caregiverId) && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDefecation(record)}
                        >
                          Bewerk
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDefecation(record.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          Verwijder
                        </Button>
                      </div>
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
          </CardHeader>
          <CardContent>
            {urineRecords.length > 0 ? (
              <div className="space-y-3">
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
                    {isOwnRecord(record.caregiverId) && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditUrine(record)}
                        >
                          Bewerk
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUrine(record.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          Verwijder
                        </Button>
                      </div>
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

      {/* Defecation Dialog */}
      <Dialog open={isDefecationDialogOpen} onOpenChange={setIsDefecationDialogOpen}>
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

      {/* Urine Dialog */}
      <Dialog open={isUrineDialogOpen} onOpenChange={setIsUrineDialogOpen}>
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

      {/* Edit Defecation Dialog */}
      <Dialog open={isEditDefecationDialogOpen} onOpenChange={setIsEditDefecationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Defecatie Bewerken</DialogTitle>
            <DialogDescription>
              Pas de registratie aan
            </DialogDescription>
          </DialogHeader>
          {editDefecation && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-def-time">Tijdstip *</Label>
                <Input
                  id="edit-def-time"
                  type="time"
                  value={editDefecation.time}
                  onChange={(e) =>
                    setEditDefecation({ ...editDefecation, time: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Hoeveelheid *</Label>
                <Select
                  value={editDefecation.amount}
                  onValueChange={(value) =>
                    setEditDefecation({ ...editDefecation, amount: value })
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
                <Label>Consistentie</Label>
                <Select
                  value={editDefecation.consistency}
                  onValueChange={(value) =>
                    setEditDefecation({ ...editDefecation, consistency: value })
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
                <Label htmlFor="edit-def-notes">Notities</Label>
                <Input
                  id="edit-def-notes"
                  value={editDefecation.notes}
                  onChange={(e) =>
                    setEditDefecation({ ...editDefecation, notes: e.target.value })
                  }
                  placeholder="Eventuele opmerkingen"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDefecationDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleEditDefecation}>Opslaan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Urine Dialog */}
      <Dialog open={isEditUrineDialogOpen} onOpenChange={setIsEditUrineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Urine Bewerken</DialogTitle>
            <DialogDescription>
              Pas de registratie aan
            </DialogDescription>
          </DialogHeader>
          {editUrine && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-urine-time">Tijdstip *</Label>
                <Input
                  id="edit-urine-time"
                  type="time"
                  value={editUrine.time}
                  onChange={(e) =>
                    setEditUrine({ ...editUrine, time: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-urine-volume">Volume (ml) *</Label>
                <Input
                  id="edit-urine-volume"
                  type="number"
                  value={editUrine.volume}
                  onChange={(e) =>
                    setEditUrine({ ...editUrine, volume: e.target.value })
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
                      onClick={() => setEditUrine({ ...editUrine, volume: vol.toString() })}
                    >
                      {vol} ml
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-urine-notes">Notities</Label>
                <Input
                  id="edit-urine-notes"
                  value={editUrine.notes}
                  onChange={(e) =>
                    setEditUrine({ ...editUrine, notes: e.target.value })
                  }
                  placeholder="Eventuele opmerkingen"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditUrineDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleEditUrine}>Opslaan</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
