import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface UploadedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  storagePath?: string
  extractionStatus?: 'pending' | 'extracting' | 'processing' | 'completed' | 'failed' | 'skipped'
  storedFileSize?: number // For files loaded from DB where File object is a dummy
}

interface TranscriptUploaderProps {
  uploadedFiles: UploadedFile[]
  onFilesSelected: (files: File[]) => void
  onRemoveFile: (id: string) => void
  maxFiles?: number
  disabled?: boolean
}

export const TranscriptUploader: React.FC<TranscriptUploaderProps> = ({
  uploadedFiles,
  onFilesSelected,
  onRemoveFile,
  maxFiles = 3,
  disabled = false
}) => {
  const remainingSlots = maxFiles - uploadedFiles.length

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return

    // Limit to remaining slots
    const filesToAdd = acceptedFiles.slice(0, remainingSlots)
    if (filesToAdd.length > 0) {
      onFilesSelected(filesToAdd)
    }
  }, [onFilesSelected, remainingSlots, disabled])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 100 * 1024 * 1024, // 100MB - Total Recall PDFs are 25-50MB
    maxFiles: remainingSlots,
    disabled: disabled || remainingSlots <= 0
  })

  const getStatusIcon = (status: UploadedFile['status'], extractionStatus?: UploadedFile['extractionStatus']) => {
    // If upload failed, show error
    if (status === 'error') {
      return <AlertCircle className="h-4 w-4 text-destructive" />
    }
    // If still uploading
    if (status === 'uploading') {
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />
    }
    // Upload complete - show success (Claude will read PDFs directly during generation)
    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    // Default pending
    return <FileText className="h-4 w-4 text-muted-foreground" />
  }

  const getStatusBadge = (status: UploadedFile['status'], progress?: number) => {
    if (status === 'completed') {
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Uploaded</Badge>
    }
    if (status === 'uploading') {
      // Show different status based on progress: <30% = compressing, >=30% = uploading
      if (progress !== undefined && progress < 30) {
        return <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">Compressing...</Badge>
      }
      return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Uploading...</Badge>
    }
    if (status === 'error') {
      return <Badge variant="destructive" className="text-xs">Failed</Badge>
    }
    if (status === 'pending') {
      return <Badge variant="secondary" className="text-xs">Pending</Badge>
    }
    return null
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          disabled || remainingSlots <= 0
            ? "border-muted bg-muted/20 cursor-not-allowed"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn(
          "h-8 w-8 mx-auto mb-2",
          disabled || remainingSlots <= 0 ? "text-muted-foreground/50" : "text-muted-foreground"
        )} />
        {isDragActive ? (
          <p className="text-sm text-primary">Drop the PDF files here...</p>
        ) : remainingSlots <= 0 ? (
          <p className="text-sm text-muted-foreground">Maximum files reached ({maxFiles})</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Drag & drop PDF transcripts here, or click to select
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {remainingSlots} of {maxFiles} slots remaining (max 100MB each)
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                file.status === 'error' ? "border-destructive/50 bg-destructive/5" :
                file.status === 'completed' ? "border-green-200 bg-green-50/50" :
                "border-border"
              )}
            >
              {getStatusIcon(file.status, file.extractionStatus)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  {getStatusBadge(file.status, file.progress)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.storedFileSize ?? file.file.size)}
                  {file.error && (
                    <span className="text-destructive ml-2">{file.error}</span>
                  )}
                </p>

                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-1 mt-1" />
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onRemoveFile(file.id)}
                disabled={file.status === 'uploading'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
