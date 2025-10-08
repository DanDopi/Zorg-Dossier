import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
  isSameDay,
  isToday,
  startOfDay,
} from "date-fns"
import { nl } from "date-fns/locale"

export function getWeekDays(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 })

  return eachDayOfInterval({ start, end })
}

export function getMonthDays(date: Date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)

  // Get full weeks
  const weekStart = startOfWeek(start, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(end, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

export function formatWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })

  return `${format(start, "d MMM", { locale: nl })} - ${format(end, "d MMM yyyy", { locale: nl })}`
}

export function formatMonthYear(date: Date) {
  return format(date, "MMMM yyyy", { locale: nl })
}

export function formatDayShort(date: Date) {
  return format(date, "EEE", { locale: nl })
}

export function formatDayDate(date: Date) {
  return format(date, "d", { locale: nl })
}

export function formatFullDate(date: Date) {
  return format(date, "d MMMM yyyy", { locale: nl })
}

export function nextWeek(date: Date) {
  return addWeeks(date, 1)
}

export function previousWeek(date: Date) {
  return subWeeks(date, 1)
}

export function nextMonth(date: Date) {
  return addMonths(date, 1)
}

export function previousMonth(date: Date) {
  return subMonths(date, 1)
}

export function getDateRangeForWeek(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })

  return {
    start: startOfDay(start),
    end: startOfDay(end),
  }
}

export function getDateRangeForMonth(date: Date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)

  // Expand to full weeks
  const weekStart = startOfWeek(start, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(end, { weekStartsOn: 1 })

  return {
    start: startOfDay(weekStart),
    end: startOfDay(weekEnd),
  }
}

export { isSameDay, isToday, startOfDay }
