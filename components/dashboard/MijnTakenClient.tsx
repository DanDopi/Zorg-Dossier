"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useClient } from "@/lib/ClientContext"
import Link from "next/link"
import {
  ClipboardCheck,
  Pill,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Heart,
  FileText,
  UtensilsCrossed,
  ChevronRight,
  CalendarOff,
} from "lucide-react"

interface MedicatieItem {
  medicationId: string
  medicationName: string
  dosage: string
  unit: string
  instructions: string | null
  time: string
  status: "pending" | "given" | "skipped"
  administration: { caregiverName: string } | null
}

interface SondevoedingItem {
  scheduleId: string
  time: string
  volume: number
  feedSpeed: number
  feedType: string | null
  status: "pending" | "given" | "skipped"
  administration: { caregiverName: string } | null
}

interface VerpleegtechnischItem {
  id: string
  name: string
  description: string | null
  nextDueDate: string
  isOverdue: boolean
  lastPerformed: { date: string; caregiverName: string } | null
}

interface WondzorgItem {
  planId: string
  location: string
  woundType: string
  frequency: string
  isDueToday: boolean
  isOverdue: boolean
  nextCareDate: string | null
}

interface ClientTasks {
  client: { id: string; name: string }
  shift: {
    id: string
    startTime: string
    endTime: string
    shiftTypeName: string
    shiftTypeColor: string
  }
  medicatie: {
    items: MedicatieItem[]
    summary: { total: number; given: number; skipped: number; pending: number }
  }
  sondevoeding: {
    items: SondevoedingItem[]
    summary: { total: number; given: number; skipped: number; pending: number }
  }
  verpleegtechnisch: { items: VerpleegtechnischItem[] }
  wondzorg: { items: WondzorgItem[] }
  io: {
    defecation: number
    urine: { count: number; volume: number }
    fluid: { count: number; volume: number }
  }
  voeding: { breakfast: boolean; lunch: boolean; dinner: boolean; snack: boolean }
  rapportage: { count: number }
  summary: {
    totalTasks: number
    completed: number
    pending: number
    overdue: number
    status: "all_done" | "pending" | "overdue"
  }
}

interface DailyTasksResponse {
  date: string
  clients: ClientTasks[]
  globalSummary: {
    totalTasks: number
    completed: number
    pending: number
    overdue: number
  }
}

interface MijnTakenClientProps {
  caregiverId: string
}

function StatusBadge({ status }: { status: "pending" | "given" | "skipped" }) {
  if (status === "given") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Gegeven
      </span>
    )
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
        Overgeslagen
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Clock className="h-3 w-3" /> Wachtend
    </span>
  )
}

function formatDateDutch(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function MijnTakenClient({ caregiverId }: MijnTakenClientProps) {
  const [data, setData] = useState<DailyTasksResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const { setSelectedClient } = useClient()
  const router = useRouter()

  useEffect(() => {
    fetchDailyTasks()
  }, [])

  async function fetchDailyTasks() {
    try {
      setIsLoading(true)
      setError(false)
      const response = await fetch("/api/caregiver/daily-tasks")
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  function navigateToPage(clientId: string, clientName: string, path: string) {
    setSelectedClient({ id: clientId, name: clientName, email: "" })
    router.push(path)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mijn Taken</h1>
          <p className="text-muted-foreground mt-2">Uw taken voor vandaag</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">Taken laden...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mijn Taken</h1>
          <p className="text-muted-foreground mt-2">Uw taken voor vandaag</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Er is een fout opgetreden bij het laden van uw taken</p>
            <Button className="mt-4" onClick={fetchDailyTasks}>Opnieuw proberen</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || data.clients.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mijn Taken</h1>
          <p className="text-muted-foreground mt-2">Uw taken voor vandaag</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarOff className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-muted-foreground">Geen diensten vandaag</p>
            <p className="text-sm text-muted-foreground mt-1">
              U heeft vandaag geen diensten ingepland.
            </p>
            <Link href="/dashboard/mijn-rooster">
              <Button variant="outline" className="mt-4">Bekijk Mijn Rooster</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const gs = data.globalSummary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mijn Taken</h1>
        <p className="text-muted-foreground mt-2">
          Uw taken voor vandaag &mdash; {formatDateDutch(data.date)}
        </p>
      </div>

      {/* Global Summary Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <span className="font-medium">{gs.totalTasks} taken totaal</span>
            <span className="text-green-600">{gs.completed} afgerond</span>
            <span className="text-amber-600">{gs.pending} open</span>
            {gs.overdue > 0 && (
              <span className="text-red-600 font-semibold">{gs.overdue} achterstallig</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-client sections */}
      {data.clients.map((ct) => {
        const borderColor =
          ct.summary.status === "overdue"
            ? "border-l-red-500"
            : ct.summary.status === "pending"
            ? "border-l-amber-500"
            : "border-l-green-500"

        return (
          <Card key={ct.client.id} className={`border-l-4 ${borderColor}`}>
            {/* Client Header */}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-8 rounded-full"
                    style={{ backgroundColor: ct.shift.shiftTypeColor }}
                  />
                  <div>
                    <CardTitle className="text-xl">{ct.client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {ct.shift.shiftTypeName} {ct.shift.startTime} - {ct.shift.endTime}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {ct.summary.status === "all_done" && (
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">
                      Alles afgerond
                    </span>
                  )}
                  {ct.summary.status === "pending" && (
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                      {ct.summary.pending} open
                    </span>
                  )}
                  {ct.summary.status === "overdue" && (
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-red-100 text-red-700">
                      {ct.summary.overdue} achterstallig
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Medicatie */}
              {ct.medicatie.items.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                      <Pill className="h-4 w-4" />
                      Medicatie ({ct.medicatie.summary.given + ct.medicatie.summary.skipped}/{ct.medicatie.summary.total})
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {ct.medicatie.items.map((item, i) => (
                      <div
                        key={`${item.medicationId}-${item.time}-${i}`}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground w-12">{item.time}</span>
                          <span className="text-sm font-medium">{item.medicationName}</span>
                          <span className="text-xs text-muted-foreground">{item.dosage} {item.unit}</span>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-muted-foreground"
                    onClick={() => navigateToPage(ct.client.id, ct.client.name, "/dashboard/medicatie")}
                  >
                    Ga naar Medicatie <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </section>
              )}

              {/* Sondevoeding */}
              {ct.sondevoeding.items.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                      <Droplets className="h-4 w-4" />
                      Sondevoeding ({ct.sondevoeding.summary.given + ct.sondevoeding.summary.skipped}/{ct.sondevoeding.summary.total})
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {ct.sondevoeding.items.map((item, i) => (
                      <div
                        key={`${item.scheduleId}-${item.time}-${i}`}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground w-12">{item.time}</span>
                          <span className="text-sm">{item.volume}ml @ {item.feedSpeed}ml/u</span>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-muted-foreground"
                    onClick={() => navigateToPage(ct.client.id, ct.client.name, "/dashboard/voeding")}
                  >
                    Ga naar Voeding <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </section>
              )}

              {/* Verpleegtechnisch */}
              {ct.verpleegtechnisch.items.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                      <ClipboardCheck className="h-4 w-4" />
                      Verpleegtechnisch ({ct.verpleegtechnisch.items.length})
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {ct.verpleegtechnisch.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${
                          item.isOverdue ? "bg-red-50" : "bg-amber-50"
                        }`}
                      >
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Vervaldatum: {formatDateDutch(item.nextDueDate)}
                          </span>
                        </div>
                        {item.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Achterstallig
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            <Clock className="h-3 w-3" /> Vandaag
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-muted-foreground"
                    onClick={() => navigateToPage(ct.client.id, ct.client.name, "/dashboard/verpleegtechnisch")}
                  >
                    Ga naar Verpleegtechnisch <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </section>
              )}

              {/* Wondzorg */}
              {ct.wondzorg.items.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                      <Heart className="h-4 w-4" />
                      Wondzorg ({ct.wondzorg.items.length})
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {ct.wondzorg.items.map((item) => (
                      <div
                        key={item.planId}
                        className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${
                          item.isOverdue ? "bg-red-50" : "bg-amber-50"
                        }`}
                      >
                        <div>
                          <span className="text-sm font-medium">{item.location}</span>
                          <span className="text-xs text-muted-foreground ml-2">{item.woundType}</span>
                          <span className="text-xs text-muted-foreground ml-2">({item.frequency})</span>
                        </div>
                        {item.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Achterstallig
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Vandaag
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-muted-foreground"
                    onClick={() => navigateToPage(ct.client.id, ct.client.name, "/dashboard/wondzorg")}
                  >
                    Ga naar Wondzorg <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </section>
              )}

              {/* I&O Registratie */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    I&O Registratie
                  </h3>
                </div>
                <div className="py-1.5 px-3 rounded-lg bg-gray-50 text-sm flex items-center gap-4">
                  <span>Defecatie: <strong>{ct.io.defecation}</strong></span>
                  <span>Urine: <strong>{ct.io.urine.count}</strong> ({ct.io.urine.volume}ml)</span>
                  <span>Vochtinname: <strong>{ct.io.fluid.count}</strong> ({ct.io.fluid.volume}ml)</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-muted-foreground"
                  onClick={() => navigateToPage(ct.client.id, ct.client.name, "/dashboard/io-registratie")}
                >
                  Ga naar I&O Registratie <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </section>

              {/* Voeding */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                    <UtensilsCrossed className="h-4 w-4" />
                    Voeding
                  </h3>
                </div>
                <div className="py-1.5 px-3 rounded-lg bg-gray-50 text-sm flex items-center gap-4">
                  {[
                    { key: "breakfast", label: "Ontbijt", done: ct.voeding.breakfast },
                    { key: "lunch", label: "Lunch", done: ct.voeding.lunch },
                    { key: "dinner", label: "Avondeten", done: ct.voeding.dinner },
                    { key: "snack", label: "Snack", done: ct.voeding.snack },
                  ].map((meal) => (
                    <span key={meal.key} className={`flex items-center gap-1 ${meal.done ? "text-green-600" : "text-muted-foreground"}`}>
                      {meal.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded border border-gray-300 inline-block" />
                      )}
                      {meal.label}
                    </span>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-muted-foreground"
                  onClick={() => navigateToPage(ct.client.id, ct.client.name, "/dashboard/voeding")}
                >
                  Ga naar Voeding <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </section>

              {/* Rapportage */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                    <FileText className="h-4 w-4" />
                    Rapportage
                  </h3>
                </div>
                <div className={`py-1.5 px-3 rounded-lg text-sm ${ct.rapportage.count > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  {ct.rapportage.count > 0
                    ? `${ct.rapportage.count} rapport${ct.rapportage.count !== 1 ? "en" : ""} geschreven vandaag`
                    : "Geen rapport geschreven vandaag"
                  }
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-muted-foreground"
                  onClick={() => navigateToPage(ct.client.id, ct.client.name, "/dashboard/reports/new")}
                >
                  Nieuw Rapport <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </section>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
