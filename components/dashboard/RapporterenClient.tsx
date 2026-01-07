"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
  const [reports, setReports] = useState<CareReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

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

  const isClient = user.role === "CLIENT"

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
          <Link href="/dashboard/reports">
            <Button variant="outline">Overzicht alle Rapportage's</Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <CardTitle>Rapportages</CardTitle>
              <CardDescription>Bekijk al uw zorgrapportages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
                  <p className="text-sm text-muted-foreground">Totaal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isClient && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <CardTitle>Nieuw Rapport</CardTitle>
                <CardDescription>Maak een nieuwe zorgrapportage aan</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/reports/new">
                  <Button className="w-full">Rapport Aanmaken</Button>
                </Link>
              </CardContent>
            </Card>
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
          <CardContent className="max-h-[600px] overflow-y-scroll">
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
