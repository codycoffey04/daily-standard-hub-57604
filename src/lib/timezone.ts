import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const CT_TIMEZONE = 'America/Chicago'

export const today = () => dayjs().tz(CT_TIMEZONE).format('YYYY-MM-DD')
export const yesterday = () => dayjs().tz(CT_TIMEZONE).subtract(1, 'day').format('YYYY-MM-DD')

export const formatCTDate = (date: string) => {
  return dayjs(date).tz(CT_TIMEZONE).format('M/D/YYYY')
}

export const formatCTDateTime = (date: string) => {
  return dayjs(date).tz(CT_TIMEZONE).format('M/D/YYYY h:mm A')
}

export const isToday = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD') === today()
}

export const isPast6PM = (date: string) => {
  // Parse the date string (YYYY-MM-DD) and set it to 6 PM CT
  // dayjs needs to parse the date in CT timezone to avoid timezone conversion issues
  const dateOnly = date.split('T')[0] // Ensure we only have YYYY-MM-DD
  const lockTime = dayjs.tz(`${dateOnly} 18:00:00`, 'YYYY-MM-DD HH:mm:ss', CT_TIMEZONE)
  const now = dayjs().tz(CT_TIMEZONE)
  return now.isAfter(lockTime)
}

export const getDefaultEntryDate = () => {
  const ctNow = dayjs().tz(CT_TIMEZONE)
  const ctDate = ctNow.format('YYYY-MM-DD')
  
  // Special case for go-live day 2025-09-03, default to 2025-09-02
  if (ctDate === '2025-09-03') {
    return '2025-09-02'
  }
  
  return ctDate
}