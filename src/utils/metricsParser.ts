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

/**
 * Parser for AgencyZoom CSV export
 *
 * CSV Format:
 * Producer,Items,Premium,L&H Premium,Policies,Sales,Points,Revenue
 * Total,31,"$19,885",0,15,12,320,"$1,790"
 * Kimberly Fletcher,18,"$11,088",0,8,6,185,$998
 *
 * Column mapping:
 * - Policies → qhh (Quoted Households)
 * - Items → items
 * - Premium → premium
 * - Sales → sales
 * - Close Rate = calculated as (Sales / Policies) * 100
 * - L&H Premium, Points, Revenue → ignored
 */
export function parseAgencyZoomCSV(csvContent: string): ParseResult {
  if (!csvContent || csvContent.trim() === '') {
    return { success: false, error: 'No CSV data provided' }
  }

  const lines = csvContent.trim().split('\n').filter(line => line.trim() !== '')

  if (lines.length < 2) {
    return { success: false, error: 'CSV must include a header row and at least one data row' }
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

  // Find column indices
  const columnMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    if (header === 'producer' || header === 'name' || header === 'agent') {
      columnMap['producer'] = index
    } else if (header === 'items' || header === 'item') {
      columnMap['items'] = index
    } else if (header === 'premium' && !header.includes('l&h')) {
      columnMap['premium'] = index
    } else if (header === 'policies' || header === 'policy') {
      columnMap['qhh'] = index // Policies maps to QHH
    } else if (header === 'sales' || header === 'sold') {
      columnMap['sales'] = index
    }
  })

  // Validate required columns
  if (columnMap['producer'] === undefined) {
    columnMap['producer'] = 0 // Default to first column
  }

  const producers: Record<string, ProducerMetrics> = {}
  const errors: string[] = []

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    if (values.length < 2) continue

    const rawName = values[columnMap['producer']] || ''
    const producerKey = normalizeProducerName(rawName)

    if (!producerKey) {
      // Skip "Total" row and unrecognized names
      if (!rawName.toLowerCase().includes('total') && !rawName.toLowerCase().includes('team')) {
        errors.push(`Unrecognized producer: ${rawName}`)
      }
      continue
    }

    const qhh = columnMap['qhh'] !== undefined ? parseNumber(values[columnMap['qhh']] || '0') : 0
    const sales = columnMap['sales'] !== undefined ? parseNumber(values[columnMap['sales']] || '0') : 0

    const metrics: ProducerMetrics = {
      qhh,
      quotes: qhh, // In this context, qhh and quotes are the same
      sales,
      items: columnMap['items'] !== undefined ? parseNumber(values[columnMap['items']] || '0') : 0,
      premium: columnMap['premium'] !== undefined ? parseNumber(values[columnMap['premium']] || '0') : 0,
      close_rate: qhh > 0 ? (sales / qhh) * 100 : 0
    }

    producers[producerKey] = metrics
  }

  if (Object.keys(producers).length === 0) {
    return {
      success: false,
      error: errors.length > 0 ? errors.join('; ') : 'No valid producer data found in CSV'
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

  team.close_rate = team.qhh > 0 ? (team.sales / team.qhh) * 100 : 0

  return {
    success: true,
    data: {
      producers,
      team
    }
  }
}

/**
 * Parse a single CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

// ============================================================================
// LEAD SOURCE CSV PARSER
// ============================================================================

/**
 * Lead source metrics from AgencyZoom
 */
export interface LeadSourceMetrics {
  source_name_raw: string
  items: number
  premium: number
  policies: number
  sales: number
  points: number
}

/**
 * Parsed lead source data with source mappings applied
 */
export interface ParsedLeadSourceMetrics {
  sources: LeadSourceMetrics[]
  team: {
    items: number
    premium: number
    policies: number
    sales: number
    points: number
  }
}

export interface LeadSourceParseResult {
  success: boolean
  data?: ParsedLeadSourceMetrics
  error?: string
}

/**
 * Source mapping configuration
 * Maps raw AgencyZoom source names to display names with CSR attribution
 */
export interface SourceMapping {
  raw_names: string[]
  mapped_name: string  // Display name in emails
  is_csr: boolean
  attributed_to?: string
}

/**
 * Apply source mappings to normalize source names
 */
export function applySourceMapping(
  rawName: string,
  mappings: SourceMapping[]
): { mapped_name: string; is_csr: boolean; attributed_to?: string } | null {
  const lowerName = rawName.toLowerCase().trim()

  for (const mapping of mappings) {
    for (const raw of mapping.raw_names) {
      if (raw.toLowerCase().trim() === lowerName) {
        return {
          mapped_name: mapping.mapped_name,
          is_csr: mapping.is_csr,
          attributed_to: mapping.attributed_to
        }
      }
    }
  }

  return null
}

/**
 * Parser for AgencyZoom Lead Source CSV export
 *
 * CSV Format:
 * Lead Source,Items,Premium,L&H Premium,Policies,Sales,Points,Revenue
 * Total,31,"$19,885",0,15,12,320,"$1,790"
 * Net Leads,12,"$8,500",0,6,5,120,"$750"
 * Crystal,8,"$5,200",0,4,3,85,"$450"
 *
 * Column mapping:
 * - Lead Source / Source Name → source_name_raw
 * - Items → items
 * - Premium → premium (ignore L&H Premium)
 * - Policies → policies
 * - Sales → sales
 * - Points → points
 * - Revenue → ignored
 */
export function parseAgencyZoomLeadSourceCSV(csvContent: string): LeadSourceParseResult {
  if (!csvContent || csvContent.trim() === '') {
    return { success: false, error: 'No CSV data provided' }
  }

  const lines = csvContent.trim().split('\n').filter(line => line.trim() !== '')

  if (lines.length < 2) {
    return { success: false, error: 'CSV must include a header row and at least one data row' }
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

  // Find column indices
  const columnMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    if (header === 'lead source' || header === 'source' || header === 'source name') {
      columnMap['source'] = index
    } else if (header === 'items' || header === 'item') {
      columnMap['items'] = index
    } else if (header === 'premium' && !header.includes('l&h')) {
      columnMap['premium'] = index
    } else if (header === 'policies' || header === 'policy') {
      columnMap['policies'] = index
    } else if (header === 'sales' || header === 'sold') {
      columnMap['sales'] = index
    } else if (header === 'points' || header === 'point') {
      columnMap['points'] = index
    }
  })

  // Validate required columns
  if (columnMap['source'] === undefined) {
    columnMap['source'] = 0 // Default to first column
  }

  const sources: LeadSourceMetrics[] = []

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    if (values.length < 2) continue

    const rawName = values[columnMap['source']] || ''

    // Skip "Total" row
    if (rawName.toLowerCase().includes('total') || rawName.toLowerCase().includes('team')) {
      continue
    }

    // Skip empty source names
    if (!rawName.trim()) {
      continue
    }

    const metrics: LeadSourceMetrics = {
      source_name_raw: rawName.trim(),
      items: columnMap['items'] !== undefined ? parseNumber(values[columnMap['items']] || '0') : 0,
      premium: columnMap['premium'] !== undefined ? parseNumber(values[columnMap['premium']] || '0') : 0,
      policies: columnMap['policies'] !== undefined ? parseNumber(values[columnMap['policies']] || '0') : 0,
      sales: columnMap['sales'] !== undefined ? parseNumber(values[columnMap['sales']] || '0') : 0,
      points: columnMap['points'] !== undefined ? parseNumber(values[columnMap['points']] || '0') : 0
    }

    sources.push(metrics)
  }

  if (sources.length === 0) {
    return {
      success: false,
      error: 'No valid lead source data found in CSV'
    }
  }

  // Calculate team totals
  const team = {
    items: 0,
    premium: 0,
    policies: 0,
    sales: 0,
    points: 0
  }

  sources.forEach(s => {
    team.items += s.items
    team.premium += s.premium
    team.policies += s.policies
    team.sales += s.sales
    team.points += s.points
  })

  return {
    success: true,
    data: {
      sources,
      team
    }
  }
}

/**
 * Combine sources with the same mapped name
 * Used when multiple raw names map to the same display name (e.g., Crystal + Crystal Brozio)
 */
export function combineSourcesByMapping(
  sources: LeadSourceMetrics[],
  mappings: SourceMapping[]
): Array<LeadSourceMetrics & { mapped_source_name: string; is_csr: boolean; attributed_to?: string }> {
  const combined = new Map<string, LeadSourceMetrics & { mapped_source_name: string; is_csr: boolean; attributed_to?: string }>()

  for (const source of sources) {
    const mapping = applySourceMapping(source.source_name_raw, mappings)
    const displayName = mapping?.mapped_name || source.source_name_raw
    const isCsr = mapping?.is_csr || false
    const attributedTo = mapping?.attributed_to

    const existing = combined.get(displayName)
    if (existing) {
      // Combine metrics
      existing.items += source.items
      existing.premium += source.premium
      existing.policies += source.policies
      existing.sales += source.sales
      existing.points += source.points
    } else {
      combined.set(displayName, {
        ...source,
        mapped_source_name: displayName,
        is_csr: isCsr,
        attributed_to: attributedTo
      })
    }
  }

  // Sort by items descending
  return Array.from(combined.values()).sort((a, b) => b.items - a.items)
}
