import { compress, CompressionError } from '@quicktoolsone/pdf-compress'

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  reductionPercent: number
}

/**
 * Compresses a PDF using @quicktoolsone/pdf-compress library.
 * Automatically adjusts settings based on file size:
 * - >50MB: MAX preset, 50 DPI, 0.5 quality (most aggressive)
 * - 20-50MB: BALANCED preset, 75 DPI
 * - <20MB: BALANCED preset, 100 DPI
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
  const sizeMB = originalSize / (1024 * 1024)

  console.log(`[Compress] Starting: ${file.name} (${sizeMB.toFixed(1)} MB)`)

  // Configure based on file size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    onProgress: (event: { progress?: number; message?: string }) => {
      if (onProgress && event.progress !== undefined) {
        onProgress(event.progress)
      }
      if (event.message) {
        console.log(`[Compress] ${event.message}`)
      }
    },
    chunkSize: 5,           // Process fewer pages at once for memory safety (default 10)
    timeout: 600000,        // 10 minutes for very large files (default 5 min)
    gracefulDegradation: true  // Fall back to lighter presets if needed
  }

  // Adaptive settings based on file size
  if (sizeMB > 50) {
    // Very large files (50MB+): most aggressive compression
    options.preset = 'max'
    options.targetDPI = 50
    options.jpegQuality = 0.5
    console.log(`[Compress] Using MAX preset (50 DPI) for ${sizeMB.toFixed(0)}MB file`)
  } else if (sizeMB > 20) {
    // Large files (20-50MB): aggressive compression
    options.preset = 'balanced'
    options.targetDPI = 75
    console.log(`[Compress] Using BALANCED preset (75 DPI) for ${sizeMB.toFixed(0)}MB file`)
  } else {
    // Normal files (<20MB): standard compression
    options.preset = 'balanced'
    options.targetDPI = 100
    console.log(`[Compress] Using BALANCED preset (100 DPI) for ${sizeMB.toFixed(0)}MB file`)
  }

  try {
    const result = await compress(arrayBuffer, options)

    const compressedSize = result.stats.compressedSize
    const reductionPercent = Math.round(result.stats.percentageSaved)

    console.log(`[Compress] Complete: ${sizeMB.toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB (${reductionPercent}% reduction)`)

    // Validate output - if compression resulted in a tiny/empty file, something went wrong
    if (compressedSize < 1000) {
      throw new Error(`Compression produced empty output (${compressedSize} bytes)`)
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
