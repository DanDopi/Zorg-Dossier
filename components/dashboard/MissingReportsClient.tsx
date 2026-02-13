"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useClient } from "@/lib/ClientContext"

interface User {
  id: string
  email: string
  role: string
  clientProfile?: { id: string } | null
  caregiverProfile?: { id: string } | null
}

interface Props {
  user: User
}

interface MissingReport {
  shiftId: string
  date: string
  caregiverId: string
  caregiverName: string
  shiftType: {
    id: string
    name: string
    startTime: string
    endTime: string
    color: string
  }
  status: string
  daysOverdue: number
}

interface Summary {
  totalMissing: number
  uniqueDays: number
  uniqueCaregivers: number
  oldestMissingDate: string | null
}

export default function MissingReportsClient({ user }: Props) {
  const { selectedClient } = useClient()
  const [missingReports, setMissingReports] = useState<MissingReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  // Filters
  const [filterCaregiver, setFilterCaregiver] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  useEffect(() => {
    // For clients, load immediately
    if (isClient) {
      fetchMissingReports()
    }
    // For caregivers, only load if a client is selected
    else if (isCaregiver && selectedClient) {
      fetchMissingReports()
    }
  }, [selectedClient])

  // Refresh data when page becomes visible again (user returns from new report page)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (isClient || (isCaregiver && selectedClient)) {
          fetchMissingReports()
        }
      }
    }

    function handleFocus() {
      if (isClient || (isCaregiver && selectedClient)) {
        fetchMissingReports()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [isClient, isCaregiver, selectedClient])

  async function fetchMissingReports() {
    try {
      // For caregivers, include clientId in the request
      const params = new URLSearchParams()
      params.set("details", "true")
      if (isCaregiver && selectedClient) {
        params.set("clientId", selectedClient.id)
      }

      const response = await fetch(`/api/reports/missing?${params}`)
      if (!response.ok) {
        throw new Error("Kon gegevens niet laden")
      }

      const data = await response.json()
      setMissingReports(data.missingReports || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }

  function getFilteredAndSortedReports() {
    let filtered = [...missingReports]

    // Filter by caregiver
    if (filterCaregiver !== "all") {
      filtered = filtered.filter(r => r.caregiverId === filterCaregiver)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case "caregiver":
          return a.caregiverName.localeCompare(b.caregiverName)
        case "overdue":
          return b.daysOverdue - a.daysOverdue
        default:
          return 0
      }
    })

    return filtered
  }

  function groupReportsByDate(reports: MissingReport[]) {
    const grouped: { [key: string]: MissingReport[] } = {}

    reports.forEach(report => {
      const dateKey = new Date(report.date).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(report)
    })

    return grouped
  }

  // Get unique caregivers for filter dropdown
  const uniqueCaregivers = Array.from(
    new Map(
      missingReports.map(r => [r.caregiverId, { id: r.caregiverId, name: r.caregiverName }])
    ).values()
  )

  const filteredReports = getFilteredAndSortedReports()

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ontbrekende Rapporten</h1>
            <p className="text-muted-foreground mt-1">
              {isCaregiver
                ? "Uw diensten waarvoor u nog geen rapport heeft ingediend"
                : "Diensten waarvoor nog geen rapport is ingediend"}
            </p>
          </div>
          <Link href="/dashboard/rapporteren">
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Terug naar Rapporteren
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
          <div className={`grid gap-4 ${isClient ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Totaal Ontbrekend</CardDescription>
                <CardTitle className="text-3xl text-orange-600">
                  {summary.totalMissing}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {summary.totalMissing === 1 ? 'Dienst' : 'Diensten'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unieke Dagen</CardDescription>
                <CardTitle className="text-3xl">{summary.uniqueDays}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {summary.uniqueDays === 1 ? 'Dag' : 'Dagen'}
                </p>
              </CardContent>
            </Card>

            {/* Only show for clients - caregivers only see their own */}
            {isClient && (
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Zorgverleners</CardDescription>
                  <CardTitle className="text-3xl">{summary.uniqueCaregivers}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Met ontbrekende rapporten
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Oudste Datum</CardDescription>
                <CardTitle className="text-lg">
                  {summary.oldestMissingDate
                    ? new Date(summary.oldestMissingDate).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '-'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Oudste ontbrekende rapport
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {!isLoading && missingReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Filters & Sortering</CardTitle>
              <CardDescription>Filter en sorteer de ontbrekende rapporten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${isClient ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
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
                      {isClient && <SelectItem value="caregiver">Zorgverlener</SelectItem>}
                      <SelectItem value="overdue">Meest achterstallig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Ontbrekende Rapporten ({filteredReports.length})</CardTitle>
            <CardDescription>
              Overzicht van alle diensten zonder rapport
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-scroll">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Ontbrekende rapporten laden...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold text-green-600 mb-2">
                  {missingReports.length === 0
                    ? "Geen ontbrekende rapporten gevonden!"
                    : "Geen resultaten met deze filters"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {missingReports.length === 0
                    ? "Alle diensten hebben een rapport"
                    : "Probeer andere filters"}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupReportsByDate(filteredReports)).map(([dateKey, reports]) => (
                  <div key={dateKey} className="space-y-3">
                    {/* Date Separator */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <h3 className="text-sm font-semibold text-gray-600 px-3 py-1 bg-gray-100 rounded-full">
                        {dateKey}
                      </h3>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    {/* Missing Report Cards */}
                    <div className="space-y-3">
                      {reports.map(report => (
                        <Card key={report.shiftId} className="border-l-4 border-l-orange-500">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Caregiver Name */}
                                <h4 className="font-semibold text-lg mb-2">
                                  {report.caregiverName}
                                </h4>

                                {/* Shift Type Badge & Time */}
                                <div className="flex items-center gap-2 mb-3">
                                  <span
                                    className="px-2 py-1 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: report.shiftType.color }}
                                  >
                                    {report.shiftType.name}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {report.shiftType.startTime} - {report.shiftType.endTime}
                                  </span>
                                </div>

                                {/* Days Overdue & Status */}
                                <div className="flex items-center gap-3 text-sm flex-wrap">
                                  <span
                                    className={`px-2 py-1 rounded-full font-medium ${
                                      report.daysOverdue > 30
                                        ? 'bg-red-100 text-red-700'
                                        : report.daysOverdue > 7
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {report.daysOverdue} {report.daysOverdue === 1 ? 'dag' : 'dagen'} geleden
                                  </span>
                                  <span className="text-muted-foreground">
                                    Status: {report.status === 'COMPLETED' ? 'Voltooid' : 'Ingepland'}
                                  </span>
                                  <span className="text-muted-foreground">
                                    📅 {new Date(report.date).toLocaleDateString('nl-NL', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Action: Button for caregivers, Warning icon for clients */}
                              {isCaregiver && selectedClient ? (
                                <Link href={`/dashboard/reports/new?client=${selectedClient.id}&date=${report.date}`}>
                                  <Button className="bg-blue-600 hover:bg-orange-500 text-white ml-4">
                                    Maak rapport
                                  </Button>
                                </Link>
                              ) : (
                                <svg className="w-6 h-6 text-orange-500 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  )
}
