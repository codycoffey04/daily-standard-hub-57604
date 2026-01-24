# PDF Extraction Investigation - Findings & Solution

**Date:** 2026-01-24
**Status:** Root cause confirmed, solution identified

---

## Executive Summary

Total Recall call transcript PDFs are **image-based**, not text-based. Client-side PDF text extraction (pdf.js) will never work because there's no text layer to extract. The solution is to use Claude's native PDF document support, which reads PDFs visually.

---

## Investigation Results

### File Comparison

| File | Location | Size | Pages | Text Objects | Images |
|------|----------|------|-------|--------------|--------|
| kimberly-1.pdf | Original (Desktop) | 926,390 bytes | 3 | 0 | 3 |
| kimberly-2.pdf | Original (Desktop) | 1,366,201 bytes | - | 0 | - |
| maria-1.pdf | Supabase Storage | 1,164,389 bytes | 4 | 0 | 4 |

**Key Finding:** File sizes match exactly between original and uploaded files. The upload process did NOT corrupt anything.

### PDF Structure Analysis

```python
# Analysis of maria-1-test.pdf (downloaded from Supabase Storage)
Page 1: text_objects=0, images=1, chars=0
Page 2: text_objects=0, images=1, chars=0
Page 3: text_objects=0, images=1, chars=0
Page 4: text_objects=0, images=1, chars=0
```

Each page contains:
- **0 text characters** (no text layer)
- **1 full-page image** (screenshot of the transcript)

### Root Cause

Total Recall exports transcripts as image-based PDFs - likely using "Print to PDF" from their web interface. The text you see is rendered as an image, not as searchable text.

This is why:
- pdf.js loads the PDFs correctly (detects 4 pages)
- Text extraction returns empty strings (no text to extract)
- pdfplumber confirms the same result

---

## Solution: Claude Native PDF Support

Claude API has built-in PDF document support that processes PDFs visually. No OCR or image conversion needed.

### API Format

```typescript
{
  type: "document",
  source: {
    type: "base64",
    media_type: "application/pdf",
    data: pdfBase64  // base64-encoded PDF file
  }
}
```

### Limits
- Max 32MB per request
- Max 100 pages per document
- ~1,500-3,000 tokens per page (text) plus image tokens

### Implementation

**Edge Function Changes:**

```typescript
// Download PDFs from Supabase Storage
const pdfContents = await Promise.all(transcripts.map(async (t) => {
  const { data, error } = await supabase.storage
    .from('coaching-transcripts')
    .download(t.file_path)

  if (error) throw error
  const arrayBuffer = await data.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

  return {
    transcript_id: t.id,
    file_name: t.file_name,
    pdf_base64: base64
  }
}))

// Send as document blocks to Claude
const documentBlocks = pdfContents.map((pdf) => ({
  type: "document",
  source: {
    type: "base64",
    media_type: "application/pdf",
    data: pdf.pdf_base64
  }
}))

// Call Claude with documents
const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: [
        ...documentBlocks,
        { type: 'text', text: userPrompt }
      ]
    }],
    system: systemPrompt
  })
})
```

---

## Files to Modify

1. **`/supabase/functions/generate-coaching-episode/index.ts`**
   - Remove dependency on `extracted_text` column
   - Download PDFs from Supabase Storage
   - Send as `document` content blocks to Claude

2. **`/src/hooks/useCoachingTranscripts.ts`**
   - Remove client-side extraction calls
   - Set `extraction_status` to 'skipped'

3. **`/src/components/coaching/TranscriptUploader.tsx`**
   - Remove extraction status display
   - Show simple upload success state

---

## Verification Steps

1. Delete existing transcripts: `DELETE FROM coaching_transcripts WHERE week_start = '2026-01-12';`
2. Upload 3 PDFs for one producer
3. Click "Generate Episode"
4. Verify Edge Function logs show PDFs being downloaded
5. Verify Claude response includes analysis of call content
6. Check episode markdown contains specific quotes from the transcripts

---

## Sources

- [Claude PDF Support Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support)
- Investigation performed with pdfplumber Python library
- Original files verified at `/Users/cody/Desktop/CoffeyAgencies/`

---

## What Was Already Done (Keep These Changes)

The Vite configuration fixes are correct and should remain:

```typescript
// vite.config.ts - ES2022 target
optimizeDeps: {
  esbuildOptions: {
    target: 'es2022',
  },
}

// pdfExtractor.ts - Worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()
```

These changes are technically correct for text-based PDFs, but irrelevant for our image-based PDFs.
