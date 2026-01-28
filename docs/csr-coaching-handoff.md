# CSR Coaching System - Handoff Document

## Current State

### What Works
- **Service coaching UI** — Toggle between Sales/Service mode on coaching page
- **CSR-specific framework** — 7-step scorecard, 6-week focus rotation, custom episode template
- **Database schema** — All columns added (`coaching_type`, `csr_profile_id` on transcripts/episodes/scores)
- **Sales coaching** — Unaffected, still works (smaller PDFs < 5MB upload fine)
- **Sequential upload queue** — Fixed race conditions with for...of loop
- **Retry logic** — Exponential backoff on upload failures

### What's Broken
**Transcript upload fails for large Total Recall PDFs (25-50MB)**

The PDF compression feature produces 0-byte output files, causing:
1. Upload "succeeds" with empty file
2. Database insert fails with CHECK constraint violation (error `23514`)
3. UI shows "Failed" status correctly

## Console Errors to Reference

```
[Compress] Starting: aleeah-1.pdf (49.1 MB)
[Compress] Processing 4 pages at 0.6x scale, 0.65 JPEG quality
[Compress] Complete: 49.1MB → 0.0MB (100% reduction)   ← THIS IS WRONG
[Upload] Uploading PDF: aleeah-1.pdf (0.0 MB)
Failed to load resource: the server responded with a status of 400 ()
[Upload] DB insert error: Object
  code: "23514"
  message: "new row for relation \"coaching_transcripts\" violates check constraint"
```

## Root Cause

The pdfCompressor.ts uses:
1. **pdfjs-dist** to render PDF pages to canvas
2. **pdf-lib** to rebuild PDF from JPEG images

**The Problem**: Canvas rendering produces blank/empty canvases for Total Recall PDFs:
- Total Recall exports are image-based PDFs (screenshots of call transcripts)
- pdfjs may not be handling the specific image format correctly
- Result: `canvas.toBlob()` returns near-zero bytes

## Files Involved

| File | Purpose | Issue |
|------|---------|-------|
| `src/utils/pdfCompressor.ts` | Compression logic | Canvas renders blank pages |
| `src/hooks/useCoachingTranscripts.ts` | Upload orchestration | Fallback exists but original too large |
| `src/components/coaching/TranscriptUploader.tsx` | UI component | Working correctly |
| `supabase/functions/generate-coaching-episode/index.ts` | Episode generation | Unaffected |

## What Needs to Happen

### Option 1: Debug pdfjs Canvas Rendering
- Check if pdfjs worker is loading correctly
- Test with a known-good PDF to isolate the issue
- May need different render settings for image-heavy PDFs

### Option 2: Server-Side Compression
- Move compression to Edge Function
- Use Deno-compatible PDF library
- More reliable but adds complexity

### Option 3: Chunked/Resumable Upload
- Use Supabase's TUS protocol for large files
- Avoids compression entirely
- May still hit Claude API limits on large base64 payloads

### Option 4: Manual Workaround (Temporary)
- Ask users to compress PDFs before uploading
- Use Preview.app "Export as PDF" with reduced quality
- Not ideal but unblocks CSR coaching

## Quick Test

1. Go to TDS → Coaching → Service mode
2. Select any CSR (Crystal, Kathy, Aleeah)
3. Upload a Total Recall PDF (25-50MB)
4. Watch console for compression output
5. Expected: Should see actual JPEG sizes per page, not 0.0MB total

## Validation Added

The compressor now throws errors if output is suspicious:
```typescript
if (compressedSize < 1000) {
  throw new Error(`Compression failed: output file is only ${compressedSize} bytes`)
}
if (reductionPercent > 95) {
  throw new Error(`Compression suspicious: ${reductionPercent}% reduction suggests rendering failed`)
}
```

This triggers the fallback to upload original — but original is too large and times out.

## Commits Reference

- `126adb0` — Initial compression implementation
- `8471a68` — Fix worker URL, add validation
- `c00fc56` — Bug fixes from fresh-eyes review

---

*Created: 2026-01-28*
*Status: BLOCKED — Compression not working*
