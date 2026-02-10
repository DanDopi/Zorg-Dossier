"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useClient } from "@/lib/ClientContext"

interface MissingAdministration {
  medicationId: string
  medicationName: string
  dosage: string
  unit: string
  scheduledDate: string
  scheduledTime: string
  type: "MISSING"
  daysOverdue: number
  frequency: string
  instructions?: string
  assignedCaregiverId?: string | null
  assignedCaregiverName?: string | null
}

interface SkippedAdministration {
  medicationId: string
  medicationName: string
  dosage: string
  unit: string
  scheduledDate: string
  scheduledTime: string
  type: "SKIPPED"
  skipReason: string
  daysOverdue: number
  caregiverId: string
  caregiverName: string
  administeredAt: string
}

type Administration = MissingAdministration | SkippedAdministration

interface Summary {
  totalMissing: number
  totalSkipped: number
  uniqueMedications: number
  uniqueDays: number
  oldestMissing: string | null
}

interface User {
  id: string
  email: string
  role: string
  clientProfile?: {
    id: string
  } | null
}

interface Props {
  user: User
}

export default function MissingMedicationAdministrationsClient({ user }: Props) {
  const { selectedClient } = useClient()
  const [missingAdministrations, setMissingAdministrations] = useState<MissingAdministration[]>([])
  const [skippedAdministrations, setSkippedAdministrations] = useState<SkippedAdministration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  // Filters
  const [filterMedication, setFilterMedication] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all") // "all" | "missing" | "skipped"
  const [filterCaregiver, setFilterCaregiver] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-asc")

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  useEffect(() => {
    // For clients, load immediately
    if (isClient) {
      fetchMissingAdministrations()
    }
    // For caregivers, only load if a client is selected
    else if (isCaregiver && selectedClient) {
      fetchMissingAdministrations()
    }
  }, [selectedClient])

  // Refresh data when page becomes visible again (user returns from medication page)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        // Re-fetch data when user returns to this page
        if (isClient || (isCaregiver && selectedClient)) {
          fetchMissingAdministrations()
        }
      }
    }

    function handleFocus() {
      // Re-fetch data when window regains focus
      if (isClient || (isCaregiver && selectedClient)) {
        fetchMissingAdministrations()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [isClient, isCaregiver, selectedClient])

  async function fetchMissingAdministrations() {
    try {
      const clientId = isClient ? undefined : selectedClient?.id
      const params = new URLSearchParams()
      params.set("details", "true")
      if (clientId) {
        params.set("clientId", clientId)
      }

      const response = await fetch(`/api/medications/missing?${params}`)
      if (!response.ok) {
        throw new Error("Kon gegevens niet laden")
      }

      const data = await response.json()
      setMissingAdministrations(data.missingAdministrations || [])
      setSkippedAdministrations(data.skippedAdministrations || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }

  function getFilteredAndSortedAdministrations(): Administration[] {
    // Combine based on type filter
    let combined: Administration[] = []
    if (filterType === "all" || filterType === "missing") {
      combined.push(...missingAdministrations)
    }
    if (filterType === "all" || filterType === "skipped") {
      combined.push(...skippedAdministrations)
    }

    // Filter by medication
    if (filterMedication !== "all") {
      combined = combined.filter(a => a.medicationId === filterMedication)
    }

    // Filter by caregiver (for clients only)
    if (isClient && filterCaregiver !== "all") {
      combined = combined.filter(a => {
        if (a.type === "MISSING") {
          return a.assignedCaregiverId === filterCaregiver
        } else {
          return a.caregiverId === filterCaregiver
        }
      })
    }

    // Sort
    combined.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
        case "date-asc":
          return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        case "medication":
          return a.medicationName.localeCompare(b.medicationName)
        case "overdue":
          return b.daysOverdue - a.daysOverdue
        case "caregiver":
          const aCaregiver = a.type === "MISSING" ? (a.assignedCaregiverName || "") : a.caregiverName
          const bCaregiver = b.type === "MISSING" ? (b.assignedCaregiverName || "") : b.caregiverName
          return aCaregiver.localeCompare(bCaregiver)
        default:
          return 0
      }
    })

    return combined
  }

  function groupAdministrationsByDate(administrations: Administration[]) {
    const grouped: { [key: string]: Administration[] } = {}

    administrations.forEach(administration => {
      const dateKey = new Date(administration.scheduledDate).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(administration)
    })

    return grouped
  }

  // Get unique medications for filter dropdown
  const allAdministrations = [...missingAdministrations, ...skippedAdministrations]
  const uniqueMedications = Array.from(
    new Map(
      allAdministrations.map(a => [a.medicationId, { id: a.medicationId, name: a.medicationName }])
    ).values()
  )

  // Get unique caregivers for filter dropdown (for clients only)
  const uniqueCaregivers = Array.from(
    new Map(
      allAdministrations
        .map(a => {
          if (a.type === "MISSING") {
            return a.assignedCaregiverId && a.assignedCaregiverName
              ? [a.assignedCaregiverId, a.assignedCaregiverName] as [string, string]
              : null
          } else {
            return a.caregiverId && a.caregiverName
              ? [a.caregiverId, a.caregiverName] as [string, string]
              : null
          }
        })
        .filter((item): item is [string, string] => item !== null)
        .map(([id, name]) => [id, { id, name }])
    ).values()
  )

  const filteredAdministrations = getFilteredAndSortedAdministrations()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ontbrekende Medicatie Toedieningen</h1>
            <p className="text-muted-foreground mt-1">
              Overzicht van gemiste en overgeslagen medicatie
            </p>
          </div>
          <Link href="/dashboard/medicatie">
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Terug naar Medicatiebeheer
            </Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Niet Geregistreerd</CardDescription>
                <CardTitle className="text-3xl text-orange-600">
                  {summary.totalMissing}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {summary.totalMissing === 1 ? 'Toediening' : 'Toedieningen'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Overgeslagen</CardDescription>
                <CardTitle className="text-3xl text-yellow-600">
                  {summary.totalSkipped}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {summary.totalSkipped === 1 ? 'Toediening' : 'Toedieningen'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unieke Medicaties</CardDescription>
                <CardTitle className="text-3xl">{summary.uniqueMedications}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {summary.uniqueMedications === 1 ? 'Medicatie' : 'Medicaties'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Oudste Datum</CardDescription>
                <CardTitle className="text-lg">
                  {summary.oldestMissing
                    ? new Date(summary.oldestMissing).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '-'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Oudste ontbrekende toediening
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {!isLoading && allAdministrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Filters & Sortering</CardTitle>
              <CardDescription>Filter en sorteer de ontbrekende toedieningen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${isClient ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                {/* Medication Filter */}
                <div>
                  <Label htmlFor="medication-filter">Medicatie</Label>
                  <Select value={filterMedication} onValueChange={setFilterMedication}>
                    <SelectTrigger id="medication-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle medicaties</SelectItem>
                      {uniqueMedications.map(med => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Caregiver Filter (only for clients) */}
                {isClient && (
                  <div>
                    <Label htmlFor="caregiver-filter">Zorgverlener</Label>
                    <Select value={filterCaregiver} onValueChange={setFilterCaregiver}>
                      <SelectTrigger id="caregiver-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle zorgverleners</SelectItem>
                        {uniqueCaregivers.map(cg => (
                          <SelectItem key={cg.id} value={cg.id}>
                            {cg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Type Filter */}
                <div>
                  <Label htmlFor="type-filter">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="type-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alles</SelectItem>
                      <SelectItem value="missing">Niet geregistreerd</SelectItem>
                      <SelectItem value="skipped">Overgeslagen/geweigerd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div>
                  <Label htmlFor="sort-by">Sorteren op</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sort-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Datum (nieuw naar oud)</SelectItem>
                      <SelectItem value="date-asc">Datum (oud naar nieuw)</SelectItem>
                      <SelectItem value="medication">Medicatie naam</SelectItem>
                      <SelectItem value="overdue">Meest achterstallig</SelectItem>
                      {isClient && <SelectItem value="caregiver">Zorgverlener naam</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Administrations List */}
        <Card>
          <CardHeader>
            <CardTitle>Ontbrekende Toedieningen ({filteredAdministrations.length})</CardTitle>
            <CardDescription>
              Overzicht van alle gemiste en overgeslagen medicatie toedieningen
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-scroll">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Ontbrekende toedieningen laden...</p>
              </div>
            ) : filteredAdministrations.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold text-green-600 mb-2">
                  {allAdministrations.length === 0
                    ? "Geen ontbrekende medicatie toedieningen gevonden!"
                    : "Geen resultaten met deze filters"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {allAdministrations.length === 0
                    ? "Alle medicaties zijn op tijd toegediend"
                    : "Probeer andere filters"}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupAdministrationsByDate(filteredAdministrations)).map(([dateKey, administrations]) => (
                  <div key={dateKey} className="space-y-3">
                    {/* Date Separator */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <h3 className="text-sm font-semibold text-gray-600 px-3 py-1 bg-gray-100 rounded-full">
                        {dateKey}
                      </h3>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    {/* Administration Cards */}
                    <div className="space-y-3">
                      {administrations.map((administration, index) => (
                        <Card
                          key={`${administration.medicationId}-${administration.scheduledDate}-${administration.scheduledTime}-${index}`}
                          className={`border-l-4 ${
                            administration.type === "MISSING"
                              ? "border-l-orange-500"
                              : "border-l-yellow-500"
                          }`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Medication Name & Dosage */}
                                <h4 className="font-semibold text-lg mb-2">
                                  {administration.medicationName} {administration.dosage} {administration.unit}
                                </h4>

                                {/* Time & Type Badge */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                                    🕐 {administration.scheduledTime}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      administration.type === "MISSING"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {administration.type === "MISSING" ? "Niet geregistreerd" : "Overgeslagen"}
                                  </span>
                                </div>

                                {/* Skip Reason (for skipped) */}
                                {administration.type === "SKIPPED" && (
                                  <div className="mb-3 text-sm">
                                    <p className="text-muted-foreground">
                                      <span className="font-medium">Reden:</span> {administration.skipReason}
                                    </p>
                                    <p className="text-muted-foreground">
                                      <span className="font-medium">Door:</span> {administration.caregiverName}
                                    </p>
                                  </div>
                                )}

                                {/* Instructions (for missing with instructions) */}
                                {administration.type === "MISSING" && administration.instructions && (
                                  <div className="mb-3 text-sm text-muted-foreground">
                                    <span className="font-medium">Instructies:</span> {administration.instructions}
                                  </div>
                                )}

                                {/* Assigned Caregiver (for missing items - shown to clients) */}
                                {isClient && administration.type === "MISSING" && administration.assignedCaregiverName && (
                                  <div className="mb-3 text-sm text-muted-foreground">
                                    <span className="font-medium">Verantwoordelijke:</span> {administration.assignedCaregiverName}
                                  </div>
                                )}

                                {/* Days Overdue & Date */}
                                <div className="flex items-center gap-3 text-sm flex-wrap">
                                  <span
                                    className={`px-2 py-1 rounded-full font-medium ${
                                      administration.daysOverdue > 30
                                        ? 'bg-red-100 text-red-700'
                                        : administration.daysOverdue > 7
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {administration.daysOverdue} {administration.daysOverdue === 1 ? 'dag' : 'dagen'} geleden
                                  </span>
                                  <span className="text-muted-foreground">
                                    📅 {new Date(administration.scheduledDate).toLocaleDateString('nl-NL', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Action: Button for caregivers with MISSING items, Warning icon otherwise */}
                              {isCaregiver && selectedClient && administration.type === "MISSING" ? (
                                <Link href={`/dashboard/medicatie?date=${administration.scheduledDate}`}>
                                  <Button className="bg-blue-600 hover:bg-orange-500 text-white ml-4">
                                    Registreer
                                  </Button>
                                </Link>
                              ) : (
                                <svg
                                  className={`w-6 h-6 ml-4 ${
                                    administration.type === "MISSING" ? "text-orange-500" : "text-yellow-500"
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
