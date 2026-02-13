"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import Link from "next/link"
import { useClient } from "@/lib/ClientContext"

interface WoundCareReport {
  id: string
  reportDate: string
  reportTime: string
  cleaningPerformed: string
  productsUsed: string
  woundColor?: string
  woundOdor?: string
  exudateAmount?: string
  painLevel?: string
  sizeChange?: string
  evaluation: string
  generalNotes?: string
  photo?: string
  complications?: string
  caregiver: {
    name: string
  }
  woundCarePlan: {
    location: string
    woundType: string
  }
}

interface WondzorgReportsListClientProps {
  userRole: string
}

const evaluationLabels: Record<string, string> = {
  improvement: "Verbetering",
  stable: "Stabiel",
  decline: "Verslechtering",
}

const evaluationColors: Record<string, string> = {
  improvement: "text-green-700 bg-green-50 border-green-200",
  stable: "text-blue-700 bg-blue-50 border-blue-200",
  decline: "text-red-700 bg-red-50 border-red-200",
}

export default function WondzorgReportsListClient({ userRole }: WondzorgReportsListClientProps) {
  const { selectedClient } = useClient()
  const [reports, setReports] = useState<WoundCareReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const isClient = userRole === "CLIENT"
  const isCaregiver = userRole === "CAREGIVER"

  useEffect(() => {
    if (isClient || (isCaregiver && selectedClient)) {
      fetchReports()
    } else {
      setIsLoading(false)
    }
  }, [selectedClient, userRole])

  async function fetchReports() {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (isCaregiver && selectedClient) {
        params.set("clientId", selectedClient.id)
      }

      const response = await fetch(`/api/wondzorg/reports?${params}`)

      if (!response.ok) {
        throw new Error("Kon wondzorg rapportages niet laden")
      }

      const data = await response.json()
      setReports(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }

  function getFilteredReports() {
    let filtered = reports

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(report =>
        report.caregiver.name.toLowerCase().includes(query) ||
        report.woundCarePlan.location.toLowerCase().includes(query) ||
        report.woundCarePlan.woundType.toLowerCase().includes(query) ||
        (report.generalNotes?.toLowerCase().includes(query) ?? false)
      )
    }

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

  function groupReportsByDate(reports: WoundCareReport[]) {
    const grouped: { [key: string]: WoundCareReport[] } = {}

    reports.forEach(report => {
      const dateKey = new Date(report.reportDate).toLocaleDateString("nl-NL", {
        year: "numeric",
        month: "long",
        day: "numeric",
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
          <p className="text-muted-foreground">Wondzorg rapportages laden...</p>
        </div>
      </div>
    )
  }

  const filteredReports = getFilteredReports()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Wondzorg Rapportages</h1>
          <p className="text-muted-foreground mt-1">
            {isClient
              ? "Alle wondzorg rapportages van uw zorgverleners"
              : "Uw wondzorg rapportages"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/wondzorg">
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Terug naar Wondzorg
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Filters */}
      <div className="mb-4 grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Zoeken op zorgverlener, locatie of wondtype..."
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
        <CardContent className="pt-6 max-h-[calc(100vh-320px)] overflow-y-scroll">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>{reports.length === 0 ? "Nog geen wondzorg rapportages beschikbaar" : "Geen rapportages gevonden met deze zoekopdracht"}</p>
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
                      <Card key={report.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Wound location and type */}
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg">
                                  {report.woundCarePlan.location}
                                </h4>
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                  {report.woundCarePlan.woundType}
                                </span>
                              </div>

                              {/* Caregiver */}
                              <p className="text-sm text-blue-600 mb-1">
                                Door: {report.caregiver.name}
                              </p>

                              {/* Cleaning & Products summary */}
                              <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                                {report.cleaningPerformed} &mdash; {report.productsUsed}
                              </p>

                              {/* General notes if present */}
                              {report.generalNotes && (
                                <p className="text-sm text-gray-500 line-clamp-1 mb-2 italic">
                                  {report.generalNotes}
                                </p>
                              )}

                              {/* Metadata */}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                {/* Evaluation badge */}
                                <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${evaluationColors[report.evaluation] || "text-gray-700 bg-gray-50 border-gray-200"}`}>
                                  {evaluationLabels[report.evaluation] || report.evaluation}
                                </span>

                                {/* Time */}
                                <span>
                                  {new Date(report.reportTime).toLocaleTimeString("nl-NL", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>

                                {report.photo && (
                                  <span className="flex items-center gap-1">
                                    Foto bijgevoegd
                                  </span>
                                )}

                                {report.complications && (
                                  <span className="text-red-600 font-medium">
                                    Complicaties gemeld
                                  </span>
                                )}
                              </div>
                            </div>
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
