"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>("")

  useEffect(() => {
    fetchReports()
    fetchClients()
  }, [selectedClient])

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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchClients() {
    try {
      const response = await fetch("/api/my-clients")
      if (response.ok) {
        const data = await response.json()
        const activeClients = (data.clients || []).filter((c: any) => c.status === "ACTIVE")
        setClients(activeClients)
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Rapporten laden...</p>
        </div>
      </div>
    )
  }

  // Determine if user is caregiver by checking if they have clients
  // (only caregivers would have the /api/my-clients endpoint return data)
  const isCaregiver = clients.length > 0 || reports.some(r => r.caregiver)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Zorgdossier
            </h1>
            <div className="flex gap-3">
              {isCaregiver && (
                <Link href="/dashboard/reports/new">
                  <Button>+ Nieuw Rapport</Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant="outline">← Terug naar Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Zorgrapportages</CardTitle>
            <CardDescription>
              {isCaregiver
                ? "Uw dagelijkse zorgrapportages"
                : "Rapportages van uw zorgverleners"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            {/* Filter by client (caregivers only) */}
            {isCaregiver && clients.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter op cliënt
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full md:w-64 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle cliënten</option>
                  {clients.map((client) => (
                    <option key={client.clientId} value={client.clientId}>
                      {client.client.name}
                    </option>
                  ))}
                </select>
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
              <div className="space-y-4">
                {reports.map((report) => (
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
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                {new Date(report.reportDate).toLocaleDateString('nl-NL', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
