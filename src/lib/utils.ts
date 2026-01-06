import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function truncateText(text: string, maxLength: number = 15): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export type ZipHealthStatus = 'green' | 'yellow' | 'red'

export function calculateZipHealthStatus(
  quotes: number,
  sales: number,
  conversionRate: number
): ZipHealthStatus {
  // Validate inputs
  const safeQuotes = Math.max(0, quotes || 0)
  const safeSales = Math.max(0, sales || 0)
  const safeConversionRate = Math.max(0, conversionRate || 0)
  
  // Red: 8+ quotes with 0 sales
  if (safeQuotes >= 8 && safeSales === 0) {
    return 'red'
  }
  
  // Yellow: 5-9 quotes with 0 sales, OR 10+ quotes with <10% conversion
  if (
    (safeQuotes >= 5 && safeQuotes <= 9 && safeSales === 0) ||
    (safeQuotes >= 10 && safeConversionRate < 10)
  ) {
    return 'yellow'
  }
  
  // Green: >=15% conversion OR <5 quotes (insufficient data)
  if (safeConversionRate >= 15 || safeQuotes < 5) {
    return 'green'
  }
  
  // Default to green (not meeting problem criteria)
  return 'green'
}
