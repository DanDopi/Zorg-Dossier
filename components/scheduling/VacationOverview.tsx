"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Vacation {
  id: string
  startDate: string
  endDate: string
  reason?: string | null
  reviewedAt?: string | null
  caregiver: {
    id: string
    name: string
    color?: string | null
  }
}

interface VacationOverviewProps {
  clientId: string
}

function getDayCount(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  const diff = e.getTime() - s.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1
}

function formatDateDutch(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function VacationOverview({ clientId }: VacationOverviewProps) {
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    fetchVacations()
  }, [clientId])

  async function fetchVacations() {
    try {
      const params = new URLSearchParams({
        clientId,
        requestType: "VACATION",
        status: "APPROVED",
        includeDismissed: "true",
      })
      const response = await fetch(`/api/scheduling/time-off?${params}`)
      if (response.ok) {
        const data = await response.json()
        setVacations(data)
      }
    } catch (error) {
      console.error("Failed to fetch vacations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = vacations.filter((v) => new Date(v.endDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const past = vacations.filter((v) => new Date(v.endDate) < today)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <p>Laden...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current & Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            Lopend &amp; Aankomend
          </CardTitle>
          <CardDescription>
            Goedgekeurde vakanties die nu lopen of nog komen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Geen lopende of aankomende vakanties
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((vacation) => {
                const isActive = new Date(vacation.startDate) <= today && new Date(vacation.endDate) >= today
                const days = getDayCount(vacation.startDate, vacation.endDate)

                return (
                  <div
                    key={vacation.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      isActive
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    {/* Caregiver badge */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: vacation.caregiver.color || "#9CA3AF" }}
                    >
                      {vacation.caregiver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{vacation.caregiver.name}</span>
                        {isActive && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                            Nu afwezig
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {formatDateDutch(vacation.startDate)} - {formatDateDutch(vacation.endDate)}
                        </span>
                        <span className="text-xs ml-1">
                          ({days} {days === 1 ? "dag" : "dagen"})
                        </span>
                      </div>
                      {vacation.reason && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          {vacation.reason}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowPast(!showPast)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  Afgelopen Vakanties ({past.length})
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showPast && (
            <CardContent>
              <div className="space-y-3">
                {past.map((vacation) => {
                  const days = getDayCount(vacation.startDate, vacation.endDate)

                  return (
                    <div
                      key={vacation.id}
                      className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 opacity-60"
                        style={{ backgroundColor: vacation.caregiver.color || "#9CA3AF" }}
                      >
                        {vacation.caregiver.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-muted-foreground">
                          {vacation.caregiver.name}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDateDutch(vacation.startDate)} - {formatDateDutch(vacation.endDate)}
                          </span>
                          <span className="ml-1">
                            ({days} {days === 1 ? "dag" : "dagen"})
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Totally empty state */}
      {vacations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sun className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg text-muted-foreground">
              Geen goedgekeurde vakanties
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Wanneer zorgverleners vakantie aanvragen en u deze goedkeurt, verschijnen ze hier.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
