# ZIP Health Status Feature - Implementation Plan

## Overview
This document outlines the implementation plan for adding a "Zip Health Status" feature to the ZIP Code Performance page. The feature will add visual health indicators, a summary card, and filtering capabilities based on ZIP code performance metrics.

## Quick Reference - Key Design Decisions

✅ **Badge Style:** Colored Badge components (not emojis) matching framework status badges  
✅ **Colors:** `success` (green), `warning` (yellow), `destructive` (red) tokens  
✅ **Column Position:** Status column is SECOND (after ZIP Code, before Quotes)  
✅ **Column Header:** "Status" with info tooltip explaining criteria  
✅ **Interactive:** Click badge to see detailed tooltip with specific reason  
✅ **Filter Default:** Problem ZIPs filter is OFF by default  
✅ **Sort Default:** Keep current default (Quotes descending)  
✅ **Card Position:** Problem ZIPs card is LAST (after Top Performer)

---

## Current Architecture Analysis

### Relevant Files Identified

1. **Frontend Components:**
   - `src/components/reports/ZipCodePerformanceReport.tsx` - Main report component (552 lines)
   - `src/hooks/useZipPerformance.ts` - Data fetching hook (80 lines)

2. **Data Layer:**
   - Supabase RPC function: `analytics_zip_performance_json`
   - Returns: `{ rows: ZipPerformanceRow[], summary: ZipPerformanceSummary }`

3. **Data Structure:**
   ```typescript
   interface ZipPerformanceRow {
     zip_code: string
     quotes: number
     sales: number
     conversion_rate: number  // percentage (0-100)
     premium: number
     items_sold: number
   }
   ```

### Current Data Flow

```
ZipCodePerformanceReport Component
  ↓
useZipPerformance Hook
  ↓
supabase.rpc('analytics_zip_performance_json', {
  p_date_start, p_date_end, p_producer_id, 
  p_source_id, p_min_quotes, p_include_unknown
})
  ↓
Returns: { rows: ZipPerformanceRow[], summary: ZipPerformanceSummary }
  ↓
Component renders table with sorted/filtered rows
```

### Current Filtering & Sorting

- **Filters:** Date range, Producer, Lead Source, Min Quotes, Include Unknown
- **Sorting:** By any column (zip_code, quotes, sales, conversion_rate, premium, items_sold)
- **Data Processing:** Client-side sorting via `useMemo` on `sortedRows`

---

## Health Status Logic

### Rules Definition

**🟢 Green (Healthy):**
- `conversion_rate >= 15%` OR
- `quotes < 5` (insufficient data - not flagged as problem)

**🟡 Yellow (Warning):**
- `quotes >= 5 AND quotes <= 9 AND sales === 0` OR
- `quotes >= 10 AND conversion_rate < 10%`

**🔴 Red (Critical):**
- `quotes >= 8 AND sales === 0`

### Logic Flow Diagram

```
IF quotes < 5:
  → 🟢 Green (insufficient data)
ELSE IF quotes >= 8 AND sales === 0:
  → 🔴 Red (critical - no sales with significant volume)
ELSE IF (quotes >= 5 AND quotes <= 9 AND sales === 0):
  → 🟡 Yellow (warning - no sales with moderate volume)
ELSE IF quotes >= 10 AND conversion_rate < 10%:
  → 🟡 Yellow (warning - low conversion with high volume)
ELSE IF conversion_rate >= 15%:
  → 🟢 Green (healthy conversion)
ELSE:
  → 🟢 Green (default - not meeting problem criteria)
```

---

## Implementation Plan

### Phase 1: Type Definitions & Health Calculation Logic

#### 1.1 Update TypeScript Interfaces

**File:** `src/hooks/useZipPerformance.ts`

**Changes:**
- Add `health_status` field to `ZipPerformanceRow` interface
- Add `problem_zips_count` to `ZipPerformanceSummary` interface
- Create new `ZipHealthStatus` type: `'green' | 'yellow' | 'red'`

```typescript
export type ZipHealthStatus = 'green' | 'yellow' | 'red'

export interface ZipPerformanceRow {
  zip_code: string
  quotes: number
  sales: number
  conversion_rate: number
  premium: number
  items_sold: number
  health_status?: ZipHealthStatus  // Optional for backward compatibility
}

export interface ZipPerformanceSummary {
  total_unique_zips: number
  total_quotes: number
  total_sales: number
  top_zip: null | { ... }
  problem_zips_count?: number  // New field
}
```

#### 1.2 Create Health Status Calculation Function

**File:** `src/lib/utils.ts` (or create `src/lib/zipHealth.ts`)

**Function:**
```typescript
export function calculateZipHealthStatus(
  quotes: number,
  sales: number,
  conversionRate: number
): ZipHealthStatus {
  // Red: 8+ quotes with 0 sales
  if (quotes >= 8 && sales === 0) {
    return 'red'
  }
  
  // Yellow: 5-9 quotes with 0 sales, OR 10+ quotes with <10% conversion
  if (
    (quotes >= 5 && quotes <= 9 && sales === 0) ||
    (quotes >= 10 && conversionRate < 10)
  ) {
    return 'yellow'
  }
  
  // Green: >=15% conversion OR <5 quotes (insufficient data)
  if (conversionRate >= 15 || quotes < 5) {
    return 'green'
  }
  
  // Default to green (not meeting problem criteria)
  return 'green'
}
```

**Rationale:** Frontend calculation allows dynamic filtering without database changes and maintains flexibility.

---

### Phase 2: Component Updates

#### 2.1 Add Health Status Column to Table

**File:** `src/components/reports/ZipCodePerformanceReport.tsx`

**Changes:**
1. Import health calculation function
2. Calculate health status for each row in `useMemo`
3. Add new table header column
4. Add health status indicator cell to each row

**Location:** After ZIP Code column (SECOND column, before Quotes column)

```typescript
// Add after imports
import { calculateZipHealthStatus } from '@/lib/utils' // or '@/lib/zipHealth'

// Add after sortedRows calculation (around line 104)
const rowsWithHealth = useMemo(() => {
  if (!sortedRows) return []
  return sortedRows.map(row => ({
    ...row,
    health_status: calculateZipHealthStatus(
      row.quotes,
      row.sales,
      row.conversion_rate
    )
  }))
}, [sortedRows])

// Update table to use rowsWithHealth instead of sortedRows

**Column Order:** The table columns should be in this order:
1. ZIP Code
2. **Status** (NEW - second column)
3. Quotes
4. Sales
5. Conversion %
6. Premium
7. Items Sold
```

**New Table Column (SECOND column, after ZIP Code):**
```tsx
<TableHead>
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="sm" onClick={() => handleSort('health_status')}>
      Status
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground">
            <AlertCircle className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p><strong>🟢 Green:</strong> ≥15% conversion OR &lt;5 quotes</p>
            <p><strong>🟡 Yellow:</strong> 5-9 quotes with 0 sales, OR 10+ quotes with &lt;10% conversion</p>
            <p><strong>🔴 Red:</strong> 8+ quotes with 0 sales</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</TableHead>
```

**Health Status Cell with Interactive Tooltip:**
```tsx
<TableCell>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">
          <Badge
            className={cn(
              "text-xs",
              row.health_status === 'green' && "bg-success text-success-foreground",
              row.health_status === 'yellow' && "bg-warning text-warning-foreground",
              row.health_status === 'red' && "bg-destructive text-destructive-foreground"
            )}
          >
            {row.health_status === 'green' ? 'Healthy' : 
             row.health_status === 'yellow' ? 'Warning' : 'Critical'}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs">
          <p className="font-semibold">ZIP {row.zip_code}</p>
          <p>{row.quotes} quotes, {row.sales} sales</p>
          <p>{row.conversion_rate.toFixed(1)}% conversion</p>
          {row.health_status === 'red' && (
            <p className="text-destructive font-medium">8+ quotes with 0 sales</p>
          )}
          {row.health_status === 'yellow' && (
            <p className="text-warning font-medium">
              {row.quotes >= 5 && row.quotes <= 9 && row.sales === 0
                ? '5-9 quotes with 0 sales'
                : '10+ quotes with <10% conversion'}
            </p>
          )}
          {row.health_status === 'green' && (
            <p className="text-success font-medium">
              {row.quotes < 5 ? 'Insufficient data (<5 quotes)' : '≥15% conversion'}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</TableCell>
```

**Required Imports:**
```tsx
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle } from 'lucide-react'
```

**Badge Styling Details:**
- Use Badge component with custom className for colors
- Match the style pattern from `YesterdayStatusBanner` and `ProducerTrendsReport`
- Badge should be compact: `text-xs` size
- Colors use semantic tokens that adapt to light/dark mode:
  - Green: `bg-success text-success-foreground`
  - Yellow: `bg-warning text-warning-foreground`  
  - Red: `bg-destructive text-destructive-foreground`

#### 2.2 Add Problem ZIPs Summary Card

**File:** `src/components/reports/ZipCodePerformanceReport.tsx`

**Location:** After line 422 (LAST card in the summary cards grid, after Top Performer)

**New Card:**
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Problem ZIPs</CardTitle>
    <AlertCircle className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {problemZipsCount}
    </div>
    <p className="text-xs text-muted-foreground">
      Yellow + Red status ZIPs
    </p>
  </CardContent>
</Card>
```

**Calculation:**
```typescript
const problemZipsCount = useMemo(() => {
  if (!data?.rows) return 0
  return data.rows.filter(row => {
    const status = calculateZipHealthStatus(row.quotes, row.sales, row.conversion_rate)
    return status === 'yellow' || status === 'red'
  }).length
}, [data?.rows])
```

**Note:** Update grid to `grid-cols-1 md:grid-cols-5` to accommodate 5 cards.

#### 2.3 Add Problem ZIPs Filter

**File:** `src/components/reports/ZipCodePerformanceReport.tsx`

**Changes:**
1. Add state: `const [showProblemZipsOnly, setShowProblemZipsOnly] = useState(false)` - **OFF by default**
2. Add checkbox in filters section
3. Filter `rowsWithHealth` based on this state

**Location:** In filters card (around line 364, after "Include Unknown" checkbox)

```tsx
{/* Problem ZIPs Filter */}
<div className="space-y-2">
  <Label htmlFor="problem-zips" className="block mb-2">Filter</Label>
  <div className="flex items-center space-x-2">
    <Checkbox
      id="problem-zips"
      checked={showProblemZipsOnly}
      onCheckedChange={(checked) => setShowProblemZipsOnly(checked as boolean)}
    />
    <label
      htmlFor="problem-zips"
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      Problem ZIPs Only
    </label>
  </div>
</div>
```

**Filter Logic:**
```typescript
const filteredRowsWithHealth = useMemo(() => {
  if (!showProblemZipsOnly) return rowsWithHealth
  return rowsWithHealth.filter(row => 
    row.health_status === 'yellow' || row.health_status === 'red'
  )
}, [rowsWithHealth, showProblemZipsOnly])
```

**Update:** Use `filteredRowsWithHealth` in table rendering instead of `rowsWithHealth`.

**Important:** The filter state defaults to `false` (OFF), so users see all ZIPs by default.

---

### Phase 3: Sorting Enhancement

#### 3.1 Add Health Status Sorting

**File:** `src/components/reports/ZipCodePerformanceReport.tsx`

**Changes:**
- Update `handleSort` to support `health_status` column
- Add custom sorting logic for health status (Red → Yellow → Green)

**Sorting Logic:**
```typescript
const sortedRows = useMemo(() => {
  if (!data?.rows) return []
  
  return [...data.rows].sort((a, b) => {
    // Custom sorting for health_status
    if (sortColumn === 'health_status') {
      const aStatus = calculateZipHealthStatus(a.quotes, a.sales, a.conversion_rate)
      const bStatus = calculateZipHealthStatus(b.quotes, b.sales, b.conversion_rate)
      const statusOrder = { red: 0, yellow: 1, green: 2 }
      const comparison = statusOrder[aStatus] - statusOrder[bStatus]
      return sortDirection === 'asc' ? comparison : -comparison
    }
    
    // Standard sorting for other columns
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]
    const comparison = aVal > bVal ? 1 : -1
    return sortDirection === 'asc' ? comparison : -comparison
  })
}, [data?.rows, sortColumn, sortDirection])
```

**Note:** 
- Update `sortColumn` type to include `'health_status'`
- **Keep default sort unchanged** - still defaults to 'quotes' descending
- Health status sorting is optional, not the default

---

### Phase 4: Export Enhancement

#### 4.1 Include Health Status in CSV Export

**File:** `src/components/reports/ZipCodePerformanceReport.tsx`

**Changes:**
- Add "Health Status" column to CSV headers
- Include health status in CSV rows

**Update `exportToCSV` function:**
```typescript
const headers = ['ZIP Code', 'Status', 'Quotes', 'Sales', 'Conversion %', 'Premium', 'Items Sold']

const csvRows = filteredRowsWithHealth.map(row => {
  const status = row.health_status || calculateZipHealthStatus(row.quotes, row.sales, row.conversion_rate)
  const statusText = status === 'green' ? 'Healthy' : status === 'yellow' ? 'Warning' : 'Critical'
  return [
    escapeCSV(row.zip_code),
    escapeCSV(statusText),
    escapeCSV(row.quotes),
    escapeCSV(row.sales),
    escapeCSV(row.conversion_rate.toFixed(2)),
    escapeCSV(Math.round(row.premium)),
    escapeCSV(row.items_sold)
  ]
})
```

**Note:** Status column is SECOND in CSV export (matching table column order)

---

## Technical Considerations

### Performance

**Current Approach (Frontend Calculation):**
- ✅ **Pros:**
  - No database changes required
  - Dynamic filtering works immediately
  - Easy to adjust logic without migrations
  - Respects all current filters (date range, producer, source)
  
- ⚠️ **Cons:**
  - Calculation runs on every render (mitigated by `useMemo`)
  - If dataset grows very large (>10k rows), may need optimization

**Alternative Approach (Database Calculation):**
- Would require modifying `analytics_zip_performance_json` function
- More complex to maintain
- Less flexible for future rule changes

**Recommendation:** Start with frontend calculation. If performance becomes an issue with large datasets, consider moving to database.

### RLS (Row Level Security)

**Current Status:**
- The `analytics_zip_performance_json` function uses `SECURITY DEFINER`
- Health status calculation happens client-side on already-filtered data
- **No RLS concerns** - we're only calculating on data the user already has access to

**Verification Needed:**
- Confirm `analytics_zip_performance_json` respects user permissions
- Health status doesn't expose additional data

### Data Consistency

**Edge Cases to Handle:**
1. **Zero quotes:** Should default to green (insufficient data)
2. **Null conversion_rate:** Handle gracefully (treat as 0%)
3. **Negative values:** Validate data integrity
4. **Very high conversion rates (>100%):** Should still show green

**Validation:**
```typescript
export function calculateZipHealthStatus(
  quotes: number,
  sales: number,
  conversionRate: number
): ZipHealthStatus {
  // Validate inputs
  const safeQuotes = Math.max(0, quotes || 0)
  const safeSales = Math.max(0, sales || 0)
  const safeConversionRate = Math.max(0, conversionRate || 0)
  
  // ... rest of logic
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Health status calculation function with all rule combinations
- [ ] Edge cases (zero quotes, null values, negative numbers)
- [ ] Filter logic (problem ZIPs only)

### Integration Tests
- [ ] Health status appears in table
- [ ] Summary card shows correct count
- [ ] Filter works correctly
- [ ] Sorting by health status works
- [ ] CSV export includes health status

### Manual Testing
- [ ] Test with various date ranges
- [ ] Test with producer filter applied
- [ ] Test with source filter applied
- [ ] Test with min quotes filter
- [ ] Verify health status updates when filters change
- [ ] Test on mobile/responsive layout

---

## Implementation Order

1. **Step 1:** Create health calculation function (`src/lib/utils.ts` or new file)
2. **Step 2:** Update TypeScript interfaces (`useZipPerformance.ts`)
3. **Step 3:** Add health status column to table
4. **Step 4:** Add Problem ZIPs summary card
5. **Step 5:** Add Problem ZIPs filter
6. **Step 6:** Add health status sorting
7. **Step 7:** Update CSV export
8. **Step 8:** Test and refine

---

## Potential Issues & Solutions

### Issue 1: Health Status Changes When Filters Change
**Problem:** Health status is calculated on filtered data, so a ZIP might show different statuses with different filters.

**Solution:** This is **intentional and correct**. Health status should reflect performance within the selected criteria (date range, producer, source). Document this behavior.

### Issue 2: Performance with Large Datasets
**Problem:** Calculating health status for 1000+ ZIPs on every filter change.

**Solution:** 
- `useMemo` already optimizes this
- If needed, add debouncing to filter changes
- Consider virtual scrolling for very large tables

### Issue 3: Accessibility
**Problem:** Status indicators need to be accessible to screen readers.

**Solution:**
- Badge components include proper semantic HTML
- Add `aria-label` attributes to tooltips
- Use Badge component which has proper contrast ratios
- Tooltips provide additional context for screen readers

### Issue 4: Mobile Layout
**Problem:** Additional column might make table too wide on mobile.

**Solution:**
- Consider making health status column sticky
- Or show health status as a badge overlay on ZIP code
- Test responsive breakpoints

---

## Future Enhancements

1. ~~**Tooltips:** Add tooltips explaining health status rules~~ ✅ **IMPLEMENTED**
2. **Drill-down:** Click health status to see detailed breakdown
3. **Historical Trends:** Show health status over time
4. **Alerts:** Notify users when ZIPs change status
5. **Custom Thresholds:** Allow admins to configure health thresholds
6. **Bulk Actions:** Select multiple problem ZIPs for actions

---

## Files to Modify

1. `src/hooks/useZipPerformance.ts` - Add type definitions
2. `src/lib/utils.ts` - Add health calculation function (or create `src/lib/zipHealth.ts`)
3. `src/components/reports/ZipCodePerformanceReport.tsx` - Main component updates

**Estimated Lines of Code:** ~150-200 lines added/modified

---

## Timeline Estimate

- **Phase 1 (Types & Logic):** 30 minutes
- **Phase 2 (Component Updates):** 1-2 hours
- **Phase 3 (Sorting):** 30 minutes
- **Phase 4 (Export):** 15 minutes
- **Testing & Refinement:** 1 hour

**Total:** ~3-4 hours

---

## Design Decisions (RESOLVED)

1. **Badge Style:** Use colored Badge components (not emojis) matching existing framework status badges
   - Use `Badge` component from `@/components/ui/badge`
   - Style: Small colored pill/badge with optional text label
   - Match the style used in `YesterdayStatusBanner` and `ProducerTrendsReport`

2. **Color Scheme:** Use existing app color tokens:
   - **Green:** `success` token (`hsl(var(--success))`) - `bg-success text-success-foreground`
   - **Yellow:** `warning` token (`hsl(var(--warning))`) - `bg-warning text-warning-foreground`
   - **Red:** `destructive` token (`hsl(var(--destructive))`) - `bg-destructive text-destructive-foreground`
   - These automatically adapt to light/dark mode

3. **Default Filter State:** "Problem ZIPs Only" filter is **OFF by default**
   - Users see full picture first, then can filter down to problems

4. **Sorting Default:** Keep current default sort (by Quotes descending)
   - Health status is supplementary info, not primary
   - Do NOT change default sort to health status

5. **Summary Card Position:** Add "Problem ZIPs" card as the **LAST** card (after Top Performer)
   - It's an alert metric, not a primary KPI

6. **Column Position:** Health status column is the **SECOND column** (after ZIP Code, before Quotes)

7. **Column Header:** Use "Status" with a tooltip explaining the criteria

8. **Interactive Tooltips:** Clicking a status badge shows a tooltip with the specific reason
   - Example: "8 quotes, 0 sales" or "12 quotes, 1.2% conversion"

---

## Conclusion

This implementation plan provides a comprehensive approach to adding ZIP Health Status functionality. The frontend calculation approach offers flexibility and maintains compatibility with existing filters. The feature will enhance the ZIP Code Performance page by providing immediate visual feedback on problematic ZIP codes.

