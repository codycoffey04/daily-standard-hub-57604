

# Plan: Fix Build Errors Blocking Deployment

## Problem Summary
The app cannot be published because there are **11 TypeScript build errors** that must be fixed. The preview works because it uses a more lenient development build, but publishing requires a production build with strict type checking.

## Build Errors to Fix

### Error Categories

| Category | Files Affected | Root Cause |
|----------|---------------|------------|
| Missing export | `Navigation.tsx` | References deleted function |
| RPC type mismatch | `useDetectedPatterns.ts`, `useProducerDashboard.ts` | Types not regenerated after new RPCs added |
| JSON type casting | `useEmailLeadSources.ts`, `useEmailMetrics.ts` | Supabase returns generic `Json` type |
| PDF library types | `pdfExtractor.ts` | pdf.js callback type signature |
| Edge function types | `detect-patterns/index.ts`, `generate-email-update/index.ts` | Type mismatches in Deno functions |

---

## Fix Details

### 1. Navigation.tsx - Remove Unused Import
**File:** `src/components/Navigation.tsx`
**Error:** `canAccessAccountabilityReviews` is imported but doesn't exist in `@/lib/auth`

**Fix:** Remove the import since it's not actually used in the component.

```typescript
// Change line 17 from:
import { isOwnerManager, canAccessAccountabilityReviews } from '@/lib/auth'
// To:
import { isOwnerManager } from '@/lib/auth'
```

---

### 2. useDetectedPatterns.ts - Cast RPC Returns Through `unknown`
**File:** `src/hooks/useDetectedPatterns.ts`
**Errors:** 
- RPC function names not recognized in types
- Type conversion errors

**Fix:** Add explicit `unknown` intermediate cast for RPC calls:

```typescript
// Line 111: Change
return (data || []) as DetectedPattern[]
// To:
return (data || []) as unknown as DetectedPattern[]

// Line 133: Change  
return (data || []) as DetectedPatternWithProducer[]
// To:
return (data || []) as unknown as DetectedPatternWithProducer[]
```

Also need to cast the RPC function name to bypass type checking until types are regenerated:

```typescript
// Line 102: Change
const { data, error } = await supabase.rpc('get_producer_patterns', {
// To:
const { data, error } = await (supabase.rpc as any)('get_producer_patterns', {

// Line 126: Change
const { data, error } = await supabase.rpc('get_all_active_patterns')
// To:
const { data, error } = await (supabase.rpc as any)('get_all_active_patterns')
```

---

### 3. useProducerDashboard.ts - Cast RPC Function
**File:** `src/hooks/useProducerDashboard.ts`
**Error:** RPC function `get_producer_dashboard` not in types

**Fix:** 
```typescript
// Line 167: Change
const { data, error } = await supabase.rpc('get_producer_dashboard', {
// To:
const { data, error } = await (supabase.rpc as any)('get_producer_dashboard', {
```

---

### 4. useEmailLeadSources.ts - Cast JSON Config Type
**File:** `src/hooks/useEmailLeadSources.ts`
**Error:** Type conversion for config_data

**Fix:**
```typescript
// Line 41: Change
return data?.config_data as { mappings: SourceMapping[] } | null
// To:
return (data?.config_data as unknown) as { mappings: SourceMapping[] } | null
```

---

### 5. useEmailMetrics.ts - Fix TDS Activity Type Assignment
**File:** `src/hooks/useEmailMetrics.ts`
**Errors:** Type conversion issues at lines 272, 302, 315

**Fix:** Update the type assertions to go through `unknown` first:

```typescript
// Line 272: Change
producerMetrics = metrics.producer_metrics as Record<string, ProducerProductionMetrics>
// To:
producerMetrics = metrics.producer_metrics as unknown as Record<string, ProducerProductionMetrics>

// Line 302: Change  
weeklyProducerMetrics = (metrics.weekly_producer_metrics as Record<string, ProducerProductionMetrics>) || {}
// To:
weeklyProducerMetrics = (metrics.weekly_producer_metrics as unknown as Record<string, ProducerProductionMetrics>) || {}

// Line 315 (tdsActivityMetrics assignment): Add proper typing
// Line 343: Change
tds_activity_metrics: tdsActivityMetrics as unknown as Database['public']['Tables']['email_metrics']['Insert']['tds_activity_metrics'],
// This line is already correct based on my review - the error is at line 315 where we assign to it
```

For line 315, the fix:
```typescript
// Line 315: Change
tdsActivityMetrics = tdsActivity
// To:
tdsActivityMetrics = tdsActivity as unknown as typeof tdsActivityMetrics
```

---

### 6. pdfExtractor.ts - Fix Map Callback Type
**File:** `src/utils/pdfExtractor.ts`  
**Error:** Callback type mismatch for TextItem | TextMarkedContent

**Fix:**
```typescript
// Lines 29-31: Change
const pageText = textContent.items
  .map((item: { str?: string }) => item.str || '')
  .join(' ')
// To:
const pageText = textContent.items
  .map((item) => ('str' in item ? item.str : '') || '')
  .join(' ')
```

---

### 7. detect-patterns Edge Function - Fix LowConversionEntry Type
**File:** `supabase/functions/detect-patterns/index.ts`
**Error:** Type mismatch - `producers` is array from join, need to extract `display_name`

**Fix:** The Supabase query returns `producers` as an object (from the `!inner` join), not an array. Update the iteration to properly access the producer name:

```typescript
// Around line 107: Change the loop to properly extract producer_name
for (const entry of lowConversionEntries) {
  const producerName = (entry.producers as any)?.display_name || 'Unknown'
  patternsToInsert.push({
    producer_id: entry.producer_id,
    pattern_type: 'low_conversion',
    severity: 'warning',
    context: {
      entry_date: entry.entry_date,
      qhh_total: entry.qhh_total,
      items_total: entry.items_total,
      message: `${entry.qhh_total} QHH quoted but 0 items sold on ${entry.entry_date}`
    }
  })
}
```

---

### 8. generate-email-update Edge Function - Fix vcTarget Type
**File:** `supabase/functions/generate-email-update/index.ts`
**Errors:** Lines 264-271 - arithmetic with mixed string/number types

**Fix:** Ensure `vcTarget` is explicitly a number:

```typescript
// Line 264: Change
const vcTarget = vcTargets?.[vcTargets?.focus_state as keyof VCTargets] || 76
// To:
const vcTarget = Number(vcTargets?.[vcTargets?.focus_state as keyof VCTargets]) || 76
```

---

## Implementation Order

1. **Quick wins first** - Fix the simpler type casting issues
2. **Edge functions** - Fix the Supabase functions since they run independently
3. **Test build** - Verify all errors are resolved

## Post-Fix Recommendation

After these fixes unblock the deployment, you should:
1. **Regenerate Supabase types** via Cloud tab > "Regenerate types" 
   - This will add the missing RPC functions (`get_producer_patterns`, `get_all_active_patterns`, `get_producer_dashboard`) to the types file
   - Once regenerated, the `(supabase.rpc as any)` casts can be removed for cleaner code

---

## Summary

| File | Fix Type |
|------|----------|
| `Navigation.tsx` | Remove unused import |
| `useDetectedPatterns.ts` | Add `as any` and `as unknown` casts |
| `useProducerDashboard.ts` | Add `as any` cast for RPC |
| `useEmailLeadSources.ts` | Add `as unknown` intermediate cast |
| `useEmailMetrics.ts` | Add `as unknown` intermediate casts |
| `pdfExtractor.ts` | Use type guard in map callback |
| `detect-patterns/index.ts` | Fix producer name extraction from join |
| `generate-email-update/index.ts` | Wrap vcTarget in `Number()` |

Once these 8 files are fixed, the build should succeed and publishing will work again.

