import * as pdfjsLib from 'pdfjs-dist'

// Set worker source to CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * Extract text content from a PDF file
 * Uses pdf.js which is battle-tested and works reliably in browsers
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const textParts: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Extract text items and join them
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ')

    textParts.push(pageText)
  }

  // Join pages with double newlines for readability
  return textParts.join('\n\n')
}
