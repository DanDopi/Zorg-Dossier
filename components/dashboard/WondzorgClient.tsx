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
import { WoundCarePlansTab, WoundCareReportsTab } from "./WondzorgTabs"

interface WoundCarePlan {
  id: string
  dateOfOnset: string
  cause: string
  location: string
  woundType: string
  length?: number
  width?: number
  depth?: number
  woundEdges?: string
  woundBed?: string
  exudate?: string
  surroundingSkin?: string
  initialPhoto?: string
  photoDate?: string
  treatmentGoal: string
  products: string
  frequency: string
  cleaningMethod: string
  instructions?: string
  performedBy?: string
  evaluationSchedule?: string
  isActive: boolean
  startDate: string
  endDate?: string
  createdAt: string
  reports?: WoundCareReport[]
}

interface WoundCareReport {
  id: string
  reportDate: string
  reportTime: string
  cleaningPerformed: string
  productsUsed: string
  woundColor?: string
  woundOdor?: string
  exudateAmount?: string
  painLevel?: string
  sizeChange?: string
  edgeCondition?: string
  skinCondition?: string
  clientPain?: string
  clientComfort?: string
  clientAnxiety?: string
  complications?: string
  evaluation: string
  generalNotes?: string
  photo?: string
  photoDate?: string
  nextCareDate?: string
  caregiver: {
    name: string
  }
  woundCarePlan: {
    location: string
    woundType: string
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

interface WondzorgClientProps {
  user: User
}

export default function WondzorgClient({ user }: WondzorgClientProps) {
  const { selectedClient } = useClient()
  const [activeTab, setActiveTab] = useState<"plans" | "reports">("plans")
  const [isLoading, setIsLoading] = useState(true)

  // Wound care plans state
  const [woundCarePlans, setWoundCarePlans] = useState<WoundCarePlan[]>([])
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WoundCarePlan | null>(null)
  const [newPlan, setNewPlan] = useState({
    dateOfOnset: new Date().toISOString().split("T")[0],
    cause: "",
    location: "",
    woundType: "",
    length: "",
    width: "",
    depth: "",
    woundEdges: "",
    woundBed: "",
    exudate: "",
    surroundingSkin: "",
    treatmentGoal: "",
    products: "",
    frequency: "",
    cleaningMethod: "",
    instructions: "",
    performedBy: "",
    evaluationSchedule: "",
    initialPhoto: "",
  })

  // Wound care reports state
  const [woundCareReports, setWoundCareReports] = useState<WoundCareReport[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [newReport, setNewReport] = useState({
    woundCarePlanId: "",
    time: new Date().toTimeString().slice(0, 5),
    cleaningPerformed: "",
    productsUsed: "",
    woundColor: "",
    woundOdor: "",
    exudateAmount: "",
    painLevel: "",
    sizeChange: "",
    edgeCondition: "",
    skinCondition: "",
    clientPain: "",
    clientComfort: "",
    clientAnxiety: "",
    complications: "",
    evaluation: "",
    generalNotes: "",
    photo: "",
    nextCareDate: "",
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
  }, [targetClientId, activeTab, selectedDate, selectedPlanId])

  async function loadData() {
    setIsLoading(true)
    try {
      if (activeTab === "plans") {
        await fetchWoundCarePlans()
      } else if (activeTab === "reports") {
        await fetchWoundCareReports()
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchWoundCarePlans() {
    try {
      const response = await fetch(`/api/wondzorg/plans?clientId=${targetClientId}&includeInactive=false`)
      if (response.ok) {
        const data = await response.json()
        setWoundCarePlans(data || [])
        // Set first plan as selected if none selected
        if (data && data.length > 0 && !selectedPlanId) {
          setSelectedPlanId(data[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching wound care plans:", error)
    }
  }

  async function fetchWoundCareReports() {
    try {
      const params = new URLSearchParams()
      params.set("clientId", targetClientId!)
      if (selectedPlanId) {
        params.set("woundCarePlanId", selectedPlanId)
      }
      params.set("startDate", selectedDate)
      params.set("endDate", selectedDate)

      console.log("Fetching wound care reports with params:", params.toString())
      const response = await fetch(`/api/wondzorg/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        console.log("Fetched wound care reports:", data)
        setWoundCareReports(data || [])
      } else {
        console.error("Failed to fetch wound care reports:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching wound care reports:", error)
    }
  }

  async function handleAddPlan() {
    if (!targetClientId) return

    try {
      const response = await fetch("/api/wondzorg/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          ...newPlan,
        }),
      })

      if (response.ok) {
        await fetchWoundCarePlans()
        setIsPlanDialogOpen(false)
        resetPlanForm()
      } else {
        const data = await response.json()
        alert(data.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      console.error("Error adding wound care plan:", error)
      alert("Er is een fout opgetreden bij het toevoegen van het wondzorgplan")
    }
  }

  async function handleUpdatePlan() {
    if (!editingPlan || !targetClientId) return

    try {
      const response = await fetch("/api/wondzorg/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPlan.id,
          ...newPlan,
        }),
      })

      if (response.ok) {
        await fetchWoundCarePlans()
        setIsPlanDialogOpen(false)
        setEditingPlan(null)
        resetPlanForm()
      } else {
        const data = await response.json()
        alert(data.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      console.error("Error updating wound care plan:", error)
      alert("Er is een fout opgetreden bij het bijwerken van het wondzorgplan")
    }
  }

  async function handleClosePlan(planId: string) {
    if (!confirm("Weet u zeker dat u dit wondzorgplan wilt afsluiten?")) return

    try {
      const response = await fetch(`/api/wondzorg/plans?id=${planId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchWoundCarePlans()
      }
    } catch (error) {
      console.error("Error closing wound care plan:", error)
    }
  }

  async function handleAddReport() {
    if (!targetClientId || !newReport.woundCarePlanId) {
      console.error("Missing required data:", { targetClientId, woundCarePlanId: newReport.woundCarePlanId })
      return
    }

    try {
      const [year, month, day] = selectedDate.split("-").map(Number)
      const [hours, minutes] = newReport.time.split(":").map(Number)

      const reportDate = new Date(year, month - 1, day)
      const reportTime = new Date(year, month - 1, day, hours, minutes)

      const reportData = {
        woundCarePlanId: newReport.woundCarePlanId,
        clientId: targetClientId,
        reportDate: reportDate.toISOString(),
        reportTime: reportTime.toISOString(),
        cleaningPerformed: newReport.cleaningPerformed,
        productsUsed: newReport.productsUsed,
        woundColor: newReport.woundColor || null,
        woundOdor: newReport.woundOdor || null,
        exudateAmount: newReport.exudateAmount || null,
        painLevel: newReport.painLevel || null,
        sizeChange: newReport.sizeChange || null,
        edgeCondition: newReport.edgeCondition || null,
        skinCondition: newReport.skinCondition || null,
        clientPain: newReport.clientPain || null,
        clientComfort: newReport.clientComfort || null,
        clientAnxiety: newReport.clientAnxiety || null,
        complications: newReport.complications || null,
        evaluation: newReport.evaluation,
        generalNotes: newReport.generalNotes || null,
        nextCareDate: newReport.nextCareDate || null,
      }

      console.log("Submitting wound care report:", reportData)

      const response = await fetch("/api/wondzorg/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      })

      if (response.ok) {
        const createdReport = await response.json()
        console.log("Report created successfully:", createdReport)
        await fetchWoundCareReports()
        setIsReportDialogOpen(false)
        resetReportForm()
      } else {
        const data = await response.json()
        console.error("Failed to create report:", data)
        alert(data.error || "Er is een fout opgetreden")
      }
    } catch (error) {
      console.error("Error adding wound care report:", error)
      alert("Er is een fout opgetreden bij het toevoegen van de wondrapportage")
    }
  }

  function resetPlanForm() {
    setNewPlan({
      dateOfOnset: new Date().toISOString().split("T")[0],
      cause: "",
      location: "",
      woundType: "",
      length: "",
      width: "",
      depth: "",
      woundEdges: "",
      woundBed: "",
      exudate: "",
      surroundingSkin: "",
      treatmentGoal: "",
      products: "",
      frequency: "",
      cleaningMethod: "",
      instructions: "",
      performedBy: "",
      evaluationSchedule: "",
      initialPhoto: "",
    })
  }

  function resetReportForm() {
    setNewReport({
      woundCarePlanId: selectedPlanId || "",
      time: new Date().toTimeString().slice(0, 5),
      cleaningPerformed: "",
      productsUsed: "",
      woundColor: "",
      woundOdor: "",
      exudateAmount: "",
      painLevel: "",
      sizeChange: "",
      edgeCondition: "",
      skinCondition: "",
      clientPain: "",
      clientComfort: "",
      clientAnxiety: "",
      complications: "",
      evaluation: "",
      generalNotes: "",
      photo: "",
      nextCareDate: "",
    })
  }

  // Update newReport.woundCarePlanId when selectedPlanId changes
  useEffect(() => {
    if (selectedPlanId && newReport.woundCarePlanId !== selectedPlanId) {
      setNewReport(prev => ({
        ...prev,
        woundCarePlanId: selectedPlanId
      }))
    }
  }, [selectedPlanId])

  function openEditPlanDialog(plan: WoundCarePlan) {
    setEditingPlan(plan)
    setNewPlan({
      dateOfOnset: plan.dateOfOnset ? new Date(plan.dateOfOnset).toISOString().split("T")[0] : "",
      cause: plan.cause || "",
      location: plan.location || "",
      woundType: plan.woundType || "",
      length: plan.length?.toString() || "",
      width: plan.width?.toString() || "",
      depth: plan.depth?.toString() || "",
      woundEdges: plan.woundEdges || "",
      woundBed: plan.woundBed || "",
      exudate: plan.exudate || "",
      surroundingSkin: plan.surroundingSkin || "",
      treatmentGoal: plan.treatmentGoal || "",
      products: plan.products || "",
      frequency: plan.frequency || "",
      cleaningMethod: plan.cleaningMethod || "",
      instructions: plan.instructions || "",
      performedBy: plan.performedBy || "",
      evaluationSchedule: plan.evaluationSchedule || "",
      initialPhoto: plan.initialPhoto || "",
    })
    setIsPlanDialogOpen(true)
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
              Selecteer een cliënt via de dropdown bovenaan om wondzorg te beheren
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
            <h1 className="text-3xl font-bold text-gray-900">Wondzorgplan</h1>
            <p className="text-muted-foreground mt-1">
              {isClient
                ? "Beheer wondzorgplannen en bekijk rapportages"
                : "Bekijk wondzorgplannen en registreer dagelijkse rapportages"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "plans" ? "default" : "outline"}
            onClick={() => setActiveTab("plans")}
          >
            Wondzorgplannen
          </Button>
          <Button
            variant={activeTab === "reports" ? "default" : "outline"}
            onClick={() => setActiveTab("reports")}
          >
            Dagelijkse Rapportages
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Laden...</div>
        ) : activeTab === "plans" ? (
          <WoundCarePlansTab
            plans={woundCarePlans}
            isPlanDialogOpen={isPlanDialogOpen}
            setIsPlanDialogOpen={setIsPlanDialogOpen}
            editingPlan={editingPlan}
            setEditingPlan={setEditingPlan}
            newPlan={newPlan}
            setNewPlan={setNewPlan}
            handleAddPlan={handleAddPlan}
            handleUpdatePlan={handleUpdatePlan}
            handleClosePlan={handleClosePlan}
            openEditPlanDialog={openEditPlanDialog}
            isClient={isClient}
            isCaregiver={isCaregiver}
          />
        ) : (
          <>
            {/* Plan Selector for Reports */}
            {woundCarePlans.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="planSelect" className="whitespace-nowrap">Selecteer wondplan:</Label>
                    <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecteer een wondplan" />
                      </SelectTrigger>
                      <SelectContent>
                        {woundCarePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.location} - {plan.woundType} (vanaf {new Date(plan.startDate).toLocaleDateString('nl-NL')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Date Selector */}
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

            <WoundCareReportsTab
              reports={woundCareReports}
              woundCarePlans={woundCarePlans}
              selectedPlanId={selectedPlanId}
              isReportDialogOpen={isReportDialogOpen}
              setIsReportDialogOpen={setIsReportDialogOpen}
              newReport={newReport}
              setNewReport={setNewReport}
              handleAddReport={handleAddReport}
              selectedDate={selectedDate}
              isCaregiver={isCaregiver}
            />
          </>
        )}
      </div>
    </div>
  )
}
