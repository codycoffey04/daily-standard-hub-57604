import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar, FileText, Mic, CheckCircle, Upload } from 'lucide-react'
import { WeekSelector } from '@/components/coaching/WeekSelector'
import { MetricsInput } from '@/components/coaching/MetricsInput'
import { MetricsPreview } from '@/components/coaching/MetricsPreview'
import { ProducerTranscriptPanel } from '@/components/coaching/ProducerTranscriptPanel'
import { EpisodeGenerator } from '@/components/coaching/EpisodeGenerator'
import { EpisodeViewer } from '@/components/coaching/EpisodeViewer'
import { useCoachingMetrics } from '@/hooks/useCoachingMetrics'
import { useCoachingTranscripts } from '@/hooks/useCoachingTranscripts'
import { useEpisodeGeneration } from '@/hooks/useEpisodeGeneration'

const CoachingPage: React.FC = () => {
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    // Default to current week's Monday
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  const weekEnd = new Date(selectedWeekStart)
  weekEnd.setDate(selectedWeekStart.getDate() + 6)

  const {
    metrics,
    isLoading: isLoadingMetrics,
    rawPaste,
    setRawPaste,
    parsedMetrics,
    parseError,
    saveMetrics,
    isSaving
  } = useCoachingMetrics(selectedWeekStart)

  const {
    producers,
    filesByProducer,
    isLoadingTranscripts,
    handleFilesSelected,
    handleRemoveFile,
    allTranscriptsReady,
    getProducerReadyStatus
  } = useCoachingTranscripts(selectedWeekStart)

  const {
    episodes,
    scores,
    producers: episodeProducers,
    generationStatus,
    generateForProducer,
    generateAll,
    isGeneratingAll,
    isGenerating,
    getEpisodeForProducer,
    getScoresForEpisode
  } = useEpisodeGeneration(selectedWeekStart)

  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null)

  const handleWeekChange = (weekStart: Date) => {
    setSelectedWeekStart(weekStart)
  }

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${selectedWeekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}, ${selectedWeekStart.getFullYear()}`
  }

  // Calculate readiness status
  const metricsReady = !!metrics
  const transcriptsReady = allTranscriptsReady
  const canGenerate = metricsReady && transcriptsReady

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sales Coaching</h1>
            <p className="text-muted-foreground">Generate weekly coaching episodes for producers</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <Badge variant={metricsReady ? 'default' : 'secondary'} className={metricsReady ? 'bg-green-500' : ''}>
            {metricsReady ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
            Metrics
          </Badge>
          <Badge variant={transcriptsReady ? 'default' : 'secondary'} className={transcriptsReady ? 'bg-green-500' : ''}>
            {transcriptsReady ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
            Transcripts
          </Badge>
        </div>
      </div>

      {/* Week Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Week Selection</CardTitle>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {formatDateRange()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <WeekSelector
            selectedWeekStart={selectedWeekStart}
            onWeekChange={handleWeekChange}
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Metrics
            {metricsReady && <CheckCircle className="h-3 w-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="transcripts" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Transcripts
            {transcriptsReady && <CheckCircle className="h-3 w-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="episodes" className="flex items-center gap-2" disabled={!canGenerate}>
            <Mic className="h-4 w-4" />
            Episodes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrics Input */}
            <Card>
              <CardHeader>
                <CardTitle>AgencyZoom Metrics</CardTitle>
                <CardDescription>
                  Upload CSV or paste weekly production data from AgencyZoom
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricsInput
                  rawPaste={rawPaste}
                  onRawPasteChange={setRawPaste}
                  parseError={parseError}
                  onSave={saveMetrics}
                  isSaving={isSaving}
                  hasExistingMetrics={!!metrics}
                  producers={producers}
                />
              </CardContent>
            </Card>

            {/* Metrics Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Parsed Metrics</CardTitle>
                <CardDescription>
                  {metrics ? 'Saved metrics for this week' : 'Preview of parsed data'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricsPreview
                  metrics={metrics}
                  parsedMetrics={parsedMetrics}
                  isLoading={isLoadingMetrics}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transcripts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {producers.map(producer => (
              <ProducerTranscriptPanel
                key={producer.id}
                producerName={producer.display_name.toLowerCase()}
                producerDisplayName={producer.display_name}
                uploadedFiles={filesByProducer[producer.id] || []}
                onFilesSelected={(files) => handleFilesSelected(producer.id, files)}
                onRemoveFile={(fileId) => handleRemoveFile(producer.id, fileId)}
                isReady={getProducerReadyStatus(producer.id)}
                disabled={isLoadingTranscripts}
              />
            ))}
          </div>

          {producers.length === 0 && !isLoadingTranscripts && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No active producers found. Add producers in the Team section.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="episodes" className="space-y-6">
          {/* Episode Generator */}
          <EpisodeGenerator
            producers={episodeProducers}
            episodes={episodes}
            generationStatus={generationStatus}
            onGenerateAll={generateAll}
            onGenerateForProducer={(producerId) => {
              generateForProducer(producerId)
              setSelectedProducerId(producerId)
            }}
            isGenerating={isGenerating || isGeneratingAll}
            canGenerate={canGenerate}
          />

          {/* Producer Episode Selector */}
          {episodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">View Episode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {episodeProducers.map(producer => {
                    const hasEpisode = episodes.some(e => e.producer_id === producer.id)
                    const isSelected = selectedProducerId === producer.id

                    return (
                      <Badge
                        key={producer.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer ${hasEpisode ? '' : 'opacity-50'}`}
                        onClick={() => hasEpisode && setSelectedProducerId(producer.id)}
                      >
                        {producer.display_name}
                        {hasEpisode && <CheckCircle className="h-3 w-3 ml-1" />}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Episode Viewer */}
          {selectedProducerId && (
            <EpisodeViewer
              producer={episodeProducers.find(p => p.id === selectedProducerId)!}
              episode={getEpisodeForProducer(selectedProducerId)}
              scores={
                getEpisodeForProducer(selectedProducerId)
                  ? getScoresForEpisode(getEpisodeForProducer(selectedProducerId)!.id)
                  : []
              }
            />
          )}

          {/* No Episode Selected State */}
          {episodes.length > 0 && !selectedProducerId && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Select a producer above to view their coaching episode.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CoachingPage
