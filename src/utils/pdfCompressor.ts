import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

// Configure worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  reductionPercent: number
}

/**
 * Compresses a PDF by rendering each page to canvas and rebuilding as JPEG images.
 * Ideal for image-based PDFs (like Total Recall screenshots) where text extraction doesn't apply.
 *
 * @param file - The PDF file to compress
 * @param scaleFactor - Scale factor for rendering (0.6 = 60% of original, reduces to 36% pixel area)
 * @param jpegQuality - JPEG quality (0-1, where 0.65 is good balance of quality/size)
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise with compressed file and metadata
 */
export async function compressPdf(
  file: File,
  scaleFactor = 0.6,
  jpegQuality = 0.65,
  onProgress?: (percent: number) => void
): Promise<CompressionResult> {
  const originalSize = file.size

  // Load source PDF with pdfjs
  const arrayBuffer = await file.arrayBuffer()
  const sourcePdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = sourcePdf.numPages

  console.log(`[Compress] Processing ${numPages} pages at ${scaleFactor}x scale, ${jpegQuality} JPEG quality`)

  // Create new PDF with pdf-lib
  const newPdf = await PDFDocument.create()

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await sourcePdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: scaleFactor })

    // Render to canvas
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Could not get canvas 2D context')
    }

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    // Convert canvas to JPEG blob
    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to JPEG blob'))
          }
        },
        'image/jpeg',
        jpegQuality
      )
    })

    // Embed in new PDF
    const jpegData = await jpegBlob.arrayBuffer()
    const jpegImage = await newPdf.embedJpg(new Uint8Array(jpegData))
    const newPage = newPdf.addPage([viewport.width, viewport.height])
    newPage.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    })

    // Report progress
    if (onProgress) {
      onProgress(Math.round((pageNum / numPages) * 100))
    }
  }

  const pdfBytes = await newPdf.save()
  const compressedBlob = new Blob([pdfBytes], { type: 'application/pdf' })
  const compressedFile = new File([compressedBlob], file.name, { type: 'application/pdf' })

  const compressedSize = compressedFile.size
  const reductionPercent = Math.round((1 - compressedSize / originalSize) * 100)

  console.log(`[Compress] Complete: ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB (${reductionPercent}% reduction)`)

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    reductionPercent
  }
}
