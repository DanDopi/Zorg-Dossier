"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShiftCard } from "./ShiftCard"
import {
  getWeekDays,
  getMonthDays,
  formatWeekRange,
  formatMonthYear,
  formatDayShort,
  formatDayDate,
  nextWeek,
  previousWeek,
  nextMonth,
  previousMonth,
  getDateRangeForWeek,
  getDateRangeForMonth,
  isSameDay,
  isToday,
} from "@/lib/utils/calendar"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  internalNotes?: string | null
  instructionNotes?: string | null
  isPatternOverride: boolean
  clientVerified?: boolean
  timeCorrectionStatus?: string | null
  shiftType: {
    id: string
    name: string
    color: string
  }
  caregiver?: {
    id: string
    name: string
    color?: string | null
    clientColorPreference?: string | null
  } | null
  client?: {
    id: string
    name: string
  }
}

interface ScheduleCalendarInnerProps {
  clientId?: string
  caregiverId?: string
  isReadOnly?: boolean
  onShiftClick?: (shift: Shift) => void
  onDateChange?: (date: Date) => void
  initialDateFromUrl?: string | null
}

function ScheduleCalendarInner({
  clientId,
  caregiverId,
  isReadOnly = false,
  onShiftClick,
  onDateChange,
  initialDateFromUrl,
}: ScheduleCalendarInnerProps) {
  // Initialize with date from URL if provided, otherwise use today's date
  const initialDate = initialDateFromUrl ? new Date(initialDateFromUrl) : new Date()
  // Ensure valid date, fallback to today if invalid
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate
  
  const [view, setView] = useState<"week" | "month">("month")
  const [currentDate, setCurrentDate] = useState(validInitialDate)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchShifts()
  }, [currentDate, view, clientId, caregiverId])

  useEffect(() => {
    onDateChange?.(currentDate)
  }, [currentDate])

  const fetchShifts = async () => {
    setIsLoading(true)
    try {
      const range =
        view === "week"
          ? getDateRangeForWeek(currentDate)
          : getDateRangeForMonth(currentDate)

      const params = new URLSearchParams({
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      })

      if (clientId) params.append("clientId", clientId)
      if (caregiverId) params.append("caregiverId", caregiverId)

      const response = await fetch(`/api/scheduling/shifts?${params}`)
      if (response.ok) {
        const data = await response.json()
        // Convert date strings to Date objects
        const shiftsWithDates = (data as Array<Record<string, unknown>>).map((shift) => ({
          ...shift,
          date: new Date(shift.date as string),
        }))
        setShifts(shiftsWithDates as Shift[])
      }
    } catch (error) {
      console.error("Error fetching shifts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrevious = () => {
    setCurrentDate(view === "week" ? previousWeek(currentDate) : previousMonth(currentDate))
  }

  const handleNext = () => {
    setCurrentDate(view === "week" ? nextWeek(currentDate) : nextMonth(currentDate))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getShiftsForDay = (day: Date) => {
    return shifts.filter((shift) => isSameDay(shift.date, day))
  }

  const renderWeekView = () => {
    const days = getWeekDays(currentDate)

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {days.map((day) => {
          const dayShifts = getShiftsForDay(day)
          const today = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`bg-white min-h-[200px] p-3 ${
                today ? "bg-blue-50" : ""
              }`}
            >
              <div className="mb-3">
                <div className="text-xs text-gray-600 font-medium">
                  {formatDayShort(day)}
                </div>
                <div
                  className={`text-lg font-bold ${
                    today ? "text-blue-600" : "text-gray-900"
                  }`}
                >
                  {formatDayDate(day)}
                </div>
              </div>

              <div className="space-y-2">
                {dayShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onClick={() => onShiftClick?.(shift)}
                    isReadOnly={isReadOnly}
                    caregiverId={caregiverId}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMonthView = () => {
    const days = getMonthDays(currentDate)
    const weeks = []

    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }

    return (
      <div className="space-y-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
            <div
              key={day}
              className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px bg-gray-200">
            {week.map((day) => {
              const dayShifts = getShiftsForDay(day)
              const today = isToday(day)
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 ${
                    today ? "bg-blue-50" : !isCurrentMonth ? "bg-gray-100" : "bg-white"
                  } ${!isCurrentMonth ? "opacity-30" : ""}`}
                >
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      today ? "text-blue-600" : !isCurrentMonth ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {formatDayDate(day)}
                  </div>

                  <div className="space-y-1">
                    {dayShifts.slice(0, 3).map((shift) => {
                      const shiftDate = new Date(shift.date)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      shiftDate.setHours(0, 0, 0, 0)
                      const isPastShift = shiftDate < today

                      return (
                        <div
                          key={shift.id}
                          className="text-xs p-1 rounded cursor-pointer hover:opacity-80 relative"
                          style={{
                            backgroundColor: shift.caregiver
                              ? (caregiverId && shift.caregiver.clientColorPreference
                                  ? shift.caregiver.clientColorPreference
                                  : shift.shiftType.color)
                              : "#9CA3AF",
                            color: "#FFFFFF",
                          }}
                          onClick={() => onShiftClick?.(shift)}
                        >
                          <div className="font-medium">{shift.shiftType.name}</div>
                          <div className="text-[10px] opacity-90">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          {caregiverId ? (
                            shift.client && (
                              <div className="text-[10px] opacity-90 mt-0.5">
                                {shift.client.name}
                              </div>
                            )
                          ) : (
                            shift.caregiver && (
                              <div
                                className="text-xs font-semibold mt-1 px-1.5 py-0.5 rounded inline-block"
                                style={{
                                  backgroundColor: shift.caregiver.color
                                    ? `${shift.caregiver.color}40`
                                    : "rgba(255,255,255,0.25)",
                                  border: shift.caregiver.color
                                    ? `1.5px solid ${shift.caregiver.color}`
                                    : undefined,
                                }}
                              >
                                {shift.caregiver.name}
                              </div>
                            )
                          )}
                          {shift.timeCorrectionStatus === "PENDING" && (
                            <span
                              className="absolute top-0.5 left-0.5 inline-flex h-2 w-2"
                              title="Tijdcorrectie aangevraagd"
                            >
                              <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                          )}
                          {shift.timeCorrectionStatus === "ACKNOWLEDGED" && (
                            <span
                              className="absolute top-0.5 left-0.5 inline-flex h-2 w-2"
                              title="Tijdcorrectie verwerkt"
                            >
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          )}
                          {(shift.status === "COMPLETED" || isPastShift) && (
                            <div className={`absolute top-0.5 right-0.5 font-bold text-xs ${
                              shift.clientVerified
                                ? "text-green-300"
                                : "text-white opacity-70"
                            }`}>
                              {shift.clientVerified ? "✓✓" : "✓"}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {dayShifts.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayShifts.length - 3} meer
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                <CalendarIcon className="h-4 w-4 mr-1" />
                Vandaag
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-lg font-semibold">
              {view === "week"
                ? formatWeekRange(currentDate)
                : formatMonthYear(currentDate)}
            </div>

            <div className="flex gap-2">
              <Button
                variant={view === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("week")}
              >
                Week
              </Button>
              <Button
                variant={view === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("month")}
              >
                Maand
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>Laden...</p>
          </CardContent>
        </Card>
      ) : (
        <>{view === "week" ? renderWeekView() : renderMonthView()}</>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 border-2 border-dashed border-gray-600 rounded"></div>
          <span>Niet ingevuld</span>
        </div>
        <div className="flex items-center gap-2">
          <span>✓</span>
          <span>Voltooid</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-bold">✓✓</span>
          <span>Gecontroleerd door cliënt</span>
        </div>
      </div>
    </div>
  )
}

interface ScheduleCalendarProps {
  clientId?: string
  caregiverId?: string
  isReadOnly?: boolean
  onShiftClick?: (shift: Shift) => void
  onDateChange?: (date: Date) => void
}

function ScheduleCalendarWithUrlParams({
  clientId,
  caregiverId,
  isReadOnly = false,
  onShiftClick,
  onDateChange,
}: ScheduleCalendarProps) {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  
  return (
    <ScheduleCalendarInner
      clientId={clientId}
      caregiverId={caregiverId}
      isReadOnly={isReadOnly}
      onShiftClick={onShiftClick}
      onDateChange={onDateChange}
      initialDateFromUrl={dateParam}
    />
  )
}

export default function ScheduleCalendar(props: ScheduleCalendarProps) {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Kalender laden...</p>
        </CardContent>
      </Card>
    }>
      <ScheduleCalendarWithUrlParams {...props} />
    </Suspense>
  )
}
