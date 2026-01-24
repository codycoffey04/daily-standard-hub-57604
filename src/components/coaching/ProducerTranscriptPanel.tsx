import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TranscriptUploader, type UploadedFile } from './TranscriptUploader'
import { User, CheckCircle } from 'lucide-react'

interface ProducerTranscriptPanelProps {
  producerName: string
  producerDisplayName: string
  uploadedFiles: UploadedFile[]
  onFilesSelected: (files: File[]) => void
  onRemoveFile: (id: string) => void
  isReady: boolean
  disabled?: boolean
}

export const ProducerTranscriptPanel: React.FC<ProducerTranscriptPanelProps> = ({
  producerName,
  producerDisplayName,
  uploadedFiles,
  onFilesSelected,
  onRemoveFile,
  isReady,
  disabled = false
}) => {
  const completedCount = uploadedFiles.filter(f => f.status === 'completed').length
  const requiredCount = 3

  return (
    <Card className={isReady ? 'border-green-500/50' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{producerDisplayName}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isReady ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="secondary">
                {completedCount}/{requiredCount} uploaded
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Upload 3 call transcripts from Total Recall for this week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TranscriptUploader
          uploadedFiles={uploadedFiles}
          onFilesSelected={onFilesSelected}
          onRemoveFile={onRemoveFile}
          maxFiles={requiredCount}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  )
}
