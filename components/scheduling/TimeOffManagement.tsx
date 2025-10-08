"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, X, Clock, Calendar, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { CaregiverBadge } from "@/components/ui/CaregiverBadge"

interface TimeOffRequest {
  id: string
  requestType: "DAY_OFF" | "SICK_LEAVE" | "VACATION"
  startDate: Date
  endDate: Date
  reason?: string | null
  status: "PENDING" | "APPROVED" | "DENIED"
  isEmergency: boolean
  caregiver: {
    id: string
    name: string
    color?: string | null
  }
  createdAt: Date
}

interface TimeOffManagementProps {
  clientId: string
}

const REQUEST_TYPE_LABELS = {
  DAY_OFF: "Vrije dag",
  SICK_LEAVE: "Ziekmelding",
  VACATION: "Vakantie",
}

const STATUS_LABELS = {
  PENDING: "In afwachting",
  APPROVED: "Goedgekeurd",
  DENIED: "Afgewezen",
}

export default function TimeOffManagement({ clientId }: TimeOffManagementProps) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending")

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/scheduling/time-off?clientId=${clientId}`)
      if (response.ok) {
        const data = await response.json()
        const requestsWithDates = data.map((r: TimeOffRequest) => ({
          ...r,
          startDate: new Date(r.startDate),
          endDate: new Date(r.endDate),
          createdAt: new Date(r.createdAt),
        }))
        setRequests(requestsWithDates)
      }
    } catch (error) {
      console.error("Error fetching time-off requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch("/api/scheduling/time-off", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "APPROVED" }),
      })

      if (response.ok) {
        await fetchRequests()
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const handleDeny = async (id: string) => {
    if (!confirm("Weet u zeker dat u deze aanvraag wilt afwijzen?")) {
      return
    }

    try {
      const response = await fetch("/api/scheduling/time-off", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "DENIED" }),
      })

      if (response.ok) {
        await fetchRequests()
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Check className="h-4 w-4 text-green-600" />
      case "DENIED":
        return <X className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "border-green-200 bg-green-50"
      case "DENIED":
        return "border-red-200 bg-red-50"
      default:
        return "border-yellow-200 bg-yellow-50"
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (filter === "pending") return r.status === "PENDING"
    if (filter === "approved") return r.status === "APPROVED"
    return true
  })

  const pendingCount = requests.filter((r) => r.status === "PENDING").length

  if (loading) {
    return <div>Laden...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Verlofaanvragen</h2>
        <p className="text-muted-foreground mt-1">
          Bekijk en beheer verlofaanvragen van uw zorgverleners
        </p>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900">
                  {pendingCount} {pendingCount === 1 ? "aanvraag" : "aanvragen"} in afwachting
                </p>
                <p className="text-sm text-yellow-800">
                  Er {pendingCount === 1 ? "is" : "zijn"} verlofaanvragen die uw goedkeuring
                  nodig hebben.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          In afwachting ({requests.filter((r) => r.status === "PENDING").length})
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          onClick={() => setFilter("approved")}
        >
          Goedgekeurd ({requests.filter((r) => r.status === "APPROVED").length})
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Alles ({requests.length})
        </Button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">
              {filter === "pending"
                ? "Geen aanvragen in afwachting"
                : filter === "approved"
                  ? "Geen goedgekeurde aanvragen"
                  : "Geen verlofaanvragen"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className={`border-2 ${getStatusColor(request.status)}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <CaregiverBadge
                        name={request.caregiver.name}
                        color={request.caregiver.color}
                        size="md"
                      />
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className="font-semibold">
                          {REQUEST_TYPE_LABELS[request.requestType]}
                        </span>
                        {request.isEmergency && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded">
                            URGENT
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground">Periode</p>
                          <p className="font-medium">
                            {format(request.startDate, "d MMM yyyy", { locale: nl })} -{" "}
                            {format(request.endDate, "d MMM yyyy", { locale: nl })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium">{STATUS_LABELS[request.status]}</p>
                        </div>
                      </div>

                      {request.reason && (
                        <div>
                          <p className="text-muted-foreground">Reden</p>
                          <p className="font-medium">{request.reason}</p>
                        </div>
                      )}

                      {request.requestType === "SICK_LEAVE" && request.isEmergency && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                          <p className="text-sm text-red-800">
                            <strong>Ziekmelding:</strong> Deze zorgverlener heeft zich ziek
                            gemeld. Deze aanvraag is automatisch goedgekeurd. Neem contact op
                            met de zorgverlener om vervanging te regelen.
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Aangevraagd op{" "}
                        {format(request.createdAt, "d MMM yyyy 'om' HH:mm", { locale: nl })}
                      </p>
                    </div>
                  </div>

                  {request.status === "PENDING" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Goedkeuren
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeny(request.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Afwijzen
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
