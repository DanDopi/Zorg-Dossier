"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronsLeft, ChevronsRight, Pencil, Trash2 } from "lucide-react"
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

interface AdministrationForm {
  volumeGiven: number
  speedUsed: number
  wasGiven: boolean
  skipReason: string
  notes: string
}

interface MealScheduleItem {
  id: string
  mealTime: string
  mealType: string
  description?: string | null
  recurrenceType: string
  daysOfWeek?: string | null
  startDate: string
  endDate?: string | null
  isActive: boolean
}

interface FluidIntakeScheduleItem {
  id: string
  intakeTime: string
  volume: number
  fluidType?: string | null
  recurrenceType: string
  daysOfWeek?: string | null
  startDate: string
  endDate?: string | null
  isActive: boolean
}

interface DailyMealScheduleItem {
  schedule: {
    id: string
    mealTime: string
    mealType: string
    description?: string | null
    recurrenceType: string
  }
  time: string
  status: "pending" | "done"
  record: {
    id: string
    recordTime: string
    mealType: string
    description: string
    amount?: string | null
    notes?: string | null
    caregiver: { name: string; email: string }
  } | null
}

interface DailyFluidScheduleItem {
  schedule: {
    id: string
    intakeTime: string
    volume: number
    fluidType?: string | null
    recurrenceType: string
  }
  time: string
  status: "pending" | "done"
  record: {
    id: string
    recordTime: string
    volume: number
    fluidType?: string | null
    notes?: string | null
    caregiver: { name: string; email: string }
  } | null
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
  const { selectedClient, setSelectedClient } = useClient()
  const searchParams = useSearchParams()

  // If clientId is passed in URL, auto-select that client
  useEffect(() => {
    const clientIdParam = searchParams.get("clientId")
    const clientNameParam = searchParams.get("clientName")
    if (clientIdParam && clientIdParam !== selectedClient?.id) {
      setSelectedClient({
        id: clientIdParam,
        name: clientNameParam || "",
        email: "",
      })
    }
  }, [searchParams])

  const initialTab = useMemo(() => {
    const tab = searchParams.get("tab")
    if (tab === "tube-feeding" || tab === "fluid-balance") return tab
    return "meals"
  }, [])
  const [activeTab, setActiveTab] = useState<"meals" | "tube-feeding" | "fluid-balance">(initialTab)
  const initialDate = useMemo(() => searchParams.get("date") || new Date().toISOString().split("T")[0], [])
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [openDays, setOpenDays] = useState<string[]>([])
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

  // Ad-hoc tube feeding dialog state (parent-controlled)
  const [isAdHocTubeFeedingOpen, setIsAdHocTubeFeedingOpen] = useState(false)

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

  // Meal schedule state (for clients)
  const [mealSchedules, setMealSchedules] = useState<MealScheduleItem[]>([])
  const [isMealScheduleDialogOpen, setIsMealScheduleDialogOpen] = useState(false)
  const [editingMealSchedule, setEditingMealSchedule] = useState<MealScheduleItem | null>(null)
  const [newMealSchedule, setNewMealSchedule] = useState({
    mealTime: "08:00",
    mealType: "breakfast",
    description: "",
    recurrenceType: "daily",
    daysOfWeek: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  })
  // Meal daily schedule state (for caregivers)
  const [dailyMealSchedule, setDailyMealSchedule] = useState<DailyMealScheduleItem[]>([])

  // Fluid intake schedule state (for clients)
  const [fluidSchedules, setFluidSchedules] = useState<FluidIntakeScheduleItem[]>([])
  const [isFluidScheduleDialogOpen, setIsFluidScheduleDialogOpen] = useState(false)
  const [editingFluidSchedule, setEditingFluidSchedule] = useState<FluidIntakeScheduleItem | null>(null)
  const [newFluidSchedule, setNewFluidSchedule] = useState({
    intakeTime: "08:00",
    volume: 200,
    fluidType: "",
    recurrenceType: "daily",
    daysOfWeek: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  })
  // Fluid daily schedule state (for caregivers)
  const [dailyFluidSchedule, setDailyFluidSchedule] = useState<DailyFluidScheduleItem[]>([])

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  // Determine target client ID
  const targetClientId = isClient
    ? user.clientProfile?.id
    : selectedClient?.id

  // Missing voeding count (for badge)
  const [missingVoedingCount, setMissingVoedingCount] = useState<number>(0)

  // Shift check: caregivers can only register if they have a shift on the selected date
  const [hasShiftOnDate, setHasShiftOnDate] = useState(false)
  const isFutureDate = selectedDate > new Date().toISOString().split("T")[0]
  // Clients can always register (no shift needed); caregivers need a shift + not future
  const canRegister = isClient || (hasShiftOnDate && !isFutureDate)

  // Overview stats (computed for parent-level overview card, matching Medication page layout)
  const mealOverview = {
    total: mealRecords.length,
    breakfast: mealRecords.filter(m => m.mealType === "breakfast").length,
    lunch: mealRecords.filter(m => m.mealType === "lunch").length,
    dinner: mealRecords.filter(m => m.mealType === "dinner").length,
    snacks: mealRecords.filter(m => m.mealType === "snack").length,
  }
  const tubeOverview = {
    total: dailySchedule.length,
    given: dailySchedule.filter(i => i.status === "given").length,
    skipped: dailySchedule.filter(i => i.status === "skipped").length,
    pending: dailySchedule.filter(i => i.status === "pending").length,
    volumeGiven: dailySchedule.filter(i => i.status === "given").reduce((sum, i) => sum + (i.administration?.volumeGiven || i.schedule.volume), 0),
    volumeExpected: dailySchedule.reduce((sum, i) => sum + i.schedule.volume, 0),
  }
  // Meal schedule overview (from daily schedule matching)
  const mealScheduleOverview = {
    total: dailyMealSchedule.length,
    done: dailyMealSchedule.filter(i => i.status === "done").length,
    pending: dailyMealSchedule.filter(i => i.status === "pending").length,
  }
  // Fluid schedule overview (from daily schedule matching)
  const fluidScheduleOverview = {
    total: dailyFluidSchedule.length,
    done: dailyFluidSchedule.filter(i => i.status === "done").length,
    pending: dailyFluidSchedule.filter(i => i.status === "pending").length,
    volumeExpected: dailyFluidSchedule.reduce((sum, i) => sum + i.schedule.volume, 0),
  }
  const fluidTotalIntake = fluidIntakeRecords.reduce((sum, r) => sum + r.volume, 0)
  const fluidTotalOutput = urineRecords.reduce((sum, r) => sum + r.volume, 0)
  const fluidBalance = fluidTotalIntake - fluidTotalOutput

  useEffect(() => {
    if (targetClientId) {
      loadData()
      if (isCaregiver) fetchOpenDays()
      fetchMissingVoeding()
    } else {
      setIsLoading(false)
    }
  }, [targetClientId, selectedDate, activeTab])

  async function fetchMissingVoeding() {
    if (!targetClientId) return
    try {
      const params = new URLSearchParams()
      if (!isClient) params.set("clientId", targetClientId)
      const response = await fetch(`/api/voeding/missing?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMissingVoedingCount(data.summary?.total || 0)
      }
    } catch (error) {
      console.error("Error fetching missing voeding:", error)
    }
  }

  async function checkCaregiverShift() {
    if (!isCaregiver || !targetClientId || !user.caregiverProfile) {
      setHasShiftOnDate(true) // clients always allowed
      return
    }
    try {
      const response = await fetch(
        `/api/scheduling/shifts?clientId=${targetClientId}&startDate=${selectedDate}&endDate=${selectedDate}`
      )
      if (response.ok) {
        const data = await response.json()
        const hasShift = data.some(
          (shift: any) => shift.caregiverId === user.caregiverProfile?.id
        )
        setHasShiftOnDate(hasShift)
      } else {
        setHasShiftOnDate(false)
      }
    } catch {
      setHasShiftOnDate(false)
    }
  }

  async function loadData() {
    setIsLoading(true)
    try {
      // Always check shift for caregivers
      if (isCaregiver) {
        await checkCaregiverShift()
      }

      if (activeTab === "meals") {
        if (isClient) {
          await Promise.all([fetchMealRecords(), fetchMealSchedules(), fetchDailyMealSchedule()])
        } else {
          await Promise.all([fetchMealRecords(), fetchDailyMealSchedule()])
        }
      } else if (activeTab === "tube-feeding") {
        if (isClient) {
          await Promise.all([fetchTubeFeedingSchedules(), fetchDailySchedule()])
        } else {
          await fetchDailySchedule()
        }
      } else if (activeTab === "fluid-balance") {
        if (isClient) {
          await Promise.all([fetchFluidIntakeRecords(), fetchUrineRecords(), fetchFluidSchedules(), fetchDailyFluidSchedule()])
        } else {
          await Promise.all([fetchFluidIntakeRecords(), fetchUrineRecords(), fetchDailyFluidSchedule()])
        }
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

  // Register a scheduled meal via dialog form
  async function handleRegisterMeal(item: DailyMealScheduleItem, formData: { description: string; amount: string; notes: string }) {
    if (!targetClientId) return
    try {
      const response = await fetch("/api/voeding/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          recordDate: selectedDate,
          recordTime: item.time,
          mealType: item.schedule.mealType,
          description: formData.description,
          amount: formData.amount,
          notes: formData.notes || "",
        }),
      })
      if (response.ok) {
        await Promise.all([fetchMealRecords(), fetchDailyMealSchedule()])
      }
    } catch (error) {
      console.error("Error registering meal:", error)
    }
  }

  // Register a scheduled fluid intake via dialog form
  async function handleRegisterFluid(item: DailyFluidScheduleItem, formData: { volume: number; fluidType: string; notes: string }) {
    if (!targetClientId) return
    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = item.time.split(":").map(Number)
      const recordDate = new Date(year, month - 1, day)
      const recordTime = new Date(year, month - 1, day, hours, minutes)

      const response = await fetch("/api/io/fluid-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          recordDate: recordDate.toISOString(),
          recordTime: recordTime.toISOString(),
          volume: formData.volume,
          fluidType: formData.fluidType,
          notes: formData.notes || null,
        }),
      })
      if (response.ok) {
        await Promise.all([fetchFluidIntakeRecords(), fetchDailyFluidSchedule()])
      }
    } catch (error) {
      console.error("Error registering fluid intake:", error)
    }
  }

  // Ad-hoc tube feeding registration (extra feeding not on schedule)
  async function handleAdHocTubeFeeding(data: {
    scheduleId: string
    time: string
    volumeGiven: number
    speedUsed: number
    wasGiven: boolean
    skipReason: string
    notes: string
  }) {
    if (!targetClientId) return
    const [year, month, day] = selectedDate.split("-").map(Number)
    const [hours, minutes] = data.time.split(":").map(Number)
    const scheduledTime = new Date(year, month - 1, day, hours, minutes)
    try {
      const response = await fetch("/api/voeding/tube-feeding/administer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: data.scheduleId,
          clientId: targetClientId,
          scheduledTime: scheduledTime.toISOString(),
          volumeGiven: data.volumeGiven,
          speedUsed: data.speedUsed,
          wasGiven: data.wasGiven,
          skipReason: data.wasGiven ? null : data.skipReason,
          notes: data.notes || null,
        }),
      })
      if (response.ok) {
        await fetchDailySchedule()
      }
    } catch (error) {
      console.error("Error ad-hoc tube feeding:", error)
    }
  }

  // === Meal Schedule functions ===
  async function fetchMealSchedules() {
    try {
      const response = await fetch(`/api/voeding/meals/schedule?clientId=${targetClientId}`)
      if (response.ok) {
        const data = await response.json()
        setMealSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error fetching meal schedules:", error)
    }
  }

  async function fetchDailyMealSchedule() {
    try {
      const response = await fetch(`/api/voeding/meals/daily?clientId=${targetClientId}&date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setDailyMealSchedule(data.schedule || [])
      }
    } catch (error) {
      console.error("Error fetching daily meal schedule:", error)
    }
  }

  async function handleAddMealSchedule() {
    if (!targetClientId) return
    try {
      const response = await fetch("/api/voeding/meals/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: targetClientId, ...newMealSchedule }),
      })
      if (response.ok) {
        await fetchMealSchedules()
        setIsMealScheduleDialogOpen(false)
        setNewMealSchedule({ mealTime: "08:00", mealType: "breakfast", description: "", recurrenceType: "daily", daysOfWeek: [], startDate: new Date().toISOString().split("T")[0], endDate: "" })
      } else {
        const data = await response.json()
        alert(data.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      console.error("Error adding meal schedule:", error)
    }
  }

  async function handleUpdateMealSchedule() {
    if (!editingMealSchedule) return
    try {
      const response = await fetch(`/api/voeding/meals/schedule/${editingMealSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMealSchedule),
      })
      if (response.ok) {
        await fetchMealSchedules()
        setIsMealScheduleDialogOpen(false)
        setEditingMealSchedule(null)
        setNewMealSchedule({ mealTime: "08:00", mealType: "breakfast", description: "", recurrenceType: "daily", daysOfWeek: [], startDate: new Date().toISOString().split("T")[0], endDate: "" })
      }
    } catch (error) {
      console.error("Error updating meal schedule:", error)
    }
  }

  async function handleDeleteMealSchedule(id: string) {
    if (!confirm("Weet u zeker dat u dit schema wilt verwijderen?")) return
    try {
      const response = await fetch(`/api/voeding/meals/schedule/${id}`, { method: "DELETE" })
      if (response.ok) await fetchMealSchedules()
    } catch (error) {
      console.error("Error deleting meal schedule:", error)
    }
  }

  function openEditMealScheduleDialog(schedule: MealScheduleItem) {
    setEditingMealSchedule(schedule)
    setNewMealSchedule({
      mealTime: schedule.mealTime,
      mealType: schedule.mealType,
      description: schedule.description || "",
      recurrenceType: schedule.recurrenceType || "daily",
      daysOfWeek: schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [],
      startDate: schedule.startDate ? new Date(schedule.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().split("T")[0] : "",
    })
    setIsMealScheduleDialogOpen(true)
  }

  // === Fluid Intake Schedule functions ===
  async function fetchFluidSchedules() {
    try {
      const response = await fetch(`/api/voeding/fluid/schedule?clientId=${targetClientId}`)
      if (response.ok) {
        const data = await response.json()
        setFluidSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error fetching fluid schedules:", error)
    }
  }

  async function fetchDailyFluidSchedule() {
    try {
      const response = await fetch(`/api/voeding/fluid/daily?clientId=${targetClientId}&date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setDailyFluidSchedule(data.schedule || [])
      }
    } catch (error) {
      console.error("Error fetching daily fluid schedule:", error)
    }
  }

  async function handleAddFluidSchedule() {
    if (!targetClientId) return
    try {
      const response = await fetch("/api/voeding/fluid/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: targetClientId, ...newFluidSchedule }),
      })
      if (response.ok) {
        await fetchFluidSchedules()
        setIsFluidScheduleDialogOpen(false)
        setNewFluidSchedule({ intakeTime: "08:00", volume: 200, fluidType: "", recurrenceType: "daily", daysOfWeek: [], startDate: new Date().toISOString().split("T")[0], endDate: "" })
      } else {
        const data = await response.json()
        alert(data.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      console.error("Error adding fluid schedule:", error)
    }
  }

  async function handleUpdateFluidSchedule() {
    if (!editingFluidSchedule) return
    try {
      const response = await fetch(`/api/voeding/fluid/schedule/${editingFluidSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFluidSchedule),
      })
      if (response.ok) {
        await fetchFluidSchedules()
        setIsFluidScheduleDialogOpen(false)
        setEditingFluidSchedule(null)
        setNewFluidSchedule({ intakeTime: "08:00", volume: 200, fluidType: "", recurrenceType: "daily", daysOfWeek: [], startDate: new Date().toISOString().split("T")[0], endDate: "" })
      }
    } catch (error) {
      console.error("Error updating fluid schedule:", error)
    }
  }

  async function handleDeleteFluidSchedule(id: string) {
    if (!confirm("Weet u zeker dat u dit schema wilt verwijderen?")) return
    try {
      const response = await fetch(`/api/voeding/fluid/schedule/${id}`, { method: "DELETE" })
      if (response.ok) await fetchFluidSchedules()
    } catch (error) {
      console.error("Error deleting fluid schedule:", error)
    }
  }

  function openEditFluidScheduleDialog(schedule: FluidIntakeScheduleItem) {
    setEditingFluidSchedule(schedule)
    setNewFluidSchedule({
      intakeTime: schedule.intakeTime,
      volume: schedule.volume,
      fluidType: schedule.fluidType || "",
      recurrenceType: schedule.recurrenceType || "daily",
      daysOfWeek: schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [],
      startDate: schedule.startDate ? new Date(schedule.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().split("T")[0] : "",
    })
    setIsFluidScheduleDialogOpen(true)
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

  async function fetchOpenDays() {
    if (!isCaregiver) return
    try {
      const response = await fetch("/api/caregiver/missed-tasks")
      if (response.ok) {
        const result = await response.json()
        const dates: string[] = (result.missedDays || [])
          .map((d: { date: string }) => d.date)
          .sort()
        setOpenDays(dates)
      }
    } catch {
      // Silently fail - open day navigation is supplementary
    }
  }

  function goToPreviousOpenDay() {
    const prev = openDays.filter((d) => d < selectedDate)
    if (prev.length > 0) setSelectedDate(prev[prev.length - 1])
  }

  function goToNextOpenDay() {
    const next = openDays.filter((d) => d > selectedDate)
    if (next.length > 0) setSelectedDate(next[0])
  }

  const hasPreviousOpenDay = openDays.some((d) => d < selectedDate)
  const hasNextOpenDay = openDays.some((d) => d > selectedDate)
  const isToday = selectedDate === new Date().toISOString().split("T")[0]

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
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voeding</h1>
            <p className="text-muted-foreground mt-1">
              {isClient
                ? "Beheer maaltijden en sondevoeding schema&apos;s"
                : "Registreer maaltijden en sondevoeding toediening"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className={missingVoedingCount > 0 ? "bg-orange-50 border-orange-200 text-orange-700" : ""}>
              Ontbrekende Registraties
              {missingVoedingCount > 0 && (
                <span className="ml-2 bg-orange-600 text-white rounded-full px-2 py-0.5 text-xs">
                  {missingVoedingCount}
                </span>
              )}
            </Button>
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
          {isCaregiver && activeTab === "meals" && (
            <Button disabled={!canRegister} onClick={() => setIsMealDialogOpen(true)}>
              + Maaltijd Toevoegen
            </Button>
          )}
          {isCaregiver && activeTab === "tube-feeding" && dailySchedule.length > 0 && (
            <Button disabled={!canRegister} onClick={() => setIsAdHocTubeFeedingOpen(true)}>
              + Sondevoeding Toevoegen
            </Button>
          )}
          {isCaregiver && activeTab === "fluid-balance" && (
            <Button disabled={!canRegister} onClick={() => setIsFluidIntakeDialogOpen(true)}>
              + Registreer Vochtinname
            </Button>
          )}
        </div>

        {/* Overview Card - above date selector, matching Medication page layout */}
        {!isLoading && activeTab === "meals" && (mealRecords.length > 0 || dailyMealSchedule.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Overzicht {new Date(selectedDate).toLocaleDateString("nl-NL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyMealSchedule.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{mealScheduleOverview.total}</div>
                    <div className="text-sm text-muted-foreground">Gepland</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{mealScheduleOverview.done}</div>
                    <div className="text-sm text-muted-foreground">Geregistreerd</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${mealScheduleOverview.pending > 0 ? "text-amber-600" : "text-gray-400"}`}>{mealScheduleOverview.pending}</div>
                    <div className="text-sm text-muted-foreground">Nog te doen</div>
                  </div>
                </div>
              )}
              {mealRecords.length > 0 && (
                <>
                  {dailyMealSchedule.length > 0 && <hr className="border-gray-200" />}
                  <div className="grid grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{mealOverview.total}</div>
                      <div className="text-sm text-muted-foreground">Totaal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{mealOverview.breakfast}</div>
                      <div className="text-sm text-muted-foreground">Ontbijt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{mealOverview.lunch}</div>
                      <div className="text-sm text-muted-foreground">Lunch</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{mealOverview.dinner}</div>
                      <div className="text-sm text-muted-foreground">Avondeten</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{mealOverview.snacks}</div>
                      <div className="text-sm text-muted-foreground">Tussendoor</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!isLoading && activeTab === "tube-feeding" && dailySchedule.length > 0 && (
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
                  <div className="text-2xl font-bold">{tubeOverview.total}</div>
                  <div className="text-sm text-muted-foreground">Totaal</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{tubeOverview.given}</div>
                  <div className="text-sm text-muted-foreground">Toegediend</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{tubeOverview.skipped}</div>
                  <div className="text-sm text-muted-foreground">Overgeslagen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{tubeOverview.pending}</div>
                  <div className="text-sm text-muted-foreground">Nog te doen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{tubeOverview.volumeGiven} / {tubeOverview.volumeExpected} ml</div>
                  <div className="text-sm text-muted-foreground">Volume</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && activeTab === "fluid-balance" && (fluidIntakeRecords.length > 0 || urineRecords.length > 0 || dailyFluidSchedule.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Overzicht {new Date(selectedDate).toLocaleDateString("nl-NL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyFluidSchedule.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{fluidScheduleOverview.total}</div>
                    <div className="text-sm text-muted-foreground">Gepland</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{fluidScheduleOverview.done}</div>
                    <div className="text-sm text-muted-foreground">Geregistreerd</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${fluidScheduleOverview.pending > 0 ? "text-amber-600" : "text-gray-400"}`}>{fluidScheduleOverview.pending}</div>
                    <div className="text-sm text-muted-foreground">Nog te doen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{fluidTotalIntake} / {fluidScheduleOverview.volumeExpected} ml</div>
                    <div className="text-sm text-muted-foreground">Volume</div>
                  </div>
                </div>
              )}
              {(fluidIntakeRecords.length > 0 || urineRecords.length > 0) && (
                <>
                  {dailyFluidSchedule.length > 0 && <hr className="border-gray-200" />}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{fluidTotalIntake} ml</div>
                      <div className="text-sm text-muted-foreground">Totaal Inname</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">{fluidTotalOutput} ml</div>
                      <div className="text-sm text-muted-foreground">Totaal Uitscheiding</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${fluidBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fluidBalance} ml
                      </div>
                      <div className="text-sm text-muted-foreground">Balans (In - Uit)</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Date Selector */}
        {(activeTab === "meals" || activeTab === "tube-feeding" || activeTab === "fluid-balance") && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCaregiver && openDays.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousOpenDay}
                      disabled={!hasPreviousOpenDay}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      title="Vorige dag met ontbrekende taken"
                    >
                      <ChevronsLeft className="h-4 w-4 mr-1" />
                      Vorige Open Dag
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeDate(-1)}
                  >
                    &larr; Vorige Dag
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  {isCaregiver && openDays.length > 0 && (
                    <span className="text-xs text-amber-600 font-medium hidden md:inline">
                      {openDays.length} dag{openDays.length !== 1 ? "en" : ""} open
                    </span>
                  )}
                  <Input
                    type="date"
                    title="Selecteer datum"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                  {!isToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToToday()}
                    >
                      Naar Vandaag
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeDate(1)}
                  >
                    Volgende Dag &rarr;
                  </Button>
                  {isCaregiver && openDays.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextOpenDay}
                      disabled={!hasNextOpenDay}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      title="Volgende dag met ontbrekende taken"
                    >
                      Volgende Open Dag
                      <ChevronsRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning banners for registration restrictions */}
        {isCaregiver && !isLoading && isFutureDate && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-800 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Registratie is niet mogelijk voor toekomstige dagen.</span>
          </div>
        )}
        {isCaregiver && !isLoading && !isFutureDate && !hasShiftOnDate && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-800 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>U heeft geen dienst op deze dag. Registratie is niet mogelijk.</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">Laden...</div>
        ) : activeTab === "meals" ? (
          <>
            {isClient && (
              <MealScheduleSection
                schedules={mealSchedules}
                isScheduleDialogOpen={isMealScheduleDialogOpen}
                setIsScheduleDialogOpen={setIsMealScheduleDialogOpen}
                editingSchedule={editingMealSchedule}
                setEditingSchedule={setEditingMealSchedule}
                newSchedule={newMealSchedule}
                setNewSchedule={setNewMealSchedule}
                handleAddSchedule={handleAddMealSchedule}
                handleUpdateSchedule={handleUpdateMealSchedule}
                handleDeleteSchedule={handleDeleteMealSchedule}
                openEditScheduleDialog={openEditMealScheduleDialog}
              />
            )}
            {isCaregiver && dailyMealSchedule.length > 0 && (
              <DailyMealScheduleCard
                items={dailyMealSchedule}
                selectedDate={selectedDate}
                onRegister={canRegister ? handleRegisterMeal : undefined}
              />
            )}
            <MealsTab
              mealRecords={mealRecords}
              isCaregiver={isCaregiver}
              isMealDialogOpen={isMealDialogOpen}
              setIsMealDialogOpen={setIsMealDialogOpen}
              newMeal={newMeal}
              setNewMeal={setNewMeal}
              handleAddMeal={handleAddMeal}
              selectedDate={selectedDate}
              canRegister={canRegister}
            />
          </>
        ) : activeTab === "fluid-balance" ? (
          <>
            {isClient && (
              <FluidScheduleSection
                schedules={fluidSchedules}
                isScheduleDialogOpen={isFluidScheduleDialogOpen}
                setIsScheduleDialogOpen={setIsFluidScheduleDialogOpen}
                editingSchedule={editingFluidSchedule}
                setEditingSchedule={setEditingFluidSchedule}
                newSchedule={newFluidSchedule}
                setNewSchedule={setNewFluidSchedule}
                handleAddSchedule={handleAddFluidSchedule}
                handleUpdateSchedule={handleUpdateFluidSchedule}
                handleDeleteSchedule={handleDeleteFluidSchedule}
                openEditScheduleDialog={openEditFluidScheduleDialog}
              />
            )}
            {isCaregiver && dailyFluidSchedule.length > 0 && (
              <DailyFluidScheduleCard
                items={dailyFluidSchedule}
                selectedDate={selectedDate}
                onRegister={canRegister ? handleRegisterFluid : undefined}
              />
            )}
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
              canRegister={canRegister}
            />
          </>
        ) : activeTab === "tube-feeding" && isClient ? (
          <>
            <TubeFeedingScheduleTab
              schedules={tubeFeedingSchedules}
              isScheduleDialogOpen={isScheduleDialogOpen}
              setIsScheduleDialogOpen={setIsScheduleDialogOpen}
              editingSchedule={editingSchedule}
              setEditingSchedule={setEditingSchedule}
              newSchedule={newSchedule}
              setNewSchedule={setNewSchedule}
              handleAddSchedule={handleAddSchedule}
              handleUpdateSchedule={handleUpdateSchedule}
              handleDeleteSchedule={handleDeleteSchedule}
              openEditScheduleDialog={openEditScheduleDialog}
            />
            {dailySchedule.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Toedieningen</CardTitle>
                  <CardDescription>Overzicht van sondevoeding op {new Date(selectedDate).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dailySchedule.map((item, index) => (
                      <Card key={index} className={`border-l-4 ${item.status === "given" ? "border-l-green-500" : item.status === "skipped" ? "border-l-red-500" : "border-l-amber-400"}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{item.time}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  item.status === "given" ? "bg-green-100 text-green-700" :
                                  item.status === "skipped" ? "bg-red-100 text-red-700" :
                                  "bg-amber-100 text-amber-700"
                                }`}>
                                  {item.status === "given" ? "Toegediend" : item.status === "skipped" ? "Overgeslagen" : "Nog te doen"}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>💧 Volume: {item.schedule.volume} ml</p>
                                <p>⚡ Snelheid: {item.schedule.feedSpeed} ml/uur</p>
                                {item.schedule.feedType && <p>🏷️ Type: {item.schedule.feedType}</p>}
                                {item.administration && (
                                  <>
                                    {item.administration.volumeGiven !== item.schedule.volume && (
                                      <p>💧 Werkelijk volume: {item.administration.volumeGiven} ml</p>
                                    )}
                                    {item.administration.notes && <p>💭 {item.administration.notes}</p>}
                                    {item.administration.skipReason && <p>❌ Reden: {item.administration.skipReason}</p>}
                                    <p className="text-xs mt-1">Geregistreerd door: {item.administration.caregiver.name}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
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
            canRegister={canRegister}
            onAdHocRegister={canRegister ? handleAdHocTubeFeeding : undefined}
            adHocDialogOpen={isAdHocTubeFeedingOpen}
            setAdHocDialogOpen={setIsAdHocTubeFeedingOpen}
          />
        )}
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
  canRegister = true,
}: {
  mealRecords: MealRecord[]
  isCaregiver: boolean
  isMealDialogOpen: boolean
  setIsMealDialogOpen: (open: boolean) => void
  newMeal: { time: string; mealType: string; description: string; amount: string; notes: string }
  setNewMeal: React.Dispatch<React.SetStateAction<{ time: string; mealType: string; description: string; amount: string; notes: string }>>
  handleAddMeal: () => void
  selectedDate: string
  canRegister?: boolean
}) {
  const mealTypeLabels: Record<string, string> = {
    breakfast: "Ontbijt",
    lunch: "Lunch",
    dinner: "Avondeten",
    snack: "Tussendoortje",
  }

  const isFutureDate = !canRegister

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle>Maaltijden</CardTitle>
        <CardDescription>Registreer wat de cliënt heeft gegeten</CardDescription>
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

    {/* Add meal dialog (triggered from top button) */}
    {isCaregiver && (
      <Dialog open={isMealDialogOpen} onOpenChange={setIsMealDialogOpen}>
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
    </>
  )
}

// Tube Feeding Schedule Tab (for Clients)
function TubeFeedingScheduleTab({
  schedules,
  isScheduleDialogOpen,
  setIsScheduleDialogOpen,
  editingSchedule,
  setEditingSchedule,
  newSchedule,
  setNewSchedule,
  handleAddSchedule,
  handleUpdateSchedule,
  handleDeleteSchedule,
  openEditScheduleDialog,
}: {
  schedules: TubeFeedingSchedule[]
  isScheduleDialogOpen: boolean
  setIsScheduleDialogOpen: (open: boolean) => void
  editingSchedule: TubeFeedingSchedule | null
  setEditingSchedule: React.Dispatch<React.SetStateAction<TubeFeedingSchedule | null>>
  newSchedule: { feedingTime: string; volume: number; feedSpeed: number; feedType: string; recurrenceType: string; daysOfWeek: string[]; startDate: string; endDate: string }
  setNewSchedule: React.Dispatch<React.SetStateAction<{ feedingTime: string; volume: number; feedSpeed: number; feedType: string; recurrenceType: string; daysOfWeek: string[]; startDate: string; endDate: string }>>
  handleAddSchedule: () => void
  handleUpdateSchedule: () => void
  handleDeleteSchedule: (id: string) => void
  openEditScheduleDialog: (schedule: TubeFeedingSchedule) => void
}) {
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
                      max={getMaxEndDate()}
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
                      max={getMaxEndDate()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum: 31 december {new Date().getFullYear() + 1}
                    </p>
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
            <p>Nog geen voedingsschema&apos;s aangemaakt</p>
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditScheduleDialog(schedule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteSchedule(schedule.id)}>
                        <Trash2 className="h-4 w-4" />
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
  canRegister = true,
  onAdHocRegister,
  adHocDialogOpen,
  setAdHocDialogOpen,
}: {
  dailySchedule: DailyScheduleItem[]
  administerDialogOpen: boolean
  selectedScheduleItem: DailyScheduleItem | null
  administrationForm: AdministrationForm
  setAdministrationForm: (form: AdministrationForm) => void
  handleAdministerFeeding: () => void
  openAdministerDialog: (item: DailyScheduleItem) => void
  setAdministerDialogOpen: (open: boolean) => void
  selectedDate: string
  canRegister?: boolean
  onAdHocRegister?: (data: { scheduleId: string; time: string; volumeGiven: number; speedUsed: number; wasGiven: boolean; skipReason: string; notes: string }) => Promise<void>
  adHocDialogOpen: boolean
  setAdHocDialogOpen: (open: boolean) => void
}) {
  const [adHocForm, setAdHocForm] = useState({
    scheduleId: "",
    time: new Date().toTimeString().slice(0, 5),
    volumeGiven: 0,
    speedUsed: 0,
    wasGiven: true,
    skipReason: "",
    notes: "",
  })

  // Calculate summary
  const summary = {
    total: dailySchedule.length,
    given: dailySchedule.filter((item) => item.status === "given").length,
    skipped: dailySchedule.filter((item) => item.status === "skipped").length,
    pending: dailySchedule.filter((item) => item.status === "pending").length,
  }

  // Extract unique schedules for ad-hoc selector
  const uniqueSchedules = dailySchedule.reduce((acc, item) => {
    if (!acc.find((s) => s.id === item.schedule.id)) {
      acc.push(item.schedule)
    }
    return acc
  }, [] as TubeFeedingSchedule[])

  // Extract administered items for records list
  const administeredItems = dailySchedule.filter(
    (item) => item.status === "given" || item.status === "skipped"
  )

  const isFutureDate = !canRegister

  // Initialize form when ad-hoc dialog opens from parent
  useEffect(() => {
    if (adHocDialogOpen) {
      const firstSchedule = uniqueSchedules[0]
      setAdHocForm({
        scheduleId: firstSchedule?.id || "",
        time: new Date().toTimeString().slice(0, 5),
        volumeGiven: firstSchedule?.volume || 250,
        speedUsed: firstSchedule?.feedSpeed || 100,
        wasGiven: true,
        skipReason: "",
        notes: "",
      })
    }
  }, [adHocDialogOpen])

  async function handleAdHocSubmit() {
    if (onAdHocRegister) {
      await onAdHocRegister(adHocForm)
      setAdHocDialogOpen(false)
    }
  }

  function handleScheduleChange(scheduleId: string) {
    const schedule = uniqueSchedules.find((s) => s.id === scheduleId)
    if (schedule) {
      setAdHocForm({
        ...adHocForm,
        scheduleId,
        volumeGiven: schedule.volume,
        speedUsed: schedule.feedSpeed,
      })
    }
  }

  return (
    <>
      {/* Expected Schedule Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verwachte Sondevoeding</CardTitle>
              <CardDescription>Schema voor {new Date(selectedDate).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</CardDescription>
            </div>
            {dailySchedule.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600 font-medium">{summary.given} geregistreerd</span>
                {summary.skipped > 0 && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="text-red-600 font-medium">{summary.skipped} overgeslagen</span>
                  </>
                )}
                <span className="text-gray-400">|</span>
                <span className="text-amber-600 font-medium">{summary.pending} te doen</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dailySchedule.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Geen voedingsschema&apos;s gepland voor deze dag</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dailySchedule.map((item: DailyScheduleItem, index: number) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.status === "given" ? "bg-green-50 border-green-200" :
                    item.status === "skipped" ? "bg-red-50 border-red-200" :
                    "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{item.time}</span>
                    <span className="font-bold text-blue-600">{item.schedule.volume} ml</span>
                    <span className="text-sm text-muted-foreground">{item.schedule.feedSpeed} ml/uur</span>
                    {item.schedule.feedType && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {item.schedule.feedType}
                      </span>
                    )}
                    {item.administration && (
                      <span className="text-xs text-muted-foreground">
                        Door: {item.administration.caregiver.name}
                      </span>
                    )}
                  </div>
                  {item.status === "pending" && canRegister ? (
                    <Button
                      size="sm"
                      onClick={() => openAdministerDialog(item)}
                    >
                      Registreer
                    </Button>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.status === "given" ? "bg-green-100 text-green-700" :
                      item.status === "skipped" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {item.status === "given" && "Geregistreerd"}
                      {item.status === "skipped" && "Overgeslagen"}
                      {item.status === "pending" && "Te doen"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registrations Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sondevoeding</CardTitle>
          <CardDescription>Registreer sondevoeding voor deze dag</CardDescription>
        </CardHeader>
        <CardContent>
          {administeredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Geen sondevoeding geregistreerd voor deze dag</p>
            </div>
          ) : (
            <div className="space-y-3">
              {administeredItems.map((item, index) => (
                <Card key={index} className={`border-l-4 ${item.status === "given" ? "border-l-green-500" : "border-l-red-500"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">{item.time}</span>
                          {item.status === "given" && item.administration && (
                            <>
                              <span className="text-lg font-bold text-green-600">{item.administration.volumeGiven} ml</span>
                              <span className="text-sm text-muted-foreground">{item.administration.speedUsed} ml/uur</span>
                            </>
                          )}
                          {item.schedule.feedType && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {item.schedule.feedType}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            item.status === "given" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {item.status === "given" ? "Geregistreerd" : "Overgeslagen"}
                          </span>
                        </div>
                        {item.status === "skipped" && item.administration?.skipReason && (
                          <p className="text-sm text-red-600 mb-1">Reden: {item.administration.skipReason}</p>
                        )}
                        {item.administration?.notes && (
                          <p className="text-xs text-muted-foreground italic">💭 {item.administration.notes}</p>
                        )}
                        {item.administration && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Geregistreerd door: {item.administration.caregiver.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled item register dialog */}
      <Dialog open={administerDialogOpen} onOpenChange={setAdministerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sondevoeding Registreren</DialogTitle>
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

      {/* Ad-hoc tube feeding dialog */}
      <Dialog open={adHocDialogOpen} onOpenChange={setAdHocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extra Sondevoeding Registreren</DialogTitle>
            <DialogDescription>Voeg een extra sondevoeding toe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="adHocTime">Tijd *</Label>
              <Input
                id="adHocTime"
                type="time"
                value={adHocForm.time}
                onChange={(e) => setAdHocForm({ ...adHocForm, time: e.target.value })}
              />
            </div>
            {uniqueSchedules.length > 1 && (
              <div>
                <Label>Schema</Label>
                <Select value={adHocForm.scheduleId} onValueChange={handleScheduleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueSchedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.feedingTime} - {s.volume}ml @ {s.feedSpeed}ml/uur {s.feedType ? `(${s.feedType})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-4">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={adHocForm.wasGiven ? "default" : "outline"}
                  onClick={() => setAdHocForm({ ...adHocForm, wasGiven: true })}
                >
                  Toegediend
                </Button>
                <Button
                  size="sm"
                  variant={!adHocForm.wasGiven ? "destructive" : "outline"}
                  onClick={() => setAdHocForm({ ...adHocForm, wasGiven: false })}
                >
                  Overgeslagen
                </Button>
              </div>
            </div>
            {adHocForm.wasGiven ? (
              <>
                <div>
                  <Label htmlFor="adHocVolume">Volume Gegeven (ml)</Label>
                  <Input
                    id="adHocVolume"
                    type="number"
                    value={adHocForm.volumeGiven || ""}
                    onChange={(e) => setAdHocForm({ ...adHocForm, volumeGiven: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="adHocSpeed">Snelheid Gebruikt (ml/uur)</Label>
                  <Input
                    id="adHocSpeed"
                    type="number"
                    value={adHocForm.speedUsed || ""}
                    onChange={(e) => setAdHocForm({ ...adHocForm, speedUsed: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="adHocNotes">Notities (optioneel)</Label>
                  <Textarea
                    id="adHocNotes"
                    value={adHocForm.notes}
                    onChange={(e) => setAdHocForm({ ...adHocForm, notes: e.target.value })}
                    placeholder="Extra opmerkingen..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="adHocSkipReason">Reden voor Overslaan *</Label>
                <Textarea
                  id="adHocSkipReason"
                  value={adHocForm.skipReason}
                  onChange={(e) => setAdHocForm({ ...adHocForm, skipReason: e.target.value })}
                  placeholder="Waarom werd de voeding overgeslagen?"
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdHocSubmit} className="flex-1">Toevoegen</Button>
            <Button variant="outline" onClick={() => setAdHocDialogOpen(false)} className="flex-1">Annuleren</Button>
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
  canRegister = true,
}: {
  fluidIntakeRecords: FluidIntakeRecord[]
  urineRecords: UrineRecord[]
  isCaregiver: boolean
  isFluidIntakeDialogOpen: boolean
  setIsFluidIntakeDialogOpen: (open: boolean) => void
  newFluidIntake: { time: string; volume: string; fluidType: string; notes: string }
  setNewFluidIntake: React.Dispatch<React.SetStateAction<{ time: string; volume: string; fluidType: string; notes: string }>>
  handleAddFluidIntake: () => void
  handleDeleteFluidIntake: (id: string) => void
  selectedDate: string
  canRegister?: boolean
}) {
  const isFutureDate = !canRegister

  // Calculate totals
  const totalIntake = fluidIntakeRecords.reduce((sum: number, r: FluidIntakeRecord) => sum + r.volume, 0)
  const totalOutput = urineRecords.reduce((sum: number, r: UrineRecord) => sum + r.volume, 0)
  const balance = totalIntake - totalOutput

  return (
    <>
      {/* Fluid Intake Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vochtinname</CardTitle>
          <CardDescription>Registreer vochtinname voor deze dag</CardDescription>
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

      {/* Add fluid intake dialog (triggered from top button) */}
      {isCaregiver && (
        <Dialog open={isFluidIntakeDialogOpen} onOpenChange={setIsFluidIntakeDialogOpen}>
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
    </>
  )
}

// ============================================
// Meal Schedule Section (Client view)
// ============================================
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Ontbijt",
  lunch: "Lunch",
  dinner: "Avondeten",
  snack: "Tussendoortje",
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Dagelijks",
  weekly: "Wekelijks",
  specific_days: "Specifieke dagen",
  one_time: "Eenmalig",
}

const DAY_OPTIONS = [
  { value: "monday", label: "Maandag" },
  { value: "tuesday", label: "Dinsdag" },
  { value: "wednesday", label: "Woensdag" },
  { value: "thursday", label: "Donderdag" },
  { value: "friday", label: "Vrijdag" },
  { value: "saturday", label: "Zaterdag" },
  { value: "sunday", label: "Zondag" },
]

function ScheduleDaysOfWeekPicker({
  daysOfWeek,
  onChange,
}: {
  daysOfWeek: string[]
  onChange: (days: string[]) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {DAY_OPTIONS.map((day) => (
        <div key={day.value} className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={`day-${day.value}`}
            checked={daysOfWeek.includes(day.value)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...daysOfWeek, day.value])
              } else {
                onChange(daysOfWeek.filter(d => d !== day.value))
              }
            }}
            className="rounded"
          />
          <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
            {day.label}
          </label>
        </div>
      ))}
    </div>
  )
}

function getMaxEndDate(): string {
  const d = new Date(new Date().getFullYear() + 1, 11, 31)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function RecurrenceSelector({
  recurrenceType,
  daysOfWeek,
  startDate,
  endDate,
  onRecurrenceChange,
  onDaysChange,
  onStartDateChange,
  onEndDateChange,
}: {
  recurrenceType: string
  daysOfWeek: string[]
  startDate: string
  endDate: string
  onRecurrenceChange: (value: string) => void
  onDaysChange: (days: string[]) => void
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}) {
  const maxDate = getMaxEndDate()

  return (
    <>
      <div>
        <Label>Herhaling *</Label>
        <Select value={recurrenceType} onValueChange={onRecurrenceChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">Eenmalig</SelectItem>
            <SelectItem value="daily">Dagelijks</SelectItem>
            <SelectItem value="weekly">Wekelijks</SelectItem>
            <SelectItem value="specific_days">Specifieke dagen</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(recurrenceType === "weekly" || recurrenceType === "specific_days") && (
        <div>
          <Label>Dagen van de week *</Label>
          <ScheduleDaysOfWeekPicker daysOfWeek={daysOfWeek} onChange={onDaysChange} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Startdatum *</Label>
          <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} max={maxDate} />
        </div>
        <div>
          <Label>Einddatum (optioneel)</Label>
          <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} min={startDate} max={maxDate} />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum: 31 december {new Date().getFullYear() + 1}
          </p>
        </div>
      </div>
    </>
  )
}

function MealScheduleSection({
  schedules,
  isScheduleDialogOpen,
  setIsScheduleDialogOpen,
  editingSchedule,
  setEditingSchedule,
  newSchedule,
  setNewSchedule,
  handleAddSchedule,
  handleUpdateSchedule,
  handleDeleteSchedule,
  openEditScheduleDialog,
}: {
  schedules: MealScheduleItem[]
  isScheduleDialogOpen: boolean
  setIsScheduleDialogOpen: (open: boolean) => void
  editingSchedule: MealScheduleItem | null
  setEditingSchedule: React.Dispatch<React.SetStateAction<MealScheduleItem | null>>
  newSchedule: { mealTime: string; mealType: string; description: string; recurrenceType: string; daysOfWeek: string[]; startDate: string; endDate: string }
  setNewSchedule: React.Dispatch<React.SetStateAction<{ mealTime: string; mealType: string; description: string; recurrenceType: string; daysOfWeek: string[]; startDate: string; endDate: string }>>
  handleAddSchedule: () => void
  handleUpdateSchedule: () => void
  handleDeleteSchedule: (id: string) => void
  openEditScheduleDialog: (schedule: MealScheduleItem) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Maaltijden Schema</CardTitle>
            <CardDescription>Stel in wanneer maaltijden verwacht worden</CardDescription>
          </div>
          <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => {
            setIsScheduleDialogOpen(open)
            if (!open) {
              setEditingSchedule(null)
              setNewSchedule({ mealTime: "08:00", mealType: "breakfast", description: "", recurrenceType: "daily", daysOfWeek: [], startDate: new Date().toISOString().split("T")[0], endDate: "" })
            }
          }}>
            <DialogTrigger asChild>
              <Button>+ Schema Toevoegen</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "Schema Bewerken" : "Nieuw Maaltijd Schema"}</DialogTitle>
                <DialogDescription>Stel in wanneer deze maaltijd verwacht wordt</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tijd *</Label>
                    <Input
                      type="time"
                      value={newSchedule.mealTime}
                      onChange={(e) => setNewSchedule({ ...newSchedule, mealTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type Maaltijd *</Label>
                    <Select value={newSchedule.mealType} onValueChange={(value) => setNewSchedule({ ...newSchedule, mealType: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Label>Omschrijving (optioneel)</Label>
                  <Input
                    value={newSchedule.description}
                    onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                    placeholder="Bijv. Brood met kaas, yoghurt..."
                  />
                </div>
                <RecurrenceSelector
                  recurrenceType={newSchedule.recurrenceType}
                  daysOfWeek={newSchedule.daysOfWeek}
                  startDate={newSchedule.startDate}
                  endDate={newSchedule.endDate}
                  onRecurrenceChange={(value) => setNewSchedule({ ...newSchedule, recurrenceType: value })}
                  onDaysChange={(days) => setNewSchedule({ ...newSchedule, daysOfWeek: days })}
                  onStartDateChange={(date) => setNewSchedule({ ...newSchedule, startDate: date })}
                  onEndDateChange={(date) => setNewSchedule({ ...newSchedule, endDate: date })}
                />
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
          <div className="text-center py-8 text-muted-foreground">
            <p>Nog geen maaltijd schema&apos;s aangemaakt</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className={`border-l-4 ${schedule.isActive ? "border-l-orange-500" : "border-l-gray-400"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{schedule.mealTime}</span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          {MEAL_TYPE_LABELS[schedule.mealType] || schedule.mealType}
                        </span>
                        {!schedule.isActive && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">Inactief</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {schedule.description && <p>📝 {schedule.description}</p>}
                        <p>🔄 {RECURRENCE_LABELS[schedule.recurrenceType] || schedule.recurrenceType}
                          {schedule.daysOfWeek && ` (${JSON.parse(schedule.daysOfWeek).length} dagen)`}
                        </p>
                        <p>📅 Van {new Date(schedule.startDate).toLocaleDateString("nl-NL")} {schedule.endDate && `tot ${new Date(schedule.endDate).toLocaleDateString("nl-NL")}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditScheduleDialog(schedule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteSchedule(schedule.id)}>
                        <Trash2 className="h-4 w-4" />
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

// ============================================
// Daily Meal Schedule Card (Caregiver view)
// ============================================
function DailyMealScheduleCard({
  items,
  selectedDate,
  onRegister,
}: {
  items: DailyMealScheduleItem[]
  selectedDate: string
  onRegister?: (item: DailyMealScheduleItem, formData: { description: string; amount: string; notes: string }) => Promise<void>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DailyMealScheduleItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mealForm, setMealForm] = useState({ description: "", amount: "normal", notes: "" })

  const summary = {
    total: items.length,
    done: items.filter(i => i.status === "done").length,
    pending: items.filter(i => i.status === "pending").length,
  }

  function openDialog(item: DailyMealScheduleItem) {
    setSelectedItem(item)
    setMealForm({
      description: item.schedule.description || "",
      amount: "normal",
      notes: "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!onRegister || !selectedItem) return
    setIsSubmitting(true)
    try {
      await onRegister(selectedItem, mealForm)
      setDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verwachte Maaltijden</CardTitle>
            <CardDescription>Schema voor {new Date(selectedDate).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-600 font-medium">{summary.done} geregistreerd</span>
            <span className="text-gray-400">|</span>
            <span className="text-amber-600 font-medium">{summary.pending} te doen</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.schedule.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                item.status === "done" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold">{item.time}</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {MEAL_TYPE_LABELS[item.schedule.mealType] || item.schedule.mealType}
                </span>
                {item.schedule.description && (
                  <span className="text-sm text-muted-foreground">{item.schedule.description}</span>
                )}
              </div>
              {item.status === "pending" && onRegister ? (
                <Button
                  size="sm"
                  onClick={() => openDialog(item)}
                >
                  Registreer
                </Button>
              ) : (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {item.status === "done" ? "Geregistreerd" : "Te doen"}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      {/* Registration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maaltijd Registreren</DialogTitle>
            <DialogDescription>
              {selectedItem && `${MEAL_TYPE_LABELS[selectedItem.schedule.mealType] || selectedItem.schedule.mealType} om ${selectedItem.time}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="mealDescription">Omschrijving</Label>
              <Input
                id="mealDescription"
                value={mealForm.description}
                onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                placeholder="Wat heeft de cliënt gegeten?"
              />
            </div>
            <div>
              <Label htmlFor="mealAmount">Hoeveelheid</Label>
              <Select value={mealForm.amount} onValueChange={(value) => setMealForm({ ...mealForm, amount: value })}>
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
              <Label htmlFor="mealNotes">Notities (optioneel)</Label>
              <Textarea
                id="mealNotes"
                value={mealForm.notes}
                onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                placeholder="Extra opmerkingen..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Bezig..." : "Opslaan"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================
// Fluid Intake Schedule Section (Client view)
// ============================================
const FLUID_TYPE_LABELS: Record<string, string> = {
  water: "Water",
  tea: "Thee",
  coffee: "Koffie",
  juice: "Sap",
  milk: "Melk",
  soup: "Soep",
  other: "Anders",
}

function FluidScheduleSection({
  schedules,
  isScheduleDialogOpen,
  setIsScheduleDialogOpen,
  editingSchedule,
  setEditingSchedule,
  newSchedule,
  setNewSchedule,
  handleAddSchedule,
  handleUpdateSchedule,
  handleDeleteSchedule,
  openEditScheduleDialog,
}: {
  schedules: FluidIntakeScheduleItem[]
  isScheduleDialogOpen: boolean
  setIsScheduleDialogOpen: (open: boolean) => void
  editingSchedule: FluidIntakeScheduleItem | null
  setEditingSchedule: React.Dispatch<React.SetStateAction<FluidIntakeScheduleItem | null>>
  newSchedule: { intakeTime: string; volume: number; fluidType: string; recurrenceType: string; daysOfWeek: string[]; startDate: string; endDate: string }
  setNewSchedule: React.Dispatch<React.SetStateAction<{ intakeTime: string; volume: number; fluidType: string; recurrenceType: string; daysOfWeek: string[]; startDate: string; endDate: string }>>
  handleAddSchedule: () => void
  handleUpdateSchedule: () => void
  handleDeleteSchedule: (id: string) => void
  openEditScheduleDialog: (schedule: FluidIntakeScheduleItem) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vochtinname Schema</CardTitle>
            <CardDescription>Stel in wanneer en hoeveel vocht verwacht wordt</CardDescription>
          </div>
          <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => {
            setIsScheduleDialogOpen(open)
            if (!open) {
              setEditingSchedule(null)
              setNewSchedule({ intakeTime: "08:00", volume: 200, fluidType: "", recurrenceType: "daily", daysOfWeek: [], startDate: new Date().toISOString().split("T")[0], endDate: "" })
            }
          }}>
            <DialogTrigger asChild>
              <Button>+ Schema Toevoegen</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "Schema Bewerken" : "Nieuw Vochtinname Schema"}</DialogTitle>
                <DialogDescription>Stel in wanneer en hoeveel vocht verwacht wordt</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Tijd *</Label>
                  <Input
                    type="time"
                    value={newSchedule.intakeTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, intakeTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Volume (ml) *</Label>
                  <Input
                    type="number"
                    value={newSchedule.volume || ""}
                    onChange={(e) => setNewSchedule({ ...newSchedule, volume: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  <div className="flex gap-2 flex-wrap mt-2">
                    {[100, 150, 200, 250, 300, 500].map((vol) => (
                      <Button
                        key={vol}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewSchedule({ ...newSchedule, volume: vol })}
                      >
                        {vol} ml
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Type Vloeistof (optioneel)</Label>
                  <Select value={newSchedule.fluidType || "none"} onValueChange={(value) => setNewSchedule({ ...newSchedule, fluidType: value === "none" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="Geen voorkeur" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen voorkeur</SelectItem>
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
                <RecurrenceSelector
                  recurrenceType={newSchedule.recurrenceType}
                  daysOfWeek={newSchedule.daysOfWeek}
                  startDate={newSchedule.startDate}
                  endDate={newSchedule.endDate}
                  onRecurrenceChange={(value) => setNewSchedule({ ...newSchedule, recurrenceType: value })}
                  onDaysChange={(days) => setNewSchedule({ ...newSchedule, daysOfWeek: days })}
                  onStartDateChange={(date) => setNewSchedule({ ...newSchedule, startDate: date })}
                  onEndDateChange={(date) => setNewSchedule({ ...newSchedule, endDate: date })}
                />
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
          <div className="text-center py-8 text-muted-foreground">
            <p>Nog geen vochtinname schema&apos;s aangemaakt</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className={`border-l-4 ${schedule.isActive ? "border-l-green-500" : "border-l-gray-400"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{schedule.intakeTime}</span>
                        <span className="text-lg font-bold text-green-600">{schedule.volume} ml</span>
                        {schedule.fluidType && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {FLUID_TYPE_LABELS[schedule.fluidType] || schedule.fluidType}
                          </span>
                        )}
                        {!schedule.isActive && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">Inactief</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>🔄 {RECURRENCE_LABELS[schedule.recurrenceType] || schedule.recurrenceType}
                          {schedule.daysOfWeek && ` (${JSON.parse(schedule.daysOfWeek).length} dagen)`}
                        </p>
                        <p>📅 Van {new Date(schedule.startDate).toLocaleDateString("nl-NL")} {schedule.endDate && `tot ${new Date(schedule.endDate).toLocaleDateString("nl-NL")}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditScheduleDialog(schedule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteSchedule(schedule.id)}>
                        <Trash2 className="h-4 w-4" />
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

// ============================================
// Daily Fluid Schedule Card (Caregiver view)
// ============================================
function DailyFluidScheduleCard({
  items,
  selectedDate,
  onRegister,
}: {
  items: DailyFluidScheduleItem[]
  selectedDate: string
  onRegister?: (item: DailyFluidScheduleItem, formData: { volume: number; fluidType: string; notes: string }) => Promise<void>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DailyFluidScheduleItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fluidForm, setFluidForm] = useState({ volume: 0, fluidType: "water", notes: "" })

  const summary = {
    total: items.length,
    done: items.filter(i => i.status === "done").length,
    pending: items.filter(i => i.status === "pending").length,
    totalExpected: items.reduce((sum, i) => sum + i.schedule.volume, 0),
    totalDone: items.filter(i => i.status === "done" && i.record).reduce((sum, i) => sum + (i.record?.volume || 0), 0),
  }

  function openDialog(item: DailyFluidScheduleItem) {
    setSelectedItem(item)
    setFluidForm({
      volume: item.schedule.volume,
      fluidType: item.schedule.fluidType || "water",
      notes: "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!onRegister || !selectedItem) return
    setIsSubmitting(true)
    try {
      await onRegister(selectedItem, fluidForm)
      setDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verwachte Vochtinname</CardTitle>
            <CardDescription>Schema voor {new Date(selectedDate).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-600 font-medium">{summary.totalDone} / {summary.totalExpected} ml</span>
            <span className="text-gray-400">|</span>
            <span className="text-amber-600 font-medium">{summary.pending} te doen</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.schedule.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                item.status === "done" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold">{item.time}</span>
                <span className="font-bold text-green-600">{item.schedule.volume} ml</span>
                {item.schedule.fluidType && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {FLUID_TYPE_LABELS[item.schedule.fluidType] || item.schedule.fluidType}
                  </span>
                )}
                {item.record && (
                  <span className="text-xs text-muted-foreground">
                    (werkelijk: {item.record.volume} ml)
                  </span>
                )}
              </div>
              {item.status === "pending" && onRegister ? (
                <Button
                  size="sm"
                  onClick={() => openDialog(item)}
                >
                  Registreer
                </Button>
              ) : (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {item.status === "done" ? "Geregistreerd" : "Te doen"}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      {/* Registration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vochtinname Registreren</DialogTitle>
            <DialogDescription>
              {selectedItem && `${FLUID_TYPE_LABELS[selectedItem.schedule.fluidType] || selectedItem.schedule.fluidType || "Vocht"} om ${selectedItem.time}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fluidVolume">Volume (ml)</Label>
              <Input
                id="fluidVolume"
                type="number"
                value={fluidForm.volume || ""}
                onChange={(e) => setFluidForm({ ...fluidForm, volume: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="fluidType">Type drank</Label>
              <Select value={fluidForm.fluidType} onValueChange={(value) => setFluidForm({ ...fluidForm, fluidType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FLUID_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fluidNotes">Notities (optioneel)</Label>
              <Textarea
                id="fluidNotes"
                value={fluidForm.notes}
                onChange={(e) => setFluidForm({ ...fluidForm, notes: e.target.value })}
                placeholder="Extra opmerkingen..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || fluidForm.volume <= 0}
            >
              {isSubmitting ? "Bezig..." : "Opslaan"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
