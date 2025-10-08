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
  requestType: "DAY_OFF" | "SICK_LEAVE" | "VACATION"
  startDate: Date
  endDate: Date
  reason?: string | null
  status: "PENDING" | "APPROVED" | "DENIED"
  isEmergency: boolean
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
  const [formData, setFormData] = useState({
    clientId: clients[0]?.id || "",
    requestType: "DAY_OFF" as "DAY_OFF" | "SICK_LEAVE" | "VACATION",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    isEmergency: false,
  })

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/scheduling/time-off?caregiverId=${caregiverId}`)
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

    // Show warning for sick leave
    if (formData.requestType === "SICK_LEAVE") {
      const confirmMessage = formData.isEmergency
        ? "Dit is een ziekmelding. De cliënt ontvangt direct een melding. Vergeet niet de cliënt ook telefonisch te bereiken!"
        : "Weet u zeker dat u zich ziek wilt melden?"

      if (!confirm(confirmMessage)) {
        return
      }
    }

    try {
      const response = await fetch("/api/scheduling/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchRequests()
        setIsDialogOpen(false)
        setFormData({
          clientId: clients[0]?.id || "",
          requestType: "DAY_OFF",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd"),
          reason: "",
          isEmergency: false,
        })

        if (formData.requestType === "SICK_LEAVE" && formData.isEmergency) {
          alert("Ziekmelding verzonden! Vergeet niet de cliënt ook telefonisch te bereiken.")
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

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Geen verlofaanvragen</p>
            <p className="text-sm mt-2">
              Klik op &quot;Nieuwe Aanvraag&quot; om verlof aan te vragen
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className={`border ${getStatusColor(request.status)}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(request.status)}
                      <h3 className="font-semibold">
                        {REQUEST_TYPE_LABELS[request.requestType]}
                      </h3>
                      {request.isEmergency && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Cliënt:</span> {request.client.name}
                      </p>
                      <p>
                        <span className="font-medium">Periode:</span>{" "}
                        {format(request.startDate, "d MMM yyyy", { locale: nl })} -{" "}
                        {format(request.endDate, "d MMM yyyy", { locale: nl })}
                      </p>
                      {request.reason && (
                        <p>
                          <span className="font-medium">Reden:</span> {request.reason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Status: {STATUS_LABELS[request.status]}
                      </p>
                    </div>
                  </div>
                  {request.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(request.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              <Label htmlFor="client">Cliënt</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
