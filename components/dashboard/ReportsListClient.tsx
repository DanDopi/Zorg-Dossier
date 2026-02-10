"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import Link from "next/link"

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
  const [reports, setReports] = useState<Report[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    fetchReports()
    if (userRole === "CAREGIVER") {
      fetchClients()
    }
  }, [userRole])

  async function fetchReports() {
    try {
      const response = await fetch("/api/reports")

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

  // Filter reports by search query and selected date
  function getFilteredReports() {
    let filtered = reports

    // Filter by search query (caregiver name or client name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(report =>
        report.caregiver.name.toLowerCase().includes(query) ||
        report.client.name.toLowerCase().includes(query)
      )
    }

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.reportDate)
        return (
          reportDate.getDate() === selectedDate.getDate() &&
          reportDate.getMonth() === selectedDate.getMonth() &&
          reportDate.getFullYear() === selectedDate.getFullYear()
        )
      })
    }

    return filtered
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
  const filteredReports = getFilteredReports()

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

      {/* Search Filters */}
      <div className="mb-4 grid md:grid-cols-2 gap-4">
        {/* Search by caregiver name */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Zoeken op zorgverlener en client naam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Date picker */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${
                  !selectedDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "d MMMM yyyy", { locale: nl })
                ) : (
                  "Selecteer datum..."
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(undefined)}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 max-h-[600px] overflow-y-scroll">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {/* Reports List */}
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>{reports.length === 0 ? "Nog geen rapporten beschikbaar" : "Geen rapporten gevonden met deze zoekopdracht"}</p>
              {isCaregiver && reports.length === 0 && (
                <p className="text-sm mt-2">Maak uw eerste rapport aan</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupReportsByDate(filteredReports)).map(([dateKey, dateReports]) => (
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
