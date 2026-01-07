"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useClient } from "@/lib/ClientContext"

interface Report {
  id: string
  content: string
  reportDate: string
  createdAt: string
  images?: Array<{id: string}>
  client: {
    name: string
    user: {
      email: string
    }
  }
  caregiver: {
    name: string
    user: {
      email: string
    }
  }
}

interface Client {
  client: {
    id: string
    name: string
    user: {
      email: string
    }
  }
  status: string
}

interface ReportsListClientProps {
  userRole: string
}

export default function ReportsListClient({ userRole }: ReportsListClientProps) {
  const { selectedClient: globalSelectedClient } = useClient()
  const [reports, setReports] = useState<Report[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use global selected client
  const selectedClient = globalSelectedClient?.id || ""

  useEffect(() => {
    fetchReports()
    if (userRole === "CAREGIVER") {
      fetchClients()
    }
  }, [selectedClient, userRole])

  async function fetchReports() {
    try {
      const url = selectedClient
        ? `/api/reports?client=${selectedClient}`
        : "/api/reports"

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Kon rapporten niet laden")
      }

      const data = await response.json()
      setReports(data.reports || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchClients() {
    try {
      const response = await fetch("/api/my-clients")
      if (response.ok) {
        const data = await response.json()
        const activeClients = (data.clients || []).filter((c: Client) => c.status === "ACTIVE")
        setClients(activeClients)
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    }
  }

  // Group reports by date
  function groupReportsByDate(reports: Report[]) {
    const grouped: { [key: string]: Report[] } = {}

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Rapporten laden...</p>
        </div>
      </div>
    )
  }

  const isCaregiver = userRole === "CAREGIVER"

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Zorgrapportages</h1>
          <p className="text-muted-foreground mt-1">
            {isCaregiver
              ? "Uw dagelijkse zorgrapportages"
              : "Rapportages van uw zorgverleners"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/rapporteren">
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Terug naar Rapporteren
            </Button>
          </Link>
          {isCaregiver && (
            <Link href="/dashboard/reports/new">
              <Button>+ Nieuw Rapport</Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Nog geen rapporten beschikbaar</p>
              {isCaregiver && (
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
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Client/Caregiver Info */}
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-lg">
                                    {isCaregiver
                                      ? report.client.name
                                      : report.caregiver.name}
                                  </h4>
                                </div>

                                {/* Show caregiver name when viewing client's reports */}
                                {isCaregiver && (
                                  <p className="text-sm text-blue-600 mb-1">
                                    Door: {report.caregiver.name}
                                  </p>
                                )}

                                {/* Report Preview */}
                                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                                  {report.content}
                                </p>

                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    📧 {isCaregiver
                                      ? report.client.user.email
                                      : report.caregiver.user.email}
                                  </span>
                                  {report.images && report.images.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      📷 {report.images.length} {report.images.length === 1 ? 'afbeelding' : 'afbeeldingen'}
                                    </span>
                                  )}
                                  <span>
                                    Aangemaakt: {new Date(report.createdAt).toLocaleDateString('nl-NL')}
                                  </span>
                                </div>
                              </div>

                              <div className="ml-4">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
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
  )
}
