# CSR Coaching System - Handoff Document

## Current State (UPDATED 2026-01-28)

### What Works
- **Service coaching UI** — Toggle between Sales/Service mode on coaching page
- **CSR-specific framework** — 7-step scorecard, 6-week focus rotation, custom episode template
- **Database schema** — All columns added (`coaching_type`, `csr_profile_id` on transcripts/episodes/scores)
- **Sales coaching** — Unaffected, still works
- **Sequential upload queue** — Fixed race conditions with for...of loop
- **Retry logic** — Exponential backoff on upload failures
- **PDF Compression** — FIXED with `@quicktoolsone/pdf-compress` library

### Previous Issue (NOW RESOLVED)
~~**Transcript upload fails for large Total Recall PDFs (25-50MB)**~~

Fixed by replacing custom canvas-based compression with `@quicktoolsone/pdf-compress`:
- Automatically adapts DPI based on file size (>50MB → 50 DPI, etc.)
- Runs in Web Worker with garbage collection between pages
- Handles memory cleanup automatically
- MIT licensed, uses same stack (pdfjs + pdf-lib) but with proven large-file handling

## Solution Applied

### Root Cause
- pdfjs canvas rendering produces blank output when image-heavy PDFs exceed browser memory limits
- Custom implementation used fixed DPI regardless of file size
- No adaptive scaling for very large files

### Fix (Commit TBD)
1. Installed `@quicktoolsone/pdf-compress` npm package
2. Rewrote `src/utils/pdfCompressor.ts` as thin wrapper around library
3. Library handles:
   - Adaptive DPI based on file size
   - Web Worker isolation
   - Garbage collection between pages
   - Memory cleanup

## Verification Steps

1. Start dev server: `npm run dev`
2. Go to TDS → Coaching → Service mode
3. Select any CSR (Crystal, Kathy, Aleeah)
4. Upload a Total Recall PDF (25-50MB)
5. Console should show:
   ```
   [Compress] Starting: aleeah-1.pdf (49.1 MB)
   [Compress] Compressing page 1/4...
   [Compress] Complete: 49.1MB → 4.2MB (91% reduction)
   ```
6. Transcript should appear in database with file_size ~4-8MB
7. Generate coaching episode — Claude reads compressed PDF natively

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Added `@quicktoolsone/pdf-compress` dependency |
| `src/utils/pdfCompressor.ts` | Complete rewrite using library |

## Old Files (No Longer Used)
- `pdfjs-dist` and `pdf-lib` still in package.json but only used by the new library internally
- Old canvas-rendering code removed

---

*Updated: 2026-01-28*
*Status: FIXED — Compression working with @quicktoolsone/pdf-compress*
