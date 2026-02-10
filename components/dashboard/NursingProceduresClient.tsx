"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClient } from "@/lib/ClientContext"
import {
  ClipboardCheck,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  User,
} from "lucide-react"

interface Caregiver {
  id: string
  name: string
  color?: string | null
}

interface ProcedureLog {
  id: string
  performedAt: string
  notes?: string | null
  caregiver: {
    id: string
    name: string
  }
}

interface Procedure {
  id: string
  name: string
  description?: string | null
  frequencyDays: number
  nextDueDate: string
  isActive: boolean
  assignedCaregiver?: Caregiver | null
  logs: ProcedureLog[]
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
    clientRelationships?: {
      clientId: string
      status: string
    }[]
  } | null
}

interface NursingProceduresClientProps {
  user: User
}

const FREQUENCY_PRESETS = [
  { label: "Elke week", days: 7 },
  { label: "Elke 2 weken", days: 14 },
  { label: "Elke maand", days: 30 },
  { label: "Elke 3 maanden", days: 90 },
  { label: "Elke 6 maanden", days: 180 },
  { label: "Elk jaar", days: 365 },
]

const PROCEDURE_SUGGESTIONS = [
  "Canule Wissel",
  "Katheter Wissel",
  "Peg Sonde Wissel",
]

function formatDateDutch(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusInfo(daysUntil: number): { label: string; color: string; bgColor: string; icon: typeof AlertTriangle } {
  if (daysUntil < 0) {
    return { label: "Achterstallig", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: AlertTriangle }
  }
  if (daysUntil <= 7) {
    return { label: "Binnenkort", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: Clock }
  }
  return { label: "Op schema", color: "text-green-700", bgColor: "bg-green-50 border-green-200", icon: CheckCircle2 }
}

function getFrequencyLabel(days: number): string {
  const preset = FREQUENCY_PRESETS.find((p) => p.days === days)
  if (preset) return preset.label
  if (days % 365 === 0) return `Elke ${days / 365} jaar`
  if (days % 30 === 0) return `Elke ${days / 30} maanden`
  if (days % 7 === 0) return `Elke ${days / 7} weken`
  return `Elke ${days} dagen`
}

export default function NursingProceduresClient({ user }: NursingProceduresClientProps) {
  const { selectedClient } = useClient()
  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<ProcedureLog[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // Create/Edit dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formFrequencyDays, setFormFrequencyDays] = useState("")
  const [formCustomDays, setFormCustomDays] = useState("")
  const [formNextDueDate, setFormNextDueDate] = useState("")
  const [formCaregiverId, setFormCaregiverId] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Perform dialog
  const [performProcedure, setPerformProcedure] = useState<Procedure | null>(null)
  const [performDate, setPerformDate] = useState("")
  const [performNotes, setPerformNotes] = useState("")
  const [isPerforming, setIsPerforming] = useState(false)

  useEffect(() => {
    fetchProcedures()
    if (isClient) {
      fetchCaregivers()
    }
  }, [selectedClient?.id])

  async function fetchProcedures() {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (!isClient && selectedClient) {
        params.set("clientId", selectedClient.id)
      }
      const response = await fetch(`/api/nursing-procedures?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProcedures(data)
      }
    } catch (error) {
      console.error("Failed to fetch procedures:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchCaregivers() {
    try {
      const response = await fetch("/api/caregivers")
      if (response.ok) {
        const data = await response.json()
        setCaregivers(data)
      }
    } catch (error) {
      console.error("Failed to fetch caregivers:", error)
    }
  }

  async function fetchHistory(procedureId: string) {
    if (expandedHistory === procedureId) {
      setExpandedHistory(null)
      return
    }
    try {
      setIsHistoryLoading(true)
      setExpandedHistory(procedureId)
      const response = await fetch(`/api/nursing-procedures/history?procedureId=${procedureId}`)
      if (response.ok) {
        const data = await response.json()
        setHistoryLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch history:", error)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingProcedure(null)
    setFormName("")
    setFormDescription("")
    setFormFrequencyDays("")
    setFormCustomDays("")
    setFormNextDueDate("")
    setFormCaregiverId("")
    setIsCreateOpen(true)
  }

  function openEditDialog(procedure: Procedure) {
    setEditingProcedure(procedure)
    setFormName(procedure.name)
    setFormDescription(procedure.description || "")
    const preset = FREQUENCY_PRESETS.find((p) => p.days === procedure.frequencyDays)
    if (preset) {
      setFormFrequencyDays(String(preset.days))
      setFormCustomDays("")
    } else {
      setFormFrequencyDays("custom")
      setFormCustomDays(String(procedure.frequencyDays))
    }
    const dueDate = new Date(procedure.nextDueDate)
    setFormNextDueDate(
      `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`
    )
    setFormCaregiverId(procedure.assignedCaregiver?.id || "")
    setIsCreateOpen(true)
  }

  async function handleSaveProcedure() {
    const frequencyDays = formFrequencyDays === "custom" ? parseInt(formCustomDays) : parseInt(formFrequencyDays)
    if (!formName || !frequencyDays || !formNextDueDate) return

    try {
      setIsSaving(true)
      const body = {
        ...(editingProcedure && { id: editingProcedure.id }),
        name: formName,
        description: formDescription || null,
        frequencyDays,
        nextDueDate: formNextDueDate,
        assignedCaregiverId: formCaregiverId && formCaregiverId !== "none" ? formCaregiverId : null,
      }

      const response = await fetch("/api/nursing-procedures", {
        method: editingProcedure ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setIsCreateOpen(false)
        fetchProcedures()
      }
    } catch (error) {
      console.error("Failed to save procedure:", error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteProcedure(id: string) {
    if (!confirm("Weet u zeker dat u deze handeling wilt verwijderen?")) return
    try {
      const response = await fetch(`/api/nursing-procedures?id=${id}`, { method: "DELETE" })
      if (response.ok) {
        fetchProcedures()
      }
    } catch (error) {
      console.error("Failed to delete procedure:", error)
    }
  }

  function openPerformDialog(procedure: Procedure) {
    setPerformProcedure(procedure)
    const today = new Date()
    setPerformDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    )
    setPerformNotes("")
  }

  async function handlePerform() {
    if (!performProcedure || !performDate) return

    try {
      setIsPerforming(true)
      const response = await fetch("/api/nursing-procedures/perform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedureId: performProcedure.id,
          performedAt: performDate,
          notes: performNotes || null,
        }),
      })

      if (response.ok) {
        setPerformProcedure(null)
        fetchProcedures()
      }
    } catch (error) {
      console.error("Failed to perform procedure:", error)
    } finally {
      setIsPerforming(false)
    }
  }

  // Stats
  const overdue = procedures.filter((p) => getDaysUntil(p.nextDueDate) < 0).length
  const dueSoon = procedures.filter((p) => {
    const d = getDaysUntil(p.nextDueDate)
    return d >= 0 && d <= 7
  }).length

  if (!isClient && !selectedClient) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Verpleegtechnische Handelingen</h1>
          <p className="text-muted-foreground mt-2">
            Selecteer een cliënt om de verpleegtechnische handelingen te bekijken
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-muted-foreground">
              Selecteer een cliënt in het menu om te beginnen
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
          <h1 className="text-3xl font-bold">Verpleegtechnische Handelingen</h1>
          <p className="text-muted-foreground mt-2">
            Beheer en volg verpleegtechnische handelingen
            {!isClient && selectedClient && ` voor ${selectedClient.name}`}
          </p>
        </div>
        {isClient && (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe Handeling
          </Button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actieve Handelingen</CardDescription>
            <CardTitle className="text-3xl">{procedures.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Achterstallig</CardDescription>
            <CardTitle className={`text-3xl ${overdue > 0 ? "text-red-600" : "text-green-600"}`}>
              {overdue}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Binnenkort Gepland</CardDescription>
            <CardTitle className={`text-3xl ${dueSoon > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {dueSoon}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Loading */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Laden...</p>
          </CardContent>
        </Card>
      ) : procedures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-muted-foreground">
              Geen verpleegtechnische handelingen
            </p>
            {isClient && (
              <p className="text-sm text-muted-foreground mt-1">
                Klik op &quot;Nieuwe Handeling&quot; om een handeling toe te voegen.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Procedure List */
        <div className="space-y-4">
          {procedures.map((procedure) => {
            const daysUntil = getDaysUntil(procedure.nextDueDate)
            const status = getStatusInfo(daysUntil)
            const StatusIcon = status.icon
            const lastLog = procedure.logs[0]

            return (
              <Card key={procedure.id} className={`border ${status.bgColor}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${status.color}`} />
                        <h3 className="text-lg font-semibold">{procedure.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color} ${
                          daysUntil < 0
                            ? "bg-red-100"
                            : daysUntil <= 7
                            ? "bg-amber-100"
                            : "bg-green-100"
                        }`}>
                          {status.label}
                        </span>
                      </div>

                      {procedure.description && (
                        <p className="text-sm text-muted-foreground mb-2 ml-8">
                          {procedure.description}
                        </p>
                      )}

                      <div className="ml-8 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            Volgende: <strong>{formatDateDutch(procedure.nextDueDate)}</strong>
                            {daysUntil < 0 && (
                              <span className="text-red-600 ml-1">
                                ({Math.abs(daysUntil)} {Math.abs(daysUntil) === 1 ? "dag" : "dagen"} te laat)
                              </span>
                            )}
                            {daysUntil >= 0 && daysUntil <= 7 && (
                              <span className="text-amber-600 ml-1">
                                (over {daysUntil} {daysUntil === 1 ? "dag" : "dagen"})
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Frequentie: {getFrequencyLabel(procedure.frequencyDays)}</span>
                        </div>

                        {procedure.assignedCaregiver && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span>Toegewezen aan: {procedure.assignedCaregiver.name}</span>
                          </div>
                        )}

                        {lastLog && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              Laatst uitgevoerd: {formatDateDutch(lastLog.performedAt)} door {lastLog.caregiver.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {(isCaregiver || isClient) && (
                        <Button
                          size="sm"
                          onClick={() => openPerformDialog(procedure)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Uitvoeren
                        </Button>
                      )}
                      {isClient && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(procedure)}
                          >
                            <Edit2 className="mr-1 h-3.5 w-3.5" />
                            Bewerken
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteProcedure(procedure.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Verwijderen
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* History toggle */}
                  <div className="mt-3 ml-8">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => fetchHistory(procedure.id)}
                    >
                      {expandedHistory === procedure.id ? (
                        <ChevronUp className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="mr-1 h-3.5 w-3.5" />
                      )}
                      Geschiedenis
                    </Button>

                    {expandedHistory === procedure.id && (
                      <div className="mt-2 space-y-2">
                        {isHistoryLoading ? (
                          <p className="text-sm text-muted-foreground">Laden...</p>
                        ) : historyLogs.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nog geen uitvoeringen geregistreerd
                          </p>
                        ) : (
                          historyLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-3 rounded-lg bg-white border border-gray-200 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {formatDateDutch(log.performedAt)}
                                </span>
                                <span className="text-muted-foreground">
                                  door {log.caregiver.name}
                                </span>
                              </div>
                              {log.notes && (
                                <p className="text-muted-foreground mt-1 italic">
                                  {log.notes}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProcedure ? "Handeling Bewerken" : "Nieuwe Handeling"}
            </DialogTitle>
            <DialogDescription>
              {editingProcedure
                ? "Pas de instellingen van deze handeling aan"
                : "Voeg een nieuwe verpleegtechnische handeling toe"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name with suggestions */}
            <div className="space-y-2">
              <Label>Naam *</Label>
              {!editingProcedure && !formName && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {PROCEDURE_SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setFormName(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Naam van de handeling"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Beschrijving / Instructies</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optionele instructies of beschrijving..."
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frequentie *</Label>
              <Select
                value={formFrequencyDays}
                onValueChange={(value) => {
                  setFormFrequencyDays(value)
                  if (value !== "custom") setFormCustomDays("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer frequentie" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_PRESETS.map((preset) => (
                    <SelectItem key={preset.days} value={String(preset.days)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Aangepast...</SelectItem>
                </SelectContent>
              </Select>
              {formFrequencyDays === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={formCustomDays}
                    onChange={(e) => setFormCustomDays(e.target.value)}
                    placeholder="Aantal"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">dagen</span>
                </div>
              )}
            </div>

            {/* Next due date */}
            <div className="space-y-2">
              <Label>{editingProcedure ? "Volgende Datum" : "Eerste Datum"} *</Label>
              <Input
                type="date"
                value={formNextDueDate}
                onChange={(e) => setFormNextDueDate(e.target.value)}
              />
            </div>

            {/* Assign caregiver (client only) */}
            {isClient && caregivers.length > 0 && (
              <div className="space-y-2">
                <Label>Toewijzen aan Zorgverlener</Label>
                <Select
                  value={formCaregiverId}
                  onValueChange={setFormCaregiverId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Geen voorkeur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen voorkeur</SelectItem>
                    {caregivers.map((cg) => (
                      <SelectItem key={cg.id} value={cg.id}>
                        {cg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Annuleren
              </Button>
              <Button
                onClick={handleSaveProcedure}
                disabled={
                  isSaving ||
                  !formName ||
                  !formFrequencyDays ||
                  !formNextDueDate ||
                  (formFrequencyDays === "custom" && !formCustomDays)
                }
              >
                {isSaving ? "Opslaan..." : editingProcedure ? "Opslaan" : "Aanmaken"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Perform Dialog */}
      <Dialog open={!!performProcedure} onOpenChange={(open) => !open && setPerformProcedure(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Handeling Uitvoeren</DialogTitle>
            <DialogDescription>
              {performProcedure?.name} - Registreer de uitvoering
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Datum Uitgevoerd *</Label>
              <Input
                type="date"
                value={performDate}
                onChange={(e) => setPerformDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Bijzonderheden</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={performNotes}
                onChange={(e) => setPerformNotes(e.target.value)}
                placeholder="Notities, bijzonderheden, complicaties..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPerformProcedure(null)}>
                Annuleren
              </Button>
              <Button
                onClick={handlePerform}
                disabled={isPerforming || !performDate}
              >
                {isPerforming ? "Opslaan..." : "Bevestigen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
