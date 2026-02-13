"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import Link from "next/link"
import { useClient } from "@/lib/ClientContext"

interface ClientProfile {
  id: string
  name: string
  user: {
    email: string
  }
}

interface CaregiverProfile {
  id: string
  name: string
  user: {
    email: string
  }
}

interface CareReportImage {
  id: string
  reportId: string
  mimeType: string
  fileName: string
  fileSize: number
  createdAt: string
}

interface CareReport {
  id: string
  caregiverId: string
  clientId: string
  content: string
  reportDate: string
  createdAt: string
  updatedAt: string
  client: ClientProfile
  caregiver: CaregiverProfile
  images?: CareReportImage[]
}

interface UserWithProfile {
  id: string
  email: string
  role: string
  clientProfile?: {
    name: string
  } | null
  caregiverProfile?: {
    name: string
  } | null
}

interface RapporterenClientProps {
  user: UserWithProfile
}

export default function RapporterenClient({ user }: RapporterenClientProps) {
  const { selectedClient } = useClient()
  const [allReports, setAllReports] = useState<CareReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missingReportsCount, setMissingReportsCount] = useState<number>(0)
  const [openDays, setOpenDays] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [hasShift, setHasShift] = useState<boolean | null>(null)

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  useEffect(() => {
    if (isClient) {
      fetchReports()
      fetchMissingReports()
    } else if (isCaregiver && selectedClient) {
      fetchReports()
      fetchMissingReports()
      fetchOpenDays()
    }
  }, [selectedClient])

  // Check if caregiver has a shift on the selected date
  useEffect(() => {
    if (!isCaregiver || !selectedClient || !selectedDate) {
      setHasShift(null)
      return
    }

    async function checkShift() {
      try {
        const res = await fetch(`/api/shifts/check?clientId=${selectedClient!.id}&date=${selectedDate}`)
        const data = await res.json()
        setHasShift(data.hasShift)
      } catch {
        setHasShift(null)
      }
    }
    checkShift()
  }, [isCaregiver, selectedClient, selectedDate])

  async function fetchReports() {
    try {
      setIsLoading(true)
      const response = await fetch("/api/reports")

      if (!response.ok) {
        throw new Error("Kon rapporten niet laden")
      }

      const data = await response.json()
      setAllReports(data.reports || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon rapporten niet laden")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMissingReports() {
    try {
      const params = new URLSearchParams()
      if (isCaregiver && selectedClient) {
        params.set("clientId", selectedClient.id)
      }
      const url = `/api/reports/missing${params.toString() ? `?${params}` : ""}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setMissingReportsCount(data.missingDays || 0)
      }
    } catch (error) {
      console.error("Error fetching missing reports:", error)
    }
  }

  // Filter reports for selected date
  function getReportsForDate(): CareReport[] {
    return allReports.filter((report) => {
      const reportDate = new Date(report.reportDate)
      const [year, month, day] = selectedDate.split("-").map(Number)
      return (
        reportDate.getFullYear() === year &&
        reportDate.getMonth() === month - 1 &&
        reportDate.getDate() === day
      )
    })
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
  const dayReports = getReportsForDate()

  // Formatted date for overview header
  const formattedDate = new Date(selectedDate + "T12:00:00").toLocaleDateString(
    "nl-NL",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  )

  // Count unique caregivers for this day
  const uniqueCaregivers = new Set(dayReports.map((r) => r.caregiverId)).size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Zorgrapportages</h2>
        <p className="text-muted-foreground mt-1">
          {isClient
            ? "Bekijk alle rapportages van uw zorgverleners"
            : "Dagelijkse zorgrapportages en overzicht"}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(isClient || (isCaregiver && selectedClient)) && (
            <Link href="/dashboard/reports/missing">
              <Button
                variant="outline"
                className={
                  missingReportsCount > 0
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : ""
                }
              >
                Ontbrekende Rapporten
                {missingReportsCount > 0 && (
                  <span className="ml-2 bg-orange-600 text-white rounded-full px-2 py-0.5 text-xs">
                    {missingReportsCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          <Link href="/dashboard/reports">
            <Button variant="outline">
              Overzicht alle Rapportage&apos;s
            </Button>
          </Link>
        </div>
        {isCaregiver && (
          hasShift === false ? (
            <Button className="bg-gray-400 text-white cursor-not-allowed" disabled>
              Maak een nieuw rapport
            </Button>
          ) : (
            <Link href={`/dashboard/reports/new?date=${selectedDate}`}>
              <Button className="bg-blue-600 hover:bg-orange-500 text-white">
                Maak een nieuw rapport
              </Button>
            </Link>
          )
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Overview Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-3">
            Overzicht {formattedDate}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {dayReports.length}
              </p>
              <p className="text-sm text-muted-foreground">Rapportages</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {uniqueCaregivers}
              </p>
              <p className="text-sm text-muted-foreground">
                {isClient ? "Zorgverleners" : "Medewerkers"}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {dayReports.reduce(
                  (sum, r) => sum + (r.images?.length || 0),
                  0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Afbeeldingen</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">
                {allReports.length}
              </p>
              <p className="text-sm text-muted-foreground">Totaal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCaregiver && openDays.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousOpenDay}
                  disabled={!hasPreviousOpenDay}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  title="Vorige dag met ontbrekende rapporten"
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
              <input
                type="date"
                title="Selecteer datum"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
              />
              {!isToday && (
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Vandaag
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
                  title="Volgende dag met ontbrekende rapporten"
                >
                  Volgende Open Dag
                  <ChevronsRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No shift warning */}
      {isCaregiver && hasShift === false && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md text-sm">
          U kunt geen registraties aanmaken omdat u geen dienst heeft op deze dag.
        </div>
      )}

      {/* Reports List for Selected Day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Rapportages</CardTitle>
          <CardDescription>
            {isClient
              ? "Rapportages van uw zorgverleners voor deze dag"
              : "Zorgrapportages voor deze dag"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : dayReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>Geen rapportages voor deze dag</p>
              {isCaregiver && (
                hasShift === false ? (
                  <p className="text-sm mt-2 text-red-600">
                    U kunt geen rapport maken voor deze dag omdat u geen dienst heeft.
                  </p>
                ) : (
                  <p className="text-sm mt-2">
                    <Link
                      href={`/dashboard/reports/new?date=${selectedDate}`}
                      className="text-blue-600 hover:underline"
                    >
                      Maak een rapport aan
                    </Link>
                  </p>
                )
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                >
                  <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-lg">
                              {isClient
                                ? report.caregiver.name
                                : report.client.name}
                            </h4>
                          </div>

                          {isClient && (
                            <p className="text-sm text-blue-600 mb-1">
                              Door: {report.caregiver.name}
                            </p>
                          )}

                          <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                            {report.content}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {report.images && report.images.length > 0 && (
                              <span className="flex items-center gap-1">
                                📷 {report.images.length}
                              </span>
                            )}
                            <span>
                              {new Date(
                                report.createdAt
                              ).toLocaleTimeString("nl-NL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
