"use client"

import { useState, useEffect } from "react"
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
  shiftType: {
    id: string
    name: string
    color: string
  }
  caregiver?: {
    id: string
    name: string
    color?: string | null
  } | null
  client?: {
    id: string
    name: string
  }
}

interface ScheduleCalendarProps {
  clientId?: string
  caregiverId?: string
  isReadOnly?: boolean
  onShiftClick?: (shift: Shift) => void
}

export default function ScheduleCalendar({
  clientId,
  caregiverId,
  isReadOnly = false,
  onShiftClick,
}: ScheduleCalendarProps) {
  const [view, setView] = useState<"week" | "month">("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchShifts()
  }, [currentDate, view, clientId, caregiverId])

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
                  className={`bg-white min-h-[120px] p-2 ${
                    today ? "bg-blue-50" : ""
                  } ${!isCurrentMonth ? "opacity-50" : ""}`}
                >
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      today ? "text-blue-600" : "text-gray-900"
                    }`}
                  >
                    {formatDayDate(day)}
                  </div>

                  <div className="space-y-1">
                    {dayShifts.slice(0, 3).map((shift) => (
                      <div
                        key={shift.id}
                        className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: shift.caregiver?.color || "#E5E7EB",
                          color: shift.caregiver?.color
                            ? "#FFFFFF"
                            : "#000000",
                        }}
                        onClick={() => onShiftClick?.(shift)}
                      >
                        {shift.shiftType.name}
                      </div>
                    ))}
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
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border-2 border-dashed border-gray-400 rounded"></div>
          <span>Niet ingevuld</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Ingevuld</span>
        </div>
        <div className="flex items-center gap-2">
          <span>✓</span>
          <span>Voltooid</span>
        </div>
      </div>
    </div>
  )
}
