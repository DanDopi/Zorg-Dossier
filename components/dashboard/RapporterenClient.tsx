"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  const [reports, setReports] = useState<CareReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missingReportsCount, setMissingReportsCount] = useState<number>(0)

  const isClient = user.role === "CLIENT"
  const isCaregiver = user.role === "CAREGIVER"

  useEffect(() => {
    // For clients, load immediately
    if (isClient) {
      fetchReports()
      fetchMissingReports()
    }
    // For caregivers, only load if a client is selected
    else if (isCaregiver && selectedClient) {
      fetchReports()
      fetchMissingReports()
    }
  }, [selectedClient])

  async function fetchReports() {
    try {
      const response = await fetch("/api/reports")

      if (!response.ok) {
        throw new Error("Kon rapporten niet laden")
      }

      const data = await response.json()
      setReports(data.reports || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon rapporten niet laden')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMissingReports() {
    try {
      // For caregivers, include clientId in the request
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

  // Group reports by date
  function groupReportsByDate(reports: CareReport[]) {
    const grouped: { [key: string]: CareReport[] } = {}

    reports.forEach(report => {
      const dateKey = new Date(report.reportDate).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(report)
    })

    return grouped
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Zorgrapportages
            </h2>
            <p className="text-muted-foreground mt-1">
              {isClient
                ? "Bekijk alle rapportages van uw zorgverleners"
                : "Bekijk en beheer al uw zorgrapportages"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(isClient || (isCaregiver && selectedClient)) && (
              <Link href="/dashboard/reports/missing">
                <Button variant="outline" className={missingReportsCount > 0 ? "bg-orange-50 border-orange-200 text-orange-700" : ""}>
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
              <Button variant="outline">Overzicht alle Rapportage&apos;s</Button>
            </Link>
            {isCaregiver && (
              <Link href="/dashboard/reports/new">
                <Button className="bg-blue-600 hover:bg-orange-500 text-white">
                  Maak een nieuw rapport
                </Button>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rapportages</p>
                  <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(isClient || (isCaregiver && selectedClient)) && (
            <Link href="/dashboard/reports/missing">
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${
                missingReportsCount > 0 ? 'border-orange-200 bg-orange-50' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      missingReportsCount > 0 ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        missingReportsCount > 0 ? 'text-orange-600' : 'text-gray-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ontbrekend</p>
                      <p className={`text-2xl font-bold ${
                        missingReportsCount > 0 ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {missingReportsCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Rapportages</CardTitle>
            <CardDescription>
              {isClient
                ? "Rapportages van uw zorgverleners"
                : "Uw dagelijkse zorgrapportages"}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[480px] overflow-y-scroll">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Nog geen rapportages beschikbaar</p>
                {!isClient && (
                  <p className="text-sm mt-2">Maak uw eerste rapport aan</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupReportsByDate(reports)).map(([dateKey, dateReports]) => (
                  <div key={dateKey} className="space-y-3">
                    {/* Date Header/Separator */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <h3 className="text-sm font-semibold text-gray-600 px-3 py-1 bg-gray-100 rounded-full">
                        {dateKey}
                      </h3>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    {/* Reports for this date */}
                    <div className="space-y-3">
                      {dateReports.map((report) => (
                        <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
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
                                      {new Date(report.createdAt).toLocaleDateString('nl-NL')}
                                    </span>
                                  </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
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
