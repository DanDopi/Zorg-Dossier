"use client"

import { useState, useEffect } from "react"
import { PDFDownloadLink } from "@react-pdf/renderer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileDown, Loader2 } from "lucide-react"
import SchedulePdfDocument from "./SchedulePdfDocument"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  subMonths,
  addMonths,
} from "date-fns"
import { nl } from "date-fns/locale"

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  actualStartTime?: string | null
  actualEndTime?: string | null
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
}

interface ShiftType {
  id: string
  name: string
  color: string
}

interface PdfDownloadDialogProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  shiftTypes: ShiftType[]
  clientName?: string
  caregiverId?: string
  currentDate?: Date
}

type DownloadOption = "current" | "specific" | "custom"

export default function PdfDownloadDialog({
  isOpen,
  onClose,
  clientId,
  shiftTypes,
  clientName,
  caregiverId,
  currentDate: propCurrentDate,
}: PdfDownloadDialogProps) {
  const initialDate = propCurrentDate || new Date()
  const [option, setOption] = useState<DownloadOption>("current")
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(initialDate, "yyyy-MM")
  )
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(startOfMonth(initialDate), "yyyy-MM-dd")
  )
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(endOfMonth(initialDate), "yyyy-MM-dd")
  )
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate month options (last 12 months + next 3)
  const monthOptions = []
  const referenceDate = initialDate
  for (let i = -12; i <= 3; i++) {
    const date = addMonths(referenceDate, i)
    monthOptions.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: nl }),
    })
  }

  useEffect(() => {
    if (isOpen) {
      fetchShiftsForRange()
    }
  }, [isOpen, option, selectedMonth, customStartDate, customEndDate])

  const getDateRange = () => {
    switch (option) {
      case "current":
        return {
          start: startOfMonth(initialDate),
          end: endOfMonth(initialDate),
        }
      case "specific":
        const [year, month] = selectedMonth.split("-").map(Number)
        const specificDate = new Date(year, month - 1, 1)
        return {
          start: startOfMonth(specificDate),
          end: endOfMonth(specificDate),
        }
      case "custom":
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate),
        }
      default:
        return {
          start: startOfMonth(initialDate),
          end: endOfMonth(initialDate),
        }
    }
  }

  const fetchShiftsForRange = async () => {
    setIsLoading(true)
    try {
      const range = getDateRange()
      
      // Adjust to include full weeks for calendar display
      const adjustedStart = startOfWeek(range.start, { weekStartsOn: 1 })
      const adjustedEnd = endOfWeek(range.end, { weekStartsOn: 1 })

      const params = new URLSearchParams({
        startDate: adjustedStart.toISOString(),
        endDate: adjustedEnd.toISOString(),
      })
      
      // For caregivers: fetch all shifts for this caregiver across all clients
      // For clients: fetch all shifts for this client
      if (caregiverId) {
        params.append("caregiverId", caregiverId)
      } else {
        params.append("clientId", clientId)
      }

      const response = await fetch(`/api/scheduling/shifts?${params}`)
      if (response.ok) {
        const data = await response.json()
        const shiftsWithDates = data.map((shift: Record<string, unknown>) => ({
          ...shift,
          date: new Date(shift.date as string),
        }))
        setShifts(shiftsWithDates)
      }
    } catch (error) {
      console.error("Error fetching shifts for PDF:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFileName = () => {
    const range = getDateRange()
    const startStr = format(range.start, "yyyy-MM", { locale: nl })
    const endStr = format(range.end, "yyyy-MM", { locale: nl })
    if (startStr === endStr) {
      return `rooster-${startStr}.pdf`
    }
    return `rooster-${startStr}-tot-${endStr}.pdf`
  }

  const range = getDateRange()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Rooster downloaden als PDF
          </DialogTitle>
          <DialogDescription>
            Selecteer de periode die u wilt exporteren naar PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Download Options */}
          <RadioGroup
            value={option}
            onValueChange={(value) => setOption(value as DownloadOption)}
            className="space-y-3"
          >
            {/* Current Month */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="current" id="current" />
              <div className="flex-1">
                <Label htmlFor="current" className="font-medium cursor-pointer">
                  Huidige maand (weergave)
                </Label>
                <p className="text-sm text-muted-foreground">
                  {format(initialDate, "MMMM yyyy", { locale: nl })}
                </p>
              </div>
            </div>

            {/* Specific Month */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="specific" id="specific" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="specific" className="font-medium cursor-pointer">
                  Specifieke maand
                </Label>
                {option === "specific" && (
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Custom Range */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="custom" id="custom" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="custom" className="font-medium cursor-pointer">
                  Aangepaste periode
                </Label>
                {option === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="start-date" className="text-xs">
                        Vanaf
                      </Label>
                      <input
                        type="date"
                        id="start-date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="end-date" className="text-xs">
                        Tot
                      </Label>
                      <input
                        type="date"
                        id="end-date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Summary */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Geselecteerde periode:</p>
            <p className="text-muted-foreground">
              {format(range.start, "d MMMM yyyy", { locale: nl })} -{" "}
              {format(range.end, "d MMMM yyyy", { locale: nl })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {shifts.length} dienst{shifts.length !== 1 ? "en" : ""} gevonden
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>

          {isLoading || shifts.length === 0 ? (
            <Button disabled>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Laden...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          ) : (
            <PDFDownloadLink
              document={
                <SchedulePdfDocument
                  shifts={shifts}
                  shiftTypes={shiftTypes}
                  startDate={range.start}
                  endDate={range.end}
                  clientName={clientName}
                  caregiverId={caregiverId}
                />
              }
              fileName={getFileName()}
              onClick={() => setIsGenerating(true)}
            >
              {({ loading }) => (
                <Button disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Genereren...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
