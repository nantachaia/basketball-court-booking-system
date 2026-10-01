const BOOKING_TIME_ZONE = 'Asia/Bangkok'

const datePartFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOOKING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dateTimePartFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BOOKING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partsToRecord(parts: Intl.DateTimeFormatPart[]) {
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value])) as Record<string, string>
}

export function getBookingDateKey(date = new Date()) {
  const parts = partsToRecord(datePartFormatter.formatToParts(date))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function getBookingDateWindow(date = new Date()) {
  const today = getBookingDateKey(date)
  const tomorrowDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  const tomorrow = getBookingDateKey(tomorrowDate)
  return { today, tomorrow }
}

export function isValidCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isAllowedBookingDate(value: string, now = new Date()) {
  if (!isValidCalendarDate(value)) return false
  const { today, tomorrow } = getBookingDateWindow(now)
  return value === today || value === tomorrow
}

export function getBookingNowParts(date = new Date()) {
  const parts = partsToRecord(dateTimePartFormatter.formatToParts(date))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

export function getBookingStatus(date: string, startTime: string, endTime: string, status: string, now = new Date()) {
  if (status === 'cancelled') return 'completed' as const
  const current = getBookingNowParts(now)
  if (date < current.date) return 'completed' as const
  if (date > current.date) return 'upcoming' as const
  const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5))
  const endMinutes = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5))
  return current.minutes >= endMinutes ? 'completed' as const : current.minutes >= startMinutes ? 'in-use' as const : 'upcoming' as const
}

export function formatBookingDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: BOOKING_TIME_ZONE }).format(new Date(`${value}T00:00:00.000Z`))
}

export { BOOKING_TIME_ZONE }
