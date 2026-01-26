# Pattern Detection Audit - TDS

> Generated: January 26, 2026

## 1. Current Pattern Detection Thresholds (From Actual Code)

### A. Edge Function (`supabase/functions/detect-patterns/index.ts`)

The nightly edge function runs at 11:30 PM CT and detects 4 pattern types:

| Pattern Type | Trigger Condition | Severity |
|--------------|-------------------|----------|
| `low_conversion` | QHH > 3 AND items = 0 yesterday | **Warning** |
| `source_failing` | Same source 0 items for 3-4 days | Warning |
| `source_failing` | Same source 0 items for 5+ days | **Critical** |
| `outside_streak` | 3-4 consecutive OUTSIDE framework days | Warning |
| `outside_streak` | 5+ consecutive OUTSIDE framework days | **Critical** |
| `zero_item_streak` | 3-4 consecutive 0-item days | Warning |
| `zero_item_streak` | 5+ consecutive 0-item days | **Critical** |

**Auto-resolution**: Patterns older than 7 days auto-resolve.

### B. Frontend Alerts (`src/hooks/useAnalyticsData.ts` - `useProducerPerformanceAlerts`)

This is the **source of the conversion percentages you see** (63.9%, 41.2%):

| Metric | Critical Threshold | Warning Threshold | Notes |
|--------|-------------------|-------------------|-------|
| **QHH→Items Conversion** | <15% | 15-22% | This is what shows as "conversion" |
| **Daily QHH Average** | <3/day | 3-4/day | Aligns with framework |
| **Consecutive Zero Days** | ≥3 days | N/A | |
| **Monthly QUOTES Pace** | <100 quotes | 100-150 quotes | ✅ Correctly uses QUOTES, not QHH |

**The conversion % shown = (Items / QHH) × 100** — this is the close rate.

### C. Conversion Funnel (`useConversionFunnelData`)

Shows two conversion metrics:
- **QHH → Items**: `(totalItems / totalQHH) × 100`
- **Items → Sales**: `(totalSales / totalItems) × 100`

---

## 2. Verification Status

### ✅ CONFIRMED: Monthly Pace Uses QUOTES (Not QHH)

From `useAnalyticsData.ts` line 257-259:
```typescript
// Calculate monthly QUOTES pace (200/month target = 10/day over 20 workdays)
const daysInPeriod = Math.max(1, data.workingDays)
const monthlyQuotesPace = (data.totalQuotes / daysInPeriod) * 20
```

**Correct implementation** — uses `data.totalQuotes` not `data.totalQhh`.

### ✅ CONFIRMED: Items→Sales Check is REMOVED

The hook no longer calculates or checks Items→Sales conversion (was broken because items ≥ sales always due to bundling).

### ✅ CLARIFIED: What "Conversion" Percentage Shows

The percentages you see (63.9% for Kimberly, 41.2% for Maria) are **QHH→Items conversion rate** (aka close rate):

```typescript
// Line 254
const qhhToItemsConversion = data.totalQhh > 0 ? (data.totalItems / data.totalQhh) * 100 : 0
```

This is returned as `conversion_rate` in the `ProducerAlert` object and displayed in `ProducerPerformanceCard.tsx`:

```tsx
// Line 110-111
<span className="text-xs text-muted-foreground dark:text-slate-200">
  {alert.conversion_rate.toFixed(1)}% conversion
</span>
```

---

## 3. Comparison to Daily Standard Framework

| Metric | Framework Target | Current Pattern Detection | Status |
|--------|------------------|---------------------------|--------|
| Daily QHH | 4+ for TOP | Critical <3, Warning 3-4 | ✅ Aligned |
| Monthly Quotes | 200/producer | Critical <100, Warning 100-150 | ✅ Aligned |
| Close Rate (QHH→Items) | Agency avg ~25% | Critical <15%, Warning 15-22% | ✅ Appropriate |
| Framework Status | TOP/BOTTOM/OUTSIDE | 3-4 OUTSIDE days = Warning, 5+ = Critical | ✅ Aligned |

### Close Rate Thresholds: ✅ APPROPRIATE

**Current thresholds are intentionally set to flag genuine problems, not "below ideal":**
- Critical: <15%
- Warning: 15-22%

**Agency Context:**
- Kimberly: ~45-50% close rate (exceptional)
- Maria: ~35-40% (solid)
- Agency average: ~25%
- Net Leads: ~8% (drags down blended rates)

**Current thresholds are correct** — they only flag producers with genuinely poor conversion, not those who are "merely" at 20%. A 20% close rate in insurance is acceptable; <15% indicates a real problem.

---

## 4. Zip Code Pattern Detection

### Current Status: **NOT IMPLEMENTED**

There is NO automated pattern detection for zip codes. However:

1. **`get_zip_performance` RPC exists** — returns quotes, sales, conversion_rate by ZIP
2. **`ZIP_HEALTH_STATUS_IMPLEMENTATION_PLAN.md` exists** — defines health status rules for ZIP codes but this is for display in the ZIP Performance report, NOT automated alerts

### ZIP Health Status Rules (From Plan - UI Only)

| Status | Condition |
|--------|-----------|
| 🔴 Red (Critical) | 8+ quotes AND 0 sales |
| 🟡 Yellow (Warning) | 5-9 quotes AND 0 sales, OR 10+ quotes AND <10% conversion |
| 🟢 Green (Healthy) | ≥15% conversion OR <5 quotes |

### Recommendation: Add Zip Code Pattern Detection

Add a new pattern type `zip_failing` to the edge function:

**Trigger Condition:**
- ZIP has 8+ quotes in rolling 30 days AND 0 sales
- Same producer continues quoting that ZIP

**Data Source:** `analytics_zip_performance_json` RPC or direct query on `quoted_households` table

**Alert Message:**
```
"⚠️ ZIP 30101: 12 quotes, 0 sales (0% close rate) — consider avoiding this ZIP"
```

---

## 5. Summary of Findings

### ✅ Working Correctly
1. Monthly pace uses **Quotes** (not QHH) — confirmed
2. Items→Sales check **removed** — confirmed
3. Low conversion triggers on **QHH > 3 with 0 items** — correct
4. OUTSIDE streaks detected at **3+ days** — correct
5. Source failure detected at **3+ consecutive 0-item days** — correct

### ❌ Missing Pattern Detection
1. **Zip Code Patterns** — High-quote, zero-sale ZIPs not detected

---

## 6. Files Audited

| File | Purpose | Status |
|------|---------|--------|
| `supabase/functions/detect-patterns/index.ts` | Nightly pattern detection | ✅ Reviewed |
| `src/hooks/useAnalyticsData.ts` | Frontend alerts + conversion calc | ✅ Reviewed |
| `src/hooks/useDetectedPatterns.ts` | Pattern fetching hooks | ✅ Reviewed |
| `src/components/patterns/ActivePatternsCard.tsx` | Manager pattern display | ✅ Reviewed |
| `src/components/insights/ProducerPerformanceCard.tsx` | Shows conversion % | ✅ Reviewed |
| `supabase/migrations/20260126_detected_patterns.sql` | DB schema + RPCs | ✅ Reviewed |
| `src/hooks/useZipPerformance.ts` | ZIP performance data | ✅ Reviewed |
| `ZIP_HEALTH_STATUS_IMPLEMENTATION_PLAN.md` | ZIP health UI (not detection) | ✅ Reviewed |

---

## 7. Implementation Plan: Zip Code Pattern Detection

If you want to proceed with adding ZIP code pattern detection:

### Step 1: Update Database Schema

```sql
-- Add new pattern type
ALTER TABLE detected_patterns
DROP CONSTRAINT detected_patterns_pattern_type_check;

ALTER TABLE detected_patterns
ADD CONSTRAINT detected_patterns_pattern_type_check
CHECK (pattern_type IN (
  'low_conversion',
  'source_failing',
  'outside_streak',
  'zero_item_streak',
  'zip_failing'  -- NEW
));
```

### Step 2: Add RPC Function

```sql
CREATE OR REPLACE FUNCTION get_failing_zips(p_lookback_days INTEGER DEFAULT 30)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  zip_code TEXT,
  quotes INTEGER,
  sales INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    qh.producer_id,
    p.display_name as producer_name,
    qh.zip,
    COUNT(DISTINCT qh.id)::INTEGER as quotes,
    COUNT(DISTINCT CASE WHEN de.items_total > 0 THEN qh.id END)::INTEGER as sales
  FROM quoted_households qh
  INNER JOIN producers p ON qh.producer_id = p.id
  INNER JOIN daily_entries de ON qh.daily_entry_id = de.id
  WHERE qh.quoted_at >= CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL
    AND p.active = true
  GROUP BY qh.producer_id, p.display_name, qh.zip
  HAVING COUNT(DISTINCT qh.id) >= 8
    AND COUNT(DISTINCT CASE WHEN de.items_total > 0 THEN qh.id END) = 0;
END;
$function$;
```

### Step 3: Update Edge Function

Add to `supabase/functions/detect-patterns/index.ts`:

```typescript
// 5. ZIP FAILING: 8+ quotes with 0 sales in rolling 30 days
console.log('Checking failing ZIPs...')

const { data: failingZips, error: fzError } = await supabase
  .rpc('get_failing_zips', { p_lookback_days: 30 })

if (fzError) {
  console.error('Error fetching failing ZIPs:', fzError)
} else if (failingZips) {
  for (const zip of failingZips) {
    patternsToInsert.push({
      producer_id: zip.producer_id,
      pattern_type: 'zip_failing',
      severity: 'warning',
      context: {
        zip_code: zip.zip_code,
        quotes: zip.quotes,
        sales: zip.sales,
        message: `ZIP ${zip.zip_code}: ${zip.quotes} quotes, 0 sales — consider avoiding this area`
      }
    })
  }
  console.log(`Found ${failingZips.length} failing ZIPs`)
}
```

### Step 4: Update TypeScript Types

Add to `src/hooks/useDetectedPatterns.ts`:

```typescript
export interface DetectedPattern {
  // ... existing fields
  pattern_type: 'low_conversion' | 'source_failing' | 'outside_streak' | 'zero_item_streak' | 'zip_failing'
}

// Update PATTERN_CONFIG
zip_failing: {
  label: 'Failing ZIP Code',
  icon: '📍',
  description: 'ZIP code with high quotes but no sales',
}
```

### Files to Modify

1. `supabase/migrations/` — New migration for schema change + RPC
2. `supabase/functions/detect-patterns/index.ts` — Add ZIP detection logic
3. `src/hooks/useDetectedPatterns.ts` — Update types and config
4. `src/components/patterns/ActivePatternsCard.tsx` — Add icon for new pattern type
