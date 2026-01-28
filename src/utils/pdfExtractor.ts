import * as pdfjsLib from 'pdfjs-dist'

// Use Vite-compatible import.meta.url pattern for worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface PdfExtractionResult {
  text: string
  pageCount: number
  originalSize: number
  extractedSize: number
}

/**
 * Extract text content from a PDF file
 * Uses pdf.js which is battle-tested and works reliably in browsers
 *
 * For coaching transcripts, this extracts just the text content (~50-200KB)
 * instead of uploading the full PDF (~25-50MB)
 */
export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  console.log(`[PDF Extractor] Starting extraction for: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`)

  const arrayBuffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  console.log(`[PDF Extractor] PDF loaded, pages: ${pdf.numPages}`)

  const textParts: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Extract text items and join them
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : '') || '')
      .join(' ')

    textParts.push(pageText)
  }

  const fullText = textParts.join('\n\n')
  const extractedSize = new Blob([fullText]).size

  console.log(`[PDF Extractor] Extraction complete:`)
  console.log(`  - Pages: ${pdf.numPages}`)
  console.log(`  - Original: ${(file.size / 1024 / 1024).toFixed(1)} MB`)
  console.log(`  - Extracted: ${(extractedSize / 1024).toFixed(1)} KB`)
  console.log(`  - Reduction: ${((1 - extractedSize / file.size) * 100).toFixed(1)}%`)

  return {
    text: fullText,
    pageCount: pdf.numPages,
    originalSize: file.size,
    extractedSize
  }
}
