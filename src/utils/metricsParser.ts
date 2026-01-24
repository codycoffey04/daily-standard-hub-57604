/**
 * Parser for AgencyZoom weekly production data
 *
 * Expected paste format (tab-separated from AgencyZoom):
 * Producer  QHH  Quotes  Sales  Items  Premium  Close Rate
 * Maria     23   32      2      8      4217.69  8.7%
 * Kimberly  18   27      0      0      0        0%
 */

export interface ProducerMetrics {
  qhh: number
  quotes: number
  sales: number
  items: number
  premium: number
  close_rate: number
}

export interface ParsedMetrics {
  producers: Record<string, ProducerMetrics>
  team: {
    qhh: number
    quotes: number
    sales: number
    items: number
    premium: number
    close_rate: number
  }
}

export interface ParseResult {
  success: boolean
  data?: ParsedMetrics
  error?: string
}

// Known producer name mappings (lowercase key -> display name)
const PRODUCER_NAMES: Record<string, string> = {
  'maria': 'maria',
  'maria rocha-guzman': 'maria',
  'maria rocha': 'maria',
  'kimberly': 'kimberly',
  'kimberly fletcher': 'kimberly',
  'kim': 'kimberly'
}

function normalizeProducerName(name: string): string | null {
  const lower = name.toLowerCase().trim()
  return PRODUCER_NAMES[lower] || null
}

function parseNumber(value: string): number {
  // Remove currency symbols, commas, percent signs
  const cleaned = value.replace(/[$,%]/g, '').replace(/,/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function parseAgencyZoomMetrics(rawPaste: string): ParseResult {
  if (!rawPaste || rawPaste.trim() === '') {
    return { success: false, error: 'No data provided' }
  }

  const lines = rawPaste.trim().split('\n').filter(line => line.trim() !== '')

  if (lines.length < 2) {
    return { success: false, error: 'Data must include a header row and at least one producer row' }
  }

  // Try to detect delimiter (tab or multiple spaces)
  const delimiter = lines[0].includes('\t') ? '\t' : /\s{2,}/

  // Parse header to find column indices
  const headerParts = lines[0].split(delimiter).map(h => h.toLowerCase().trim())

  const columnMap: Record<string, number> = {}
  const columnNames = ['producer', 'name', 'qhh', 'quotes', 'sales', 'items', 'premium', 'close rate', 'close_rate', 'closerate']

  headerParts.forEach((header, index) => {
    // Match various column name patterns
    if (header.includes('producer') || header === 'name' || header === 'agent') {
      columnMap['producer'] = index
    } else if (header.includes('qhh') || header.includes('quoted household')) {
      columnMap['qhh'] = index
    } else if (header === 'quotes' || header.includes('quote')) {
      columnMap['quotes'] = index
    } else if (header === 'sales' || header === 'sold') {
      columnMap['sales'] = index
    } else if (header === 'items' || header.includes('item')) {
      columnMap['items'] = index
    } else if (header.includes('premium') || header === 'p') {
      columnMap['premium'] = index
    } else if (header.includes('close') || header.includes('rate')) {
      columnMap['close_rate'] = index
    }
  })

  // Validate required columns
  if (columnMap['producer'] === undefined) {
    // Try first column as producer name
    columnMap['producer'] = 0
  }

  const producers: Record<string, ProducerMetrics> = {}
  const errors: string[] = []

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map(p => p.trim())

    if (parts.length < 2) continue

    const rawName = parts[columnMap['producer']] || ''
    const producerKey = normalizeProducerName(rawName)

    if (!producerKey) {
      // Skip unrecognized names (might be totals row)
      if (!rawName.toLowerCase().includes('total') && !rawName.toLowerCase().includes('team')) {
        errors.push(`Unrecognized producer: ${rawName}`)
      }
      continue
    }

    const metrics: ProducerMetrics = {
      qhh: columnMap['qhh'] !== undefined ? parseNumber(parts[columnMap['qhh']] || '0') : 0,
      quotes: columnMap['quotes'] !== undefined ? parseNumber(parts[columnMap['quotes']] || '0') : 0,
      sales: columnMap['sales'] !== undefined ? parseNumber(parts[columnMap['sales']] || '0') : 0,
      items: columnMap['items'] !== undefined ? parseNumber(parts[columnMap['items']] || '0') : 0,
      premium: columnMap['premium'] !== undefined ? parseNumber(parts[columnMap['premium']] || '0') : 0,
      close_rate: columnMap['close_rate'] !== undefined ? parseNumber(parts[columnMap['close_rate']] || '0') : 0
    }

    producers[producerKey] = metrics
  }

  if (Object.keys(producers).length === 0) {
    return {
      success: false,
      error: errors.length > 0 ? errors.join('; ') : 'No valid producer data found. Check the format matches AgencyZoom export.'
    }
  }

  // Calculate team totals
  const team = {
    qhh: 0,
    quotes: 0,
    sales: 0,
    items: 0,
    premium: 0,
    close_rate: 0
  }

  Object.values(producers).forEach(p => {
    team.qhh += p.qhh
    team.quotes += p.quotes
    team.sales += p.sales
    team.items += p.items
    team.premium += p.premium
  })

  // Calculate team close rate
  team.close_rate = team.quotes > 0 ? (team.sales / team.quotes) * 100 : 0

  return {
    success: true,
    data: {
      producers,
      team
    }
  }
}

/**
 * Format premium as currency string
 */
export function formatPremium(premium: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(premium)
}

/**
 * Format close rate as percentage string
 */
export function formatCloseRate(rate: number): string {
  return `${rate.toFixed(1)}%`
}
