"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ScheduleCalendar from "./ScheduleCalendar"
import TimeOffRequest from "./TimeOffRequest"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatFullDate } from "@/lib/utils/calendar"
import { Calendar, Clock, FileText } from "lucide-react"

interface Client {
  id: string
  name: string
}

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  internalNotes?: string | null
  instructionNotes?: string | null
  shiftType: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

interface MijnRoosterClientProps {
  caregiverId: string
  clients: Client[]
}

export default function MijnRoosterClient({
  caregiverId,
  clients,
}: MijnRoosterClientProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("all")
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([])

  useEffect(() => {
    fetchUpcomingShifts()
  }, [caregiverId])

  const fetchUpcomingShifts = async () => {
    try {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const params = new URLSearchParams({
        caregiverId,
        startDate: today.toISOString(),
        endDate: nextWeek.toISOString(),
      })

      const response = await fetch(`/api/scheduling/shifts?${params}`)
      if (response.ok) {
        const data = await response.json()
        const shiftsWithDates = (data as Shift[]).map((shift) => ({
          ...shift,
          date: new Date(shift.date as unknown as string),
        }))
        setUpcomingShifts(shiftsWithDates.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching upcoming shifts:", error)
    }
  }

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift)
    setIsModalOpen(true)
  }

  const filteredCaregiverId =
    selectedClientId === "all" ? caregiverId : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mijn Rooster</h1>
        <p className="text-muted-foreground mt-2">
          Bekijk uw ingeplande diensten
        </p>
      </div>

      {/* Filter */}
      {clients.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Filter per cliënt:</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle cliënten</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Schedule and Time-off */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Rooster</TabsTrigger>
          <TabsTrigger value="timeoff">Verlof & Ziekmeldingen</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          {/* Upcoming Shifts */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Aankomende Diensten
          </CardTitle>
          <CardDescription>Uw diensten voor de komende 7 dagen</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingShifts.length === 0 ? (
            <p className="text-muted-foreground">
              Geen aankomende diensten ingepland
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => handleShiftClick(shift)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-white rounded-lg border">
                      <div className="text-xs text-muted-foreground">
                        {shift.date.toLocaleDateString("nl-NL", {
                          month: "short",
                        })}
                      </div>
                      <div className="text-lg font-bold">
                        {shift.date.getDate()}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">{shift.shiftType.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {shift.client?.name || "Onbekend"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {shift.startTime} - {shift.endTime}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

          {/* Calendar */}
          <ScheduleCalendar
            caregiverId={filteredCaregiverId || caregiverId}
            isReadOnly
            onShiftClick={handleShiftClick}
          />
        </TabsContent>

        <TabsContent value="timeoff">
          <TimeOffRequest caregiverId={caregiverId} clients={clients} />
        </TabsContent>
      </Tabs>

      {/* Shift Detail Modal */}
      {selectedShift && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dienst Details</DialogTitle>
              <DialogDescription>
                {formatFullDate(selectedShift.date)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Cliënt
                  </label>
                  <p className="text-base mt-1">{selectedShift.client?.name || "Onbekend"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Diensttype
                  </label>
                  <p className="text-base mt-1">
                    {selectedShift.shiftType.name}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tijd
                </label>
                <p className="text-base mt-1">
                  {selectedShift.startTime} - {selectedShift.endTime}
                </p>
              </div>

              {selectedShift.instructionNotes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Instructies
                  </label>
                  <p className="text-base mt-1 whitespace-pre-wrap">
                    {selectedShift.instructionNotes}
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Let op:</strong> Neem bij vragen of problemen contact
                  op met uw cliënt.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
