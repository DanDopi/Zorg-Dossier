"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, AlertCircle, Calendar, Trash2, Check, X, Clock } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"

interface Client {
  id: string
  name: string
}

interface TimeOffRequest {
  id: string
  groupId?: string | null
  requestType: "DAY_OFF" | "SICK_LEAVE" | "VACATION"
  startDate: Date
  endDate: Date
  reason?: string | null
  status: "PENDING" | "APPROVED" | "DENIED"
  isEmergency: boolean
  reviewNotes?: string | null
  client: {
    id: string
    name: string
  }
  createdAt: Date
}

interface TimeOffRequestProps {
  caregiverId: string
  clients: Client[]
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

export default function TimeOffRequest({ caregiverId, clients }: TimeOffRequestProps) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all")
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    requestType: "DAY_OFF" as "DAY_OFF" | "SICK_LEAVE" | "VACATION",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    isEmergency: false,
  })

  const handleClientToggle = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClientIds((prev) => [...prev, clientId])
    } else {
      setSelectedClientIds((prev) => prev.filter((id) => id !== clientId))
    }
  }

  const toggleAllClients = () => {
    if (selectedClientIds.length === clients.length) {
      setSelectedClientIds([])
    } else {
      setSelectedClientIds(clients.map((c) => c.id))
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/scheduling/time-off?caregiverId=${caregiverId}&includeDismissed=true`)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (selectedClientIds.length === 0) {
      alert("Selecteer minimaal één client")
      return
    }

    // Show warning for sick leave
    if (formData.requestType === "SICK_LEAVE") {
      const confirmMessage = formData.isEmergency
        ? "Dit is een ziekmelding. De cliënt(en) ontvangen direct een melding. Vergeet niet de cliënt(en) ook telefonisch te bereiken!"
        : "Weet u zeker dat u zich ziek wilt melden?"

      if (!confirm(confirmMessage)) {
        return
      }
    }

    try {
      const response = await fetch("/api/scheduling/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: selectedClientIds,
          ...formData,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Success message
        alert(
          `Verlofaanvraag ingediend bij ${data.count} client${data.count === 1 ? "" : "s"}.`
        )

        await fetchRequests()
        setIsDialogOpen(false)
        setSelectedClientIds([])
        setFormData({
          requestType: "DAY_OFF",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd"),
          reason: "",
          isEmergency: false,
        })

        if (formData.requestType === "SICK_LEAVE" && formData.isEmergency) {
          alert("Ziekmelding verzonden! Vergeet niet de cliënt(en) ook telefonisch te bereiken.")
        }
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Weet u zeker dat u deze aanvraag wilt verwijderen?")) {
      return
    }

    try {
      const response = await fetch(`/api/scheduling/time-off?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setRequests(requests.filter((r) => r.id !== id))
      } else {
        const errorData = await response.json()
        alert(`Fout: ${errorData.error}`)
      }
    } catch {
      alert("Er is een fout opgetreden")
    }
  }

  const handleDeleteGroup = async (groupId: string, groupRequests: TimeOffRequest[]) => {
    if (!confirm(`Weet u zeker dat u deze verlofaanvraag wilt verwijderen voor ${groupRequests.length} client${groupRequests.length === 1 ? "" : "s"}?`)) {
      return
    }

    try {
      // Delete all requests in the group
      await Promise.all(
        groupRequests.map((request) =>
          fetch(`/api/scheduling/time-off?id=${request.id}`, {
            method: "DELETE",
          })
        )
      )

      await fetchRequests()
    } catch (error) {
      console.error("Error deleting time-off requests:", error)
      alert("Er is een fout opgetreden bij het verwijderen")
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
        return "bg-green-50 border-green-200 text-green-800"
      case "DENIED":
        return "bg-red-50 border-red-200 text-red-800"
      default:
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
    }
  }

  if (loading) {
    return <div>Laden...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verlof & Ziekmeldingen</h2>
          <p className="text-muted-foreground mt-1">
            Vraag verlof aan of meld u ziek
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nieuwe Aanvraag
        </Button>
      </div>

      {/* Emergency Sick Leave Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">Ziek?</p>
              <p className="text-sm text-yellow-800">
                Gebruik &quot;Nieuwe Aanvraag&quot; → &quot;Ziekmelding&quot; en vergeet niet de cliënt ook
                telefonisch te bereiken.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          variant={filter === "denied" ? "default" : "outline"}
          onClick={() => setFilter("denied")}
        >
          Afgewezen ({requests.filter((r) => r.status === "DENIED").length})
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Alles ({requests.length})
        </Button>
      </div>

      {/* Requests List */}
      {(() => {
        // Filter requests based on selected filter
        const filteredRequests = requests.filter((r) => {
          if (filter === "pending") return r.status === "PENDING"
          if (filter === "approved") return r.status === "APPROVED"
          if (filter === "denied") return r.status === "DENIED"
          return true
        })

        if (filteredRequests.length === 0) {
          return (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg">
                  {filter === "pending"
                    ? "Geen aanvragen in afwachting"
                    : filter === "approved"
                      ? "Geen goedgekeurde aanvragen"
                      : filter === "denied"
                        ? "Geen afgewezen aanvragen"
                        : requests.length === 0
                          ? "Geen verlofaanvragen"
                          : "Geen aanvragen met dit filter"}
                </p>
                {requests.length === 0 && (
                  <p className="text-sm mt-2">
                    Klik op &quot;Nieuwe Aanvraag&quot; om verlof aan te vragen
                  </p>
                )}
              </CardContent>
            </Card>
          )
        }

        return (
          <div className="space-y-4">
            {(() => {
              // Group requests by groupId
              const groupedRequests = filteredRequests.reduce((acc, request) => {
              const key = request.groupId || request.id // Use groupId if exists, otherwise use id for legacy single requests
              if (!acc[key]) {
                acc[key] = []
              }
              acc[key].push(request)
              return acc
            }, {} as Record<string, typeof requests>)

            return Object.entries(groupedRequests).map(([groupId, groupRequests]) => {
              const firstRequest = groupRequests[0]
              const allApproved = groupRequests.every((r) => r.status === "APPROVED")
              const allDenied = groupRequests.every((r) => r.status === "DENIED")
              const allPending = groupRequests.every((r) => r.status === "PENDING")

              return (
                <Card key={groupId} className="border-2">
                  <CardContent className="py-4">
                    {/* Header showing type and dates */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {REQUEST_TYPE_LABELS[firstRequest.requestType]}
                          </span>
                          {firstRequest.isEmergency && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded">
                              URGENT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(firstRequest.startDate, "d MMM yyyy", { locale: nl })} -{" "}
                          {format(firstRequest.endDate, "d MMM yyyy", { locale: nl })}
                        </p>
                        {firstRequest.reason && (
                          <p className="text-sm mt-1">{firstRequest.reason}</p>
                        )}
                      </div>

                      {/* Overall status badge */}
                      <div className="flex items-center gap-2">
                        {allApproved && (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                            Alle clients goedgekeurd
                          </span>
                        )}
                        {allDenied && (
                          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                            Alle clients afgewezen
                          </span>
                        )}
                        {allPending && (
                          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                            In afwachting
                          </span>
                        )}
                      </div>
                    </div>

                    {/* List of clients with individual statuses */}
                    <div className="space-y-2 mt-3 border-t pt-3">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Clients ({groupRequests.length}):
                      </p>
                      {groupRequests.map((request) => (
                        <div key={request.id}>
                          <div className="flex items-center justify-between py-1 px-2 rounded bg-muted/50">
                            <span className="text-sm">{request.client.name}</span>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(request.status)}
                              <span className="text-xs text-muted-foreground">
                                {STATUS_LABELS[request.status]}
                              </span>
                            </div>
                          </div>
                          {request.status === "DENIED" && request.reviewNotes && (
                            <div className="ml-2 mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">
                              <p className="text-xs font-medium text-red-900 mb-1">Reden van afwijzing:</p>
                              <p className="text-xs text-red-800">{request.reviewNotes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Delete button - only show if all pending */}
                    {allPending && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGroup(groupId, groupRequests)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Verwijder aanvraag
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          })()}
          </div>
        )
      })()}

      {/* Create Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Verlofaanvraag</DialogTitle>
            <DialogDescription>
              Vraag verlof aan of meld u ziek bij een cliënt
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Clients</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllClients}
                >
                  {selectedClientIds.length === clients.length ? "Deselecteer alles" : "Selecteer alles"}
                </Button>
              </div>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`client-${client.id}`}
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={(checked) => handleClientToggle(client.id, checked as boolean)}
                    />
                    <label
                      htmlFor={`client-${client.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {client.name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedClientIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedClientIds.length} {selectedClientIds.length === 1 ? "client geselecteerd" : "clients geselecteerd"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestType">Type</Label>
              <Select
                value={formData.requestType}
                onValueChange={(value: "DAY_OFF" | "SICK_LEAVE" | "VACATION") =>
                  setFormData({
                    ...formData,
                    requestType: value,
                    isEmergency: value === "SICK_LEAVE"
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY_OFF">Vrije dag</SelectItem>
                  <SelectItem value="SICK_LEAVE">Ziekmelding</SelectItem>
                  <SelectItem value="VACATION">Vakantie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.requestType === "SICK_LEAVE" && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="py-3">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      <strong>Let op:</strong> Ziekmeldingen worden direct goedgekeurd en de
                      cliënt ontvangt een melding. Vergeet niet de cliënt ook telefonisch te
                      bereiken!
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Einddatum</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                Reden {formData.requestType === "SICK_LEAVE" ? "(optioneel)" : ""}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  formData.requestType === "SICK_LEAVE"
                    ? "Bijv. griep, verkoudheid..."
                    : "Vertel waarom u verlof aanvraagt..."
                }
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit">
                {formData.requestType === "SICK_LEAVE" ? "Ziek Melden" : "Aanvraag Indienen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
