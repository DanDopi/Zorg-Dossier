"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface TimeOffNotification {
  id: string
  requestType: "DAY_OFF" | "SICK_LEAVE" | "VACATION"
  startDate: Date
  endDate: Date
  status: "PENDING" | "APPROVED" | "DENIED"
  isEmergency: boolean
  reason?: string | null
  reviewNotes?: string | null
  createdAt: Date
  caregiver?: {
    id: string
    name: string
    color?: string | null
  }
  client?: {
    id: string
    name: string
  }
}

interface TimeOffNotificationPanelProps {
  role: "CLIENT" | "CAREGIVER"
  notifications: TimeOffNotification[]
  onApprove?: (id: string) => Promise<void>
  onDeny?: (id: string, reviewNotes: string) => Promise<void>
  onDismiss?: (id: string) => void
  isLoading?: boolean
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

export function TimeOffNotificationPanel({
  role,
  notifications,
  onApprove,
  onDeny,
  onDismiss,
  isLoading = false,
}: TimeOffNotificationPanelProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string>("")
  const [reviewNotes, setReviewNotes] = useState("")

  const handleApprove = async (id: string) => {
    if (!onApprove) return
    setProcessingId(id)
    try {
      await onApprove(id)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeny = (id: string) => {
    setSelectedRequestId(id)
    setReviewNotes("")
    setIsDenyDialogOpen(true)
  }

  const handleDenyConfirm = async () => {
    if (!reviewNotes.trim()) {
      alert("Geef een reden voor afwijzing op")
      return
    }

    if (!onDeny) return

    setProcessingId(selectedRequestId)
    try {
      await onDeny(selectedRequestId, reviewNotes.trim())
      setIsDenyDialogOpen(false)
      setReviewNotes("")
      setSelectedRequestId("")
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <>
    <Card className="mb-6 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          {role === "CLIENT" ? "Verlofaanvragen" : "Verlofstatus Updates"}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {notifications.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {role === "CLIENT" ? (
          // CLIENT VIEW: Show pending requests and recent sick leave
          <>
            {notifications.map((notification) => {
              const isEmergency = notification.isEmergency
              const isPending = notification.status === "PENDING"

              return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border-2 ${
                    isEmergency
                      ? "border-red-500 bg-red-50"
                      : isPending
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-green-200 bg-green-50"
                  }`}
                >
                  {/* Header with caregiver name and type */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {notification.caregiver && (
                          <span
                            className="inline-flex items-center gap-1 font-semibold text-sm"
                            style={{ color: notification.caregiver.color || undefined }}
                          >
                            {notification.caregiver.color && (
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: notification.caregiver.color }}
                              />
                            )}
                            {notification.caregiver.name}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm font-medium">
                          {REQUEST_TYPE_LABELS[notification.requestType]}
                        </span>
                        {isEmergency && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(notification.startDate, "d MMM", { locale: nl })} -{" "}
                        {format(notification.endDate, "d MMM yyyy", { locale: nl })}
                      </p>
                    </div>
                    {!isPending && (
                      <div className="flex items-center gap-1">
                        {notification.status === "APPROVED" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  {notification.reason && (
                    <p className="text-sm text-gray-700 mb-3 italic">{notification.reason}</p>
                  )}

                  {/* Action buttons for pending requests */}
                  {isPending && onApprove && onDeny && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(notification.id)}
                        disabled={processingId === notification.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {processingId === notification.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Goedkeuren"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeny(notification.id)}
                        disabled={processingId === notification.id}
                        className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                      >
                        Afwijzen
                      </Button>
                    </div>
                  )}

                  {/* Status for non-pending requests */}
                  {!isPending && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {STATUS_LABELS[notification.status]} ·{" "}
                      {format(notification.createdAt, "d MMM HH:mm", { locale: nl })}
                    </p>
                  )}
                </div>
              )
            })}
          </>
        ) : (
          // CAREGIVER VIEW: Show recent approved/denied decisions
          <>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border-2 ${
                  notification.status === "APPROVED"
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                {/* Header with client name and status */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {notification.client?.name}
                      </span>
                      <span className="text-sm text-muted-foreground">·</span>
                      <span className="text-sm font-medium">
                        {REQUEST_TYPE_LABELS[notification.requestType]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(notification.startDate, "d MMM", { locale: nl })} -{" "}
                      {format(notification.endDate, "d MMM yyyy", { locale: nl })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {notification.status === "APPROVED" ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Goedgekeurd</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-700">Afgewezen</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Date */}
                <p className="text-xs text-muted-foreground">
                  Besluit op {format(notification.createdAt, "d MMM HH:mm", { locale: nl })}
                </p>

                {/* Rejection Reason */}
                {notification.status === "DENIED" && notification.reviewNotes && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                    <p className="text-xs font-semibold text-red-900 mb-1">Reden van afwijzing:</p>
                    <p className="text-sm text-red-800">{notification.reviewNotes}</p>
                  </div>
                )}

                {/* Dismiss button */}
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismiss(notification.id)}
                    className="mt-2 text-xs h-7 px-2"
                  >
                    Verwijderen
                  </Button>
                )}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>

    {/* Deny Request Dialog */}
    <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verlofaanvraag Afwijzen</DialogTitle>
          <DialogDescription>
            Geef een reden op waarom u deze aanvraag afwijst. De zorgverlener ontvangt deze informatie per email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reviewNotes">Reden van afwijzing *</Label>
            <Textarea
              id="reviewNotes"
              placeholder="Bijv. Deze periode past niet in de planning, vervanging niet beschikbaar..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              required
            />
            <p className="text-sm text-muted-foreground">
              Deze reden wordt per email naar de zorgverlener gestuurd.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsDenyDialogOpen(false)
              setReviewNotes("")
              setSelectedRequestId("")
            }}
          >
            Annuleren
          </Button>
          <Button
            type="button"
            onClick={handleDenyConfirm}
            disabled={processingId === selectedRequestId}
            className="bg-red-600 hover:bg-red-700"
          >
            {processingId === selectedRequestId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Afwijzen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}
