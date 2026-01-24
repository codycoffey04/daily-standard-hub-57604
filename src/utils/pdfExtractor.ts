import * as pdfjsLib from 'pdfjs-dist'

// Set worker source to CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * Extract text content from a PDF file
 * Uses pdf.js which is battle-tested and works reliably in browsers
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  console.log(`[PDF Extractor] Starting extraction for: ${file.name} (${file.size} bytes)`)

  const arrayBuffer = await file.arrayBuffer()
  console.log(`[PDF Extractor] Got array buffer: ${arrayBuffer.byteLength} bytes`)

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  console.log(`[PDF Extractor] PDF loaded, pages: ${pdf.numPages}`)

  const textParts: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Extract text items and join them
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ')

    console.log(`[PDF Extractor] Page ${pageNum}: ${pageText.length} chars`)
    textParts.push(pageText)
  }

  const fullText = textParts.join('\n\n')
  console.log(`[PDF Extractor] Total extracted: ${fullText.length} chars`)

  // Log first 200 chars as preview
  console.log(`[PDF Extractor] Preview: ${fullText.substring(0, 200)}...`)

  return fullText
}
