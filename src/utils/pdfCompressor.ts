import { compress, CompressionError } from '@quicktoolsone/pdf-compress'

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  reductionPercent: number
}

/**
 * Compresses a PDF using @quicktoolsone/pdf-compress library.
 * Automatically adjusts DPI based on file size:
 * - >50MB → 50 DPI
 * - 20-50MB → 75 DPI
 * - 10-20MB → 100 DPI
 * - <10MB → 150 DPI
 *
 * @param file - The PDF file to compress
 * @param _scaleFactor - Ignored (library handles automatically)
 * @param _jpegQuality - Ignored (library handles automatically)
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise with compressed file and metadata
 */
export async function compressPdf(
  file: File,
  _scaleFactor?: number,
  _jpegQuality?: number,
  onProgress?: (percent: number) => void
): Promise<CompressionResult> {
  const originalSize = file.size
  const arrayBuffer = await file.arrayBuffer()

  console.log(`[Compress] Starting: ${file.name} (${(originalSize / 1024 / 1024).toFixed(1)} MB)`)

  try {
    const result = await compress(arrayBuffer, {
      preset: 'balanced',
      onProgress: (event) => {
        // Map library progress (0-100) to our callback
        if (onProgress && event.progress !== undefined) {
          onProgress(event.progress)
        }
        if (event.message) {
          console.log(`[Compress] ${event.message}`)
        }
      }
    })

    const compressedSize = result.stats.compressedSize
    const reductionPercent = Math.round(result.stats.percentageSaved)

    console.log(`[Compress] Complete: ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB (${reductionPercent}% reduction)`)

    // Validate output - if compression resulted in a tiny/empty file, something went wrong
    if (compressedSize < 1000) {
      throw new Error(`Compression failed: output file is only ${compressedSize} bytes (expected several MB)`)
    }

    // Create File from result
    const compressedBlob = new Blob([result.pdf], { type: 'application/pdf' })
    const compressedFile = new File([compressedBlob], file.name, { type: 'application/pdf' })

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      reductionPercent
    }
  } catch (error) {
    if (error instanceof CompressionError) {
      console.error('[Compress] Library error:', error.message)
    }
    throw error
  }
}
