"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns"
import { nl } from "date-fns/locale"

// Register a font that supports Dutch characters
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
})

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
  client?: {
    id: string
    name: string
  } | null
}

interface ShiftType {
  id: string
  name: string
  color: string
}

interface SchedulePdfDocumentProps {
  shifts: Shift[]
  shiftTypes: ShiftType[]
  startDate: Date
  endDate: Date
  clientName?: string
  caregiverId?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: "2pt solid #2563eb",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#374151",
  },
  calendarContainer: {
    marginTop: 15,
  },
  weekHeader: {
    flexDirection: "row",
    borderBottom: "1pt solid #d1d5db",
    paddingBottom: 5,
    marginBottom: 5,
  },
  weekHeaderDay: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 10,
    color: "#4b5563",
  },
  weekRow: {
    flexDirection: "row",
    minHeight: 80,
    borderBottom: "0.5pt solid #e5e7eb",
  },
  dayCell: {
    flex: 1,
    padding: 4,
    borderRight: "0.5pt solid #e5e7eb",
    backgroundColor: "#ffffff",
  },
  dayCellOtherMonth: {
    backgroundColor: "#f9fafb",
  },
  dayCellToday: {
    backgroundColor: "#eff6ff",
  },
  dayNumber: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#374151",
  },
  dayNumberToday: {
    color: "#2563eb",
  },
  shiftItem: {
    marginBottom: 2,
    padding: 2,
    borderRadius: 2,
    fontSize: 7,
  },
  shiftTypeName: {
    fontWeight: "bold",
    color: "#374151",
  },
  shiftTime: {
    fontSize: 6,
    color: "#6b7280",
  },
  caregiverName: {
    fontSize: 6,
    color: "#2563eb",
    marginTop: 1,
  },
  clientName: {
    fontSize: 6,
    color: "#059669",
    marginTop: 1,
    fontWeight: "bold",
  },
  verifiedMark: {
    color: "#16a34a",
    fontSize: 8,
    fontWeight: "bold",
  },
  correctionMark: {
    color: "#ea580c",
    fontSize: 8,
  },
  legend: {
    marginTop: 20,
    padding: 10,
    borderTop: "1pt solid #d1d5db",
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#374151",
  },
  legendRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontSize: 8,
    color: "#6b7280",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
})

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function getShiftBackgroundColor(color: string): string {
  const rgb = hexToRgb(color)
  if (!rgb) return "#f3f4f6"
  // Create a lighter version of the color for background
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
}

function getShiftBorderColor(color: string): string {
  const rgb = hexToRgb(color)
  if (!rgb) return "#9ca3af"
  return color
}

function MonthCalendar({
  monthDate,
  shifts,
  shiftTypes,
  caregiverId,
}: {
  monthDate: Date
  shifts: Shift[]
  shiftTypes: ShiftType[]
  caregiverId?: string
}) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weeks = []

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const getShiftsForDay = (day: Date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.date), day))
  }

  const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]

  return (
    <View style={styles.calendarContainer}>
      <Text style={styles.monthTitle}>
        {format(monthDate, "MMMM yyyy", { locale: nl })}
      </Text>

      {/* Week header */}
      <View style={styles.weekHeader}>
        {dayNames.map((day) => (
          <Text key={day} style={styles.weekHeaderDay}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar weeks */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthDate)
            const isTodayDate = isToday(day)
            const dayShifts = getShiftsForDay(day)

            return (
              <View
                key={day.toISOString()}
                style={{
                  ...styles.dayCell,
                  ...(!isCurrentMonth ? styles.dayCellOtherMonth : {}),
                  ...(isTodayDate ? styles.dayCellToday : {}),
                }}
              >
                <Text
                  style={{
                    ...styles.dayNumber,
                    ...(isTodayDate ? styles.dayNumberToday : {}),
                  }}
                >
                  {format(day, "d")}
                </Text>

                {dayShifts.map((shift) => {
                  // Match on-screen color logic exactly
                  const shiftColor = shift.caregiver
                    ? (caregiverId && shift.caregiver.clientColorPreference
                        ? shift.caregiver.clientColorPreference
                        : shift.shiftType.color)
                    : "#9CA3AF" // Gray for unfilled shifts
                  return (
                  <View
                    key={shift.id}
                    style={[
                      styles.shiftItem,
                      {
                        backgroundColor: getShiftBackgroundColor(shiftColor),
                        borderLeft: `2pt solid ${getShiftBorderColor(shiftColor)}`,
                      },
                    ]}
                  >
                    <Text style={styles.shiftTypeName}>
                      {shift.shiftType.name}
                      {shift.clientVerified && (
                        <Text style={styles.verifiedMark}> ✓✓</Text>
                      )}
                      {shift.timeCorrectionStatus === "PENDING" && (
                        <Text style={styles.correctionMark}> !</Text>
                      )}
                    </Text>
                    <Text style={styles.shiftTime}>
                      {shift.actualStartTime || shift.startTime} -{" "}
                      {shift.actualEndTime || shift.endTime}
                    </Text>
                    {caregiverId ? (
                      shift.client && (
                        <Text style={styles.clientName}>
                          {shift.client.name}
                        </Text>
                      )
                    ) : (
                      shift.caregiver && (
                        <Text style={{
                          fontSize: 6,
                          fontWeight: "bold",
                          marginTop: 1,
                          color: shift.caregiver.color || "#2563eb",
                        }}>
                          {shift.caregiver.name}
                        </Text>
                      )
                    )}
                  </View>
                )})}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

export default function SchedulePdfDocument({
  shifts,
  shiftTypes,
  startDate,
  endDate,
  clientName,
  caregiverId,
}: SchedulePdfDocumentProps) {
  // Group shifts by month
  const months: Date[] = []
  let currentMonth = startOfMonth(startDate)
  const endMonth = startOfMonth(endDate)

  while (currentMonth <= endMonth) {
    months.push(new Date(currentMonth))
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
  }

  return (
    <Document>
      {months.map((month) => (
        <Page key={month.toISOString()} size="A4" orientation="landscape" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rooster</Text>
            <Text style={styles.subtitle}>
              {clientName ? `Cliënt: ${clientName}` : ""}
              {"  |  "}
              Periode: {format(startDate, "d MMMM yyyy", { locale: nl })} -{" "}
              {format(endDate, "d MMMM yyyy", { locale: nl })}
            </Text>
          </View>

          {/* Month Calendar */}
          <MonthCalendar monthDate={month} shifts={shifts} shiftTypes={shiftTypes} caregiverId={caregiverId} />

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Legenda</Text>
            <View style={styles.legendRow}>
              {shiftTypes.map((type) => (
                <View key={type.id} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColor,
                      { backgroundColor: type.color },
                    ]}
                  />
                  <Text style={styles.legendText}>{type.name}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.legendRow, { marginTop: 8 }]}>
              <View style={styles.legendItem}>
                <Text style={[styles.legendText, styles.verifiedMark]}>
                  ✓✓ = Gecontroleerd door cliënt
                </Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={[styles.legendText, styles.correctionMark]}>
                  ! = Tijdcorrectie aangevraagd
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Gegenereerd op {format(new Date(), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
            {"  |  "}Zorgdossier
          </Text>
        </Page>
      ))}
    </Document>
  )
}
