"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClient } from "@/lib/ClientContext"

interface MealRecord {
  id: string
  recordDate: string
  recordTime: string
  mealType: string
  description: string
  amount?: string
  notes?: string
  caregiver: {
    name: string
    user: {
      email: string
    }
  }
}

interface TubeFeedingSchedule {
  id: string
  feedingTime: string
  volume: number
  feedSpeed: number
  feedType?: string
  recurrenceType: string
  daysOfWeek?: string
  startDate: string
  endDate?: string
  isActive: boolean
  createdAt: string
}

interface TubeFeedingAdministration {
  id: string
  scheduledTime: string
  administeredAt: string
  volumeGiven: number
  speedUsed: number
  wasGiven: boolean
  skipReason?: string
  notes?: string
  caregiver: {
    name: string
    email: string
  }
}

interface DailyScheduleItem {
  schedule: TubeFeedingSchedule
  scheduledTime: string
  time: string
  status: "pending" | "given" | "skipped"
  administration?: TubeFeedingAdministration
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

interface VoedingClientProps {
  user: User
}

export default function VoedingClient({ user }: VoedingClientProps) {
  const { selectedClient } = useClient()
  const [activeTab, setActiveTab] = useState<"meals" | "tube-feeding" | "fluid-balance">("meals")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(true)

  // Meal records state
  const [mealRecords, setMealRecords] = useState<MealRecord[]>([])
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false)
  const [newMeal, setNewMeal] = useState({
    time: new Date().toTimeString().slice(0, 5),
    mealType: "breakfast",
    description: "",
    amount: "normal",
    notes: "",
  })

  // Tube feeding schedule state (for clients)
  const [tubeFeedingSchedules, setTubeFeedingSchedules] = useState<TubeFeedingSchedule[]>([])
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<TubeFeedingSchedule | null>(null)
  const [newSchedule, setNewSchedule] = useState({
    feedingTime: "08:00",
    volume: 250,
    feedSpeed: 100,
    feedType: "",
    recurrenceType: "daily",
    daysOfWeek: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  })

  // Tube feeding administration state (for caregivers)
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>([])
  const [administerDialogOpen, setAdministerDialogOpen] = useState(false)
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<DailyScheduleItem | null>(null)
  const [administrationForm, setAdministrationForm] = useState({
    volumeGiven: 0,
    speedUsed: 0,
    wasGiven: true,
    skipReason: "",
    notes: "",
  })

  // Fluid intake state
  const [fluidIntakeRecords, setFluidIntakeRecords] = useState<FluidIntakeRecord[]>([])
  const [urineRecords, setUrineRecords] = useState<UrineRecord[]>([])
  const [isFluidIntakeDialogOpen, setIsFluidIntakeDialogOpen] = useState(false)
  const [newFluidIntake, setNewFluidIntake] = useState({
    time: new Date().toTimeString().slice(0, 5),
    volume: "",
    fluidType: "water",
    notes: "",
  })

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  // Determine target client ID
  const targetClientId = isClient
    ? user.clientProfile?.id
    : selectedClient?.id

  useEffect(() => {
    if (targetClientId) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [targetClientId, selectedDate, activeTab])

  async function loadData() {
    setIsLoading(true)
    try {
      if (activeTab === "meals") {
        await fetchMealRecords()
      } else if (activeTab === "tube-feeding") {
        if (isClient) {
          await fetchTubeFeedingSchedules()
        } else {
          await fetchDailySchedule()
        }
      } else if (activeTab === "fluid-balance") {
        await Promise.all([fetchFluidIntakeRecords(), fetchUrineRecords()])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMealRecords() {
    try {
      const response = await fetch(`/api/voeding/meals?clientId=${targetClientId}&date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setMealRecords(data.meals || [])
      }
    } catch (error) {
      console.error("Error fetching meal records:", error)
    }
  }

  async function fetchTubeFeedingSchedules() {
    try {
      const response = await fetch(`/api/voeding/tube-feeding/schedule?clientId=${targetClientId}`)
      if (response.ok) {
        const data = await response.json()
        setTubeFeedingSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error fetching tube feeding schedules:", error)
    }
  }

  async function fetchDailySchedule() {
    try {
      const response = await fetch(`/api/voeding/tube-feeding/daily?clientId=${targetClientId}&date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setDailySchedule(data.schedule || [])
      }
    } catch (error) {
      console.error("Error fetching daily schedule:", error)
    }
  }

  async function fetchFluidIntakeRecords() {
    try {
      const params = new URLSearchParams()
      if (targetClientId) params.set("clientId", targetClientId)
      params.set("date", selectedDate)
      const response = await fetch(`/api/io/fluid-intake?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFluidIntakeRecords(data || [])
      }
    } catch (error) {
      console.error("Error fetching fluid intake records:", error)
    }
  }

  async function fetchUrineRecords() {
    try {
      const params = new URLSearchParams()
      if (targetClientId) params.set("clientId", targetClientId)
      params.set("date", selectedDate)
      const response = await fetch(`/api/io/urine?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUrineRecords(data || [])
      }
    } catch (error) {
      console.error("Error fetching urine records:", error)
    }
  }

  async function handleAddMeal() {
    if (!targetClientId) return

    try {
      const response = await fetch("/api/voeding/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          recordDate: selectedDate,
          recordTime: newMeal.time,
          mealType: newMeal.mealType,
          description: newMeal.description,
          amount: newMeal.amount,
          notes: newMeal.notes,
        }),
      })

      if (response.ok) {
        await fetchMealRecords()
        setIsMealDialogOpen(false)
        setNewMeal({
          time: new Date().toTimeString().slice(0, 5),
          mealType: "breakfast",
          description: "",
          amount: "normal",
          notes: "",
        })
      }
    } catch (error) {
      console.error("Error adding meal:", error)
    }
  }

  async function handleAddSchedule() {
    if (!targetClientId) return

    try {
      const response = await fetch("/api/voeding/tube-feeding/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          ...newSchedule,
        }),
      })

      if (response.ok) {
        await fetchTubeFeedingSchedules()
        setIsScheduleDialogOpen(false)
        setNewSchedule({
          feedingTime: "08:00",
          volume: 250,
          feedSpeed: 100,
          feedType: "",
          recurrenceType: "daily",
          daysOfWeek: [] as string[],
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
        })
      } else {
        const data = await response.json()
        alert(data.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      console.error("Error adding schedule:", error)
      alert("Er is een fout opgetreden bij het toevoegen van het schema")
    }
  }

  async function handleUpdateSchedule() {
    if (!editingSchedule || !targetClientId) return

    try {
      const response = await fetch(`/api/voeding/tube-feeding/schedule/${editingSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchedule),
      })

      if (response.ok) {
        await fetchTubeFeedingSchedules()
        setIsScheduleDialogOpen(false)
        setEditingSchedule(null)
        setNewSchedule({
          feedingTime: "08:00",
          volume: 250,
          feedSpeed: 100,
          feedType: "",
          recurrenceType: "daily",
          daysOfWeek: [] as string[],
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
        })
      } else {
        const data = await response.json()
        alert(data.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      console.error("Error updating schedule:", error)
      alert("Er is een fout opgetreden bij het bijwerken van het schema")
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm("Weet u zeker dat u dit schema wilt verwijderen?")) return

    try {
      const response = await fetch(`/api/voeding/tube-feeding/schedule/${scheduleId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchTubeFeedingSchedules()
      }
    } catch (error) {
      console.error("Error deleting schedule:", error)
    }
  }

  async function handleAdministerFeeding() {
    if (!selectedScheduleItem || !targetClientId) return

    try {
      const response = await fetch("/api/voeding/tube-feeding/administer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selectedScheduleItem.schedule.id,
          clientId: targetClientId,
          scheduledTime: selectedScheduleItem.scheduledTime,
          ...administrationForm,
        }),
      })

      if (response.ok) {
        await fetchDailySchedule()
        setAdministerDialogOpen(false)
        setSelectedScheduleItem(null)
        setAdministrationForm({
          volumeGiven: 0,
          speedUsed: 0,
          wasGiven: true,
          skipReason: "",
          notes: "",
        })
      }
    } catch (error) {
      console.error("Error administering feeding:", error)
    }
  }

  function openAdministerDialog(item: DailyScheduleItem) {
    setSelectedScheduleItem(item)
    setAdministrationForm({
      volumeGiven: item.schedule.volume,
      speedUsed: item.schedule.feedSpeed,
      wasGiven: true,
      skipReason: "",
      notes: "",
    })
    setAdministerDialogOpen(true)
  }

  async function handleAddFluidIntake() {
    if (!targetClientId) return

    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = newFluidIntake.time.split(":").map(Number)

      const recordDate = new Date(year, month - 1, day)
      const recordTime = new Date(year, month - 1, day, hours, minutes)

      const response = await fetch("/api/io/fluid-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
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
        await fetchFluidIntakeRecords()
      }
    } catch (error) {
      console.error("Error adding fluid intake:", error)
    }
  }

  async function handleDeleteFluidIntake(recordId: string) {
    if (!confirm("Weet u zeker dat u dit record wilt verwijderen?")) return

    try {
      const response = await fetch(`/api/io/fluid-intake/${recordId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchFluidIntakeRecords()
      }
    } catch (error) {
      console.error("Error deleting fluid intake:", error)
    }
  }

  function openEditScheduleDialog(schedule: TubeFeedingSchedule) {
    setEditingSchedule(schedule)
    setNewSchedule({
      feedingTime: schedule.feedingTime,
      volume: schedule.volume,
      feedSpeed: schedule.feedSpeed,
      feedType: schedule.feedType || "",
      recurrenceType: schedule.recurrenceType || "daily",
      daysOfWeek: schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [],
      startDate: schedule.startDate ? new Date(schedule.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().split("T")[0] : "",
    })
    setIsScheduleDialogOpen(true)
  }

  function changeDate(days: number) {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  function goToToday() {
    setSelectedDate(new Date().toISOString().split("T")[0])
  }

  if (!targetClientId && isCaregiver) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Selecteer een cliënt via de dropdown bovenaan om voeding te beheren
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voeding</h1>
            <p className="text-muted-foreground mt-1">
              {isClient
                ? "Beheer maaltijden en sondevoeding schema's"
                : "Registreer maaltijden en sondevoeding toediening"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "meals" ? "default" : "outline"}
            onClick={() => setActiveTab("meals")}
          >
            Maaltijden
          </Button>
          <Button
            variant={activeTab === "tube-feeding" ? "default" : "outline"}
            onClick={() => setActiveTab("tube-feeding")}
          >
            Sondevoeding
          </Button>
          <Button
            variant={activeTab === "fluid-balance" ? "default" : "outline"}
            onClick={() => setActiveTab("fluid-balance")}
          >
            Vocht
          </Button>
        </div>

        {/* Date Selector */}
        {(activeTab === "meals" || (activeTab === "tube-feeding" && isCaregiver) || activeTab === "fluid-balance") && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeDate(-1)}
                >
                  ← Vorige dag
                </Button>
                <div className="flex items-center gap-4">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                  {selectedDate !== new Date().toISOString().split("T")[0] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToToday()}
                    >
                      Naar Vandaag
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeDate(1)}
                >
                  Volgende dag →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12">Laden...</div>
        ) : activeTab === "meals" ? (
          <MealsTab
            mealRecords={mealRecords}
            isCaregiver={isCaregiver}
            isMealDialogOpen={isMealDialogOpen}
            setIsMealDialogOpen={setIsMealDialogOpen}
            newMeal={newMeal}
            setNewMeal={setNewMeal}
            handleAddMeal={handleAddMeal}
            selectedDate={selectedDate}
          />
        ) : activeTab === "fluid-balance" ? (
          <FluidBalanceTab
            fluidIntakeRecords={fluidIntakeRecords}
            urineRecords={urineRecords}
            isCaregiver={isCaregiver}
            isFluidIntakeDialogOpen={isFluidIntakeDialogOpen}
            setIsFluidIntakeDialogOpen={setIsFluidIntakeDialogOpen}
            newFluidIntake={newFluidIntake}
            setNewFluidIntake={setNewFluidIntake}
            handleAddFluidIntake={handleAddFluidIntake}
            handleDeleteFluidIntake={handleDeleteFluidIntake}
            selectedDate={selectedDate}
          />
        ) : activeTab === "tube-feeding" && isClient ? (
          <TubeFeedingScheduleTab
            schedules={tubeFeedingSchedules}
            isScheduleDialogOpen={isScheduleDialogOpen}
            setIsScheduleDialogOpen={setIsScheduleDialogOpen}
            editingSchedule={editingSchedule}
            newSchedule={newSchedule}
            setNewSchedule={setNewSchedule}
            handleAddSchedule={handleAddSchedule}
            handleUpdateSchedule={handleUpdateSchedule}
            handleDeleteSchedule={handleDeleteSchedule}
            openEditScheduleDialog={openEditScheduleDialog}
          />
        ) : (
          <TubeFeedingAdministrationTab
            dailySchedule={dailySchedule}
            administerDialogOpen={administerDialogOpen}
            selectedScheduleItem={selectedScheduleItem}
            administrationForm={administrationForm}
            setAdministrationForm={setAdministrationForm}
            handleAdministerFeeding={handleAdministerFeeding}
            openAdministerDialog={openAdministerDialog}
            setAdministerDialogOpen={setAdministerDialogOpen}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </div>
  )
}

// Meals Tab Component
function MealsTab({
  mealRecords,
  isCaregiver,
  isMealDialogOpen,
  setIsMealDialogOpen,
  newMeal,
  setNewMeal,
  handleAddMeal,
  selectedDate,
}: any) {
  const mealTypeLabels: Record<string, string> = {
    breakfast: "Ontbijt",
    lunch: "Lunch",
    dinner: "Avondeten",
    snack: "Tussendoortje",
  }

  // Calculate summary
  const summary = {
    total: mealRecords.length,
    breakfast: mealRecords.filter((m: MealRecord) => m.mealType === "breakfast").length,
    lunch: mealRecords.filter((m: MealRecord) => m.mealType === "lunch").length,
    dinner: mealRecords.filter((m: MealRecord) => m.mealType === "dinner").length,
    snacks: mealRecords.filter((m: MealRecord) => m.mealType === "snack").length,
  }

  // Check if selected date is in the future
  const isFutureDate = selectedDate > new Date().toISOString().split("T")[0]

  return (
    <>
      {/* Overview */}
      {mealRecords.length > 0 && (
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
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Totaal</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.breakfast}</div>
                <div className="text-sm text-muted-foreground">Ontbijt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.lunch}</div>
                <div className="text-sm text-muted-foreground">Lunch</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.dinner}</div>
                <div className="text-sm text-muted-foreground">Avondeten</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.snacks}</div>
                <div className="text-sm text-muted-foreground">Tussendoor</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Maaltijden</CardTitle>
            <CardDescription>Registreer wat de cliënt heeft gegeten</CardDescription>
          </div>
          {isCaregiver && (
            <Dialog open={isMealDialogOpen} onOpenChange={setIsMealDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={isFutureDate}>+ Maaltijd Toevoegen</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nieuwe Maaltijd Registreren</DialogTitle>
                  <DialogDescription>
                    Voer de details van de maaltijd in
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mealTime">Tijd *</Label>
                      <Input
                        id="mealTime"
                        type="time"
                        value={newMeal.time}
                        onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mealType">Type Maaltijd *</Label>
                      <Select value={newMeal.mealType} onValueChange={(value) => setNewMeal({ ...newMeal, mealType: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">Ontbijt</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Avondeten</SelectItem>
                          <SelectItem value="snack">Tussendoortje</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Omschrijving *</Label>
                    <Textarea
                      id="description"
                      value={newMeal.description}
                      onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                      placeholder="Wat heeft de cliënt gegeten?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Hoeveelheid</Label>
                    <Select value={newMeal.amount} onValueChange={(value) => setNewMeal({ ...newMeal, amount: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Niets</SelectItem>
                        <SelectItem value="little">Weinig</SelectItem>
                        <SelectItem value="normal">Normaal</SelectItem>
                        <SelectItem value="much">Veel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notities (optioneel)</Label>
                    <Textarea
                      id="notes"
                      value={newMeal.notes}
                      onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                      placeholder="Extra opmerkingen..."
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAddMeal} className="flex-1">Toevoegen</Button>
                  <Button variant="outline" onClick={() => setIsMealDialogOpen(false)} className="flex-1">Annuleren</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mealRecords.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Geen maaltijden geregistreerd voor deze dag</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mealRecords.map((meal: MealRecord) => (
              <Card key={meal.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{mealTypeLabels[meal.mealType] || meal.mealType}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(`2000-01-01T${meal.recordTime}`).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {meal.amount && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            {meal.amount === "none" && "Niets"}
                            {meal.amount === "little" && "Weinig"}
                            {meal.amount === "normal" && "Normaal"}
                            {meal.amount === "much" && "Veel"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{meal.description}</p>
                      {meal.notes && (
                        <p className="text-xs text-muted-foreground italic">💭 {meal.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Geregistreerd door: {meal.caregiver.name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  )
}

// Tube Feeding Schedule Tab (for Clients)
function TubeFeedingScheduleTab({
  schedules,
  isScheduleDialogOpen,
  setIsScheduleDialogOpen,
  editingSchedule,
  newSchedule,
  setNewSchedule,
  handleAddSchedule,
  handleUpdateSchedule,
  handleDeleteSchedule,
  openEditScheduleDialog,
}: any) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sondevoeding Schema</CardTitle>
            <CardDescription>Beheer uw voedingsschema</CardDescription>
          </div>
          <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => {
            setIsScheduleDialogOpen(open)
            if (!open) {
              setEditingSchedule(null)
              setNewSchedule({
                feedingTime: "08:00",
                volume: 250,
                feedSpeed: 100,
                feedType: "",
                recurrenceType: "daily",
                daysOfWeek: [],
                startDate: new Date().toISOString().split("T")[0],
                endDate: "",
              })
            }
          }}>
            <DialogTrigger asChild>
              <Button>+ Schema Toevoegen</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "Schema Bewerken" : "Nieuw Schema Toevoegen"}</DialogTitle>
                <DialogDescription>
                  Voer de details van het voedingsschema in
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="feedingTime">Tijd *</Label>
                  <Input
                    id="feedingTime"
                    type="time"
                    value={newSchedule.feedingTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, feedingTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="volume">Volume (ml) *</Label>
                  <Input
                    id="volume"
                    type="number"
                    value={newSchedule.volume || ""}
                    onChange={(e) => setNewSchedule({ ...newSchedule, volume: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="feedSpeed">Snelheid (ml/uur) *</Label>
                  <Input
                    id="feedSpeed"
                    type="number"
                    value={newSchedule.feedSpeed || ""}
                    onChange={(e) => setNewSchedule({ ...newSchedule, feedSpeed: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="feedType">Type Voeding (optioneel)</Label>
                  <Input
                    id="feedType"
                    value={newSchedule.feedType}
                    onChange={(e) => setNewSchedule({ ...newSchedule, feedType: e.target.value })}
                    placeholder="Bijv. Nutridrink, Fresubin, etc."
                  />
                </div>

                {/* Recurrence Settings */}
                <div>
                  <Label htmlFor="recurrenceType">Herhaling *</Label>
                  <Select value={newSchedule.recurrenceType} onValueChange={(value) => setNewSchedule({ ...newSchedule, recurrenceType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">Eenmalig</SelectItem>
                      <SelectItem value="daily">Dagelijks</SelectItem>
                      <SelectItem value="weekly">Wekelijks</SelectItem>
                      <SelectItem value="specific_days">Specifieke dagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Days of Week (for weekly/specific_days) */}
                {(newSchedule.recurrenceType === "weekly" || newSchedule.recurrenceType === "specific_days") && (
                  <div>
                    <Label>Dagen van de week *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { value: "monday", label: "Maandag" },
                        { value: "tuesday", label: "Dinsdag" },
                        { value: "wednesday", label: "Woensdag" },
                        { value: "thursday", label: "Donderdag" },
                        { value: "friday", label: "Vrijdag" },
                        { value: "saturday", label: "Zaterdag" },
                        { value: "sunday", label: "Zondag" },
                      ].map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={day.value}
                            checked={newSchedule.daysOfWeek.includes(day.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSchedule({
                                  ...newSchedule,
                                  daysOfWeek: [...newSchedule.daysOfWeek, day.value],
                                })
                              } else {
                                setNewSchedule({
                                  ...newSchedule,
                                  daysOfWeek: newSchedule.daysOfWeek.filter(d => d !== day.value),
                                })
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={day.value} className="text-sm cursor-pointer">
                            {day.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Startdatum *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newSchedule.startDate}
                      onChange={(e) => setNewSchedule({ ...newSchedule, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Einddatum (optioneel)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newSchedule.endDate}
                      onChange={(e) => setNewSchedule({ ...newSchedule, endDate: e.target.value })}
                      min={newSchedule.startDate}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={editingSchedule ? handleUpdateSchedule : handleAddSchedule} className="flex-1">
                  {editingSchedule ? "Bijwerken" : "Toevoegen"}
                </Button>
                <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)} className="flex-1">Annuleren</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nog geen voedingsschema's aangemaakt</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule: TubeFeedingSchedule) => (
              <Card key={schedule.id} className={`border-l-4 ${schedule.isActive ? 'border-l-blue-500' : 'border-l-gray-400'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{schedule.feedingTime}</span>
                        {!schedule.isActive && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">Inactief</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>💧 Volume: {schedule.volume} ml</p>
                        <p>⚡ Snelheid: {schedule.feedSpeed} ml/uur</p>
                        {schedule.feedType && <p>🥤 Type: {schedule.feedType}</p>}
                        <p>🔄 {
                          schedule.recurrenceType === "daily" ? "Dagelijks" :
                          schedule.recurrenceType === "weekly" ? `Wekelijks (${schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek).length : 0} dagen)` :
                          schedule.recurrenceType === "specific_days" ? `Specifieke dagen (${schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek).length : 0})` :
                          "Eenmalig"
                        }</p>
                        <p>📅 Van {new Date(schedule.startDate).toLocaleDateString('nl-NL')} {schedule.endDate && `tot ${new Date(schedule.endDate).toLocaleDateString('nl-NL')}`}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditScheduleDialog(schedule)}
                      >
                        Bewerken
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                      >
                        Verwijderen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Tube Feeding Administration Tab (for Caregivers)
function TubeFeedingAdministrationTab({
  dailySchedule,
  administerDialogOpen,
  selectedScheduleItem,
  administrationForm,
  setAdministrationForm,
  handleAdministerFeeding,
  openAdministerDialog,
  setAdministerDialogOpen,
  selectedDate,
}: any) {
  // Calculate summary
  const summary = {
    total: dailySchedule.length,
    given: dailySchedule.filter((item: DailyScheduleItem) => item.status === "given").length,
    skipped: dailySchedule.filter((item: DailyScheduleItem) => item.status === "skipped").length,
    pending: dailySchedule.filter((item: DailyScheduleItem) => item.status === "pending").length,
  }

  // Check if selected date is in the future
  const isFutureDate = selectedDate > new Date().toISOString().split("T")[0]

  return (
    <>
      {/* Overview */}
      {dailySchedule.length > 0 && (
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
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Totaal</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.given}</div>
                <div className="text-sm text-muted-foreground">Toegediend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.skipped}</div>
                <div className="text-sm text-muted-foreground">Overgeslagen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{summary.pending}</div>
                <div className="text-sm text-muted-foreground">Nog te doen</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sondevoeding Toedienen</CardTitle>
          <CardDescription>Teken af wanneer voeding is toegediend</CardDescription>
        </CardHeader>
        <CardContent>
          {dailySchedule.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Geen voedingsschema's gepland voor deze dag</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailySchedule.map((item: DailyScheduleItem, index: number) => (
                <Card key={index} className={`border-l-4 ${
                  item.status === "given" ? "border-l-green-500" :
                  item.status === "skipped" ? "border-l-red-500" :
                  "border-l-blue-500"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">{item.time}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === "given" ? "bg-green-100 text-green-700" :
                            item.status === "skipped" ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {item.status === "given" && "Toegediend"}
                            {item.status === "skipped" && "Overgeslagen"}
                            {item.status === "pending" && "Te doen"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>💧 Volume: {item.schedule.volume} ml</p>
                          <p>⚡ Snelheid: {item.schedule.feedSpeed} ml/uur</p>
                          {item.schedule.feedType && <p>🥤 Type: {item.schedule.feedType}</p>}
                        </div>
                        {item.administration && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>Door: {item.administration.caregiver.name}</p>
                            <p>Tijd: {new Date(item.administration.administeredAt).toLocaleString('nl-NL')}</p>
                            {item.administration.notes && <p className="italic">💭 {item.administration.notes}</p>}
                            {item.administration.skipReason && <p className="text-red-600">❌ {item.administration.skipReason}</p>}
                          </div>
                        )}
                      </div>
                      {item.status === "pending" && (
                        <Button onClick={() => openAdministerDialog(item)} disabled={isFutureDate}>
                          Toedienen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={administerDialogOpen} onOpenChange={setAdministerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sondevoeding Toedienen</DialogTitle>
            <DialogDescription>
              {selectedScheduleItem && `Voeding om ${selectedScheduleItem.time}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={administrationForm.wasGiven ? "default" : "outline"}
                  onClick={() => setAdministrationForm({ ...administrationForm, wasGiven: true })}
                >
                  Toegediend
                </Button>
                <Button
                  size="sm"
                  variant={!administrationForm.wasGiven ? "destructive" : "outline"}
                  onClick={() => setAdministrationForm({ ...administrationForm, wasGiven: false })}
                >
                  Overgeslagen
                </Button>
              </div>
            </div>

            {administrationForm.wasGiven ? (
              <>
                <div>
                  <Label htmlFor="volumeGiven">Volume Gegeven (ml)</Label>
                  <Input
                    id="volumeGiven"
                    type="number"
                    value={administrationForm.volumeGiven || ""}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, volumeGiven: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="speedUsed">Snelheid Gebruikt (ml/uur)</Label>
                  <Input
                    id="speedUsed"
                    type="number"
                    value={administrationForm.speedUsed || ""}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, speedUsed: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notities (optioneel)</Label>
                  <Textarea
                    id="notes"
                    value={administrationForm.notes}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, notes: e.target.value })}
                    placeholder="Extra opmerkingen..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="skipReason">Reden voor Overslaan *</Label>
                <Textarea
                  id="skipReason"
                  value={administrationForm.skipReason}
                  onChange={(e) => setAdministrationForm({ ...administrationForm, skipReason: e.target.value })}
                  placeholder="Waarom werd de voeding overgeslagen?"
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdministerFeeding} className="flex-1">Opslaan</Button>
            <Button variant="outline" onClick={() => setAdministerDialogOpen(false)} className="flex-1">Annuleren</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Fluid Balance Tab Component
function FluidBalanceTab({
  fluidIntakeRecords,
  urineRecords,
  isCaregiver,
  isFluidIntakeDialogOpen,
  setIsFluidIntakeDialogOpen,
  newFluidIntake,
  setNewFluidIntake,
  handleAddFluidIntake,
  handleDeleteFluidIntake,
  selectedDate,
}: any) {
  // Check if selected date is in the future
  const isFutureDate = selectedDate > new Date().toISOString().split("T")[0]

  // Calculate totals
  const totalIntake = fluidIntakeRecords.reduce((sum: number, r: FluidIntakeRecord) => sum + r.volume, 0)
  const totalOutput = urineRecords.reduce((sum: number, r: UrineRecord) => sum + r.volume, 0)
  const balance = totalIntake - totalOutput

  return (
    <>
      {/* Overview Card */}
      {fluidIntakeRecords.length > 0 && (
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
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalIntake} ml</div>
                <div className="text-sm text-muted-foreground">Totaal Inname</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{totalOutput} ml</div>
                <div className="text-sm text-muted-foreground">Totaal Uitscheiding</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {balance} ml
                </div>
                <div className="text-sm text-muted-foreground">Balans (In - Uit)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fluid Intake Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vochtinname</CardTitle>
              <CardDescription>Registreer vochtinname voor deze dag</CardDescription>
            </div>
            {isCaregiver && (
              <Dialog open={isFluidIntakeDialogOpen} onOpenChange={setIsFluidIntakeDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isFutureDate}>+ Registreer Vochtinname</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Vochtinname Registreren</DialogTitle>
                    <DialogDescription>Voeg vochtinname toe voor {selectedDate}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="fluid-time">Tijd *</Label>
                      <Input
                        id="fluid-time"
                        type="time"
                        value={newFluidIntake.time}
                        onChange={(e) => setNewFluidIntake({ ...newFluidIntake, time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fluid-volume">Volume (ml) *</Label>
                      <Input
                        id="fluid-volume"
                        type="number"
                        value={newFluidIntake.volume}
                        onChange={(e) => setNewFluidIntake({ ...newFluidIntake, volume: e.target.value })}
                        placeholder="Bijv. 250"
                        min="0"
                      />
                      <div className="flex gap-2 flex-wrap mt-2">
                        {[100, 150, 200, 250, 300, 500].map((vol) => (
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
                    <div>
                      <Label htmlFor="fluid-type">Type Vloeistof</Label>
                      <Select
                        value={newFluidIntake.fluidType}
                        onValueChange={(value) => setNewFluidIntake({ ...newFluidIntake, fluidType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="water">Water</SelectItem>
                          <SelectItem value="tea">Thee</SelectItem>
                          <SelectItem value="coffee">Koffie</SelectItem>
                          <SelectItem value="juice">Sap</SelectItem>
                          <SelectItem value="milk">Melk</SelectItem>
                          <SelectItem value="soup">Soep</SelectItem>
                          <SelectItem value="other">Anders</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="fluid-notes">Notities (optioneel)</Label>
                      <Input
                        id="fluid-notes"
                        value={newFluidIntake.notes}
                        onChange={(e) => setNewFluidIntake({ ...newFluidIntake, notes: e.target.value })}
                        placeholder="Eventuele opmerkingen"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleAddFluidIntake} className="flex-1">Toevoegen</Button>
                    <Button variant="outline" onClick={() => setIsFluidIntakeDialogOpen(false)} className="flex-1">Annuleren</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {fluidIntakeRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Geen vochtinname geregistreerd voor deze dag</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fluidIntakeRecords.map((record: FluidIntakeRecord) => (
                <Card key={record.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">
                            {new Date(record.recordTime).toLocaleTimeString("nl-NL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-lg font-bold text-green-600">{record.volume} ml</span>
                          {record.fluidType && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full capitalize">
                              {record.fluidType}
                            </span>
                          )}
                        </div>
                        {record.notes && (
                          <p className="text-xs text-muted-foreground italic">💭 {record.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Geregistreerd door: {record.caregiver.name}
                        </p>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
