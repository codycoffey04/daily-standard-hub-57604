import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, Calendar, FileText, Mic, CheckCircle, Upload, AlertCircle, Users, Headphones } from 'lucide-react'
import { WeekSelector } from '@/components/coaching/WeekSelector'
import { MetricsInput } from '@/components/coaching/MetricsInput'
import { MetricsPreview } from '@/components/coaching/MetricsPreview'
import { ProducerTranscriptPanel } from '@/components/coaching/ProducerTranscriptPanel'
import { EpisodeGenerator } from '@/components/coaching/EpisodeGenerator'
import { EpisodeViewer } from '@/components/coaching/EpisodeViewer'
import { useCoachingMetrics } from '@/hooks/useCoachingMetrics'
import { useCoachingTranscripts } from '@/hooks/useCoachingTranscripts'
import { useEpisodeGeneration } from '@/hooks/useEpisodeGeneration'
import { useWeeklyProducerSummary } from '@/hooks/useWeeklyProducerSummary'

type CoachingMode = 'sales' | 'service'

const CoachingPage: React.FC = () => {
  // Mode toggle state
  const [coachingMode, setCoachingMode] = useState<CoachingMode>('sales')

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

  // Format dates for TDS query
  const weekStartStr = selectedWeekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Fetch TDS activity data (QHH, Quotes from quoted_households table) - only for sales mode
  const { data: tdsData, isLoading: isLoadingTDS } = useWeeklyProducerSummary(
    weekStartStr,
    weekEndStr,
    { enabled: coachingMode === 'sales' }
  )

  const {
    metrics,
    isLoading: isLoadingMetrics,
    rawPaste,
    setRawPaste,
    parsedMetrics,
    parseError,
    saveMetrics,
    isSaving,
    isSkipped: metricsSkipped
  } = useCoachingMetrics(selectedWeekStart, coachingMode)

  const {
    teamMembers,
    filesByMember,
    isLoadingTranscripts,
    handleFilesSelected,
    handleRemoveFile,
    allTranscriptsReady,
    getMemberReadyStatus
  } = useCoachingTranscripts(selectedWeekStart, coachingMode)

  const {
    episodes,
    scores,
    teamMembers: episodeTeamMembers,
    generationStatus,
    generateForMember,
    generateAll,
    isGeneratingAll,
    isGenerating,
    getEpisodeForMember,
    getScoresForEpisode
  } = useEpisodeGeneration(selectedWeekStart, coachingMode)

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // Reset selected member when mode changes
  React.useEffect(() => {
    setSelectedMemberId(null)
  }, [coachingMode])

  // Merge TDS activity data (QHH, Quotes) with AgencyZoom production data (Sales, Items, Premium) - only for sales mode
  const mergedMetrics = useMemo(() => {
    if (!metrics || coachingMode === 'service') return null

    const producerMetrics = metrics.producer_metrics as unknown as Record<string, {
      qhh: number
      quotes: number
      sales: number
      items: number
      premium: number
      close_rate: number
    }>

    if (!producerMetrics || !tdsData) return metrics

    // Create merged producer metrics by updating QHH and Quotes from TDS
    const merged: Record<string, {
      qhh: number
      quotes: number
      sales: number
      items: number
      premium: number
      close_rate: number
    }> = {}

    // Map TDS producer names to keys (lowercase)
    const tdsDataByKey = new Map<string, { qhh: number; quotes: number }>()
    for (const producer of tdsData) {
      const key = producer.producer_name.toLowerCase()
      tdsDataByKey.set(key, {
        qhh: producer.qhh,
        quotes: producer.quotes
      })
    }

    // Merge: use TDS for QHH/Quotes, AgencyZoom for Sales/Items/Premium
    for (const [key, azData] of Object.entries(producerMetrics)) {
      const tds = tdsDataByKey.get(key)
      const qhh = tds?.qhh ?? azData.qhh
      const quotes = tds?.quotes ?? azData.quotes
      const sales = azData.sales

      merged[key] = {
        qhh,
        quotes,
        sales: azData.sales,
        items: azData.items,
        premium: azData.premium,
        close_rate: qhh > 0 ? (sales / qhh) * 100 : 0
      }
    }

    // Calculate team totals from merged data
    let teamQhh = 0, teamQuotes = 0, teamSales = 0, teamItems = 0, teamPremium = 0
    for (const data of Object.values(merged)) {
      teamQhh += data.qhh
      teamQuotes += data.quotes
      teamSales += data.sales
      teamItems += data.items
      teamPremium += data.premium
    }

    return {
      ...metrics,
      producer_metrics: merged as unknown as typeof metrics.producer_metrics,
      team_qhh: teamQhh,
      team_quotes: teamQuotes,
      team_sales: teamSales,
      team_items: teamItems,
      team_premium: teamPremium,
      team_close_rate: teamQhh > 0 ? (teamSales / teamQhh) * 100 : 0
    }
  }, [metrics, tdsData, coachingMode])

  // Check if TDS has activity data for the week
  const hasTDSData = tdsData && tdsData.length > 0 && tdsData.some(p => p.qhh > 0)

  const handleWeekChange = (weekStart: Date) => {
    setSelectedWeekStart(weekStart)
  }

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${selectedWeekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}, ${selectedWeekStart.getFullYear()}`
  }

  // Calculate readiness status based on coaching mode
  const metricsReady = coachingMode === 'service' ? true : !!metrics // Service mode doesn't need metrics
  const transcriptsReady = allTranscriptsReady
  const canGenerate = metricsReady && transcriptsReady

  // Dynamic labels based on coaching mode
  const modeConfig = {
    sales: {
      title: 'Sales Coaching',
      description: 'Generate weekly coaching episodes for producers',
      memberLabel: 'Producer',
      membersLabel: 'Producers',
      icon: BookOpen
    },
    service: {
      title: 'Service Coaching',
      description: 'Generate weekly coaching episodes for CSRs',
      memberLabel: 'CSR',
      membersLabel: 'CSRs',
      icon: Headphones
    }
  }

  const config = modeConfig[coachingMode]
  const Icon = config.icon

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={coachingMode === 'sales' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCoachingMode('sales')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Sales Coaching
        </Button>
        <Button
          variant={coachingMode === 'service' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCoachingMode('service')}
          className="gap-2"
        >
          <Headphones className="h-4 w-4" />
          Service Coaching
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          {coachingMode === 'sales' && (
            <Badge variant={metricsReady ? 'default' : 'secondary'} className={metricsReady ? 'bg-green-500' : ''}>
              {metricsReady ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
              Metrics
            </Badge>
          )}
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
            coachingType={coachingMode}
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue={coachingMode === 'sales' ? 'metrics' : 'transcripts'} className="space-y-4">
        <TabsList className={`grid w-full ${coachingMode === 'sales' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {coachingMode === 'sales' && (
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Metrics
              {metricsReady && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
          )}
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

        {coachingMode === 'sales' && (
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
                    producers={teamMembers}
                  />
                </CardContent>
              </Card>

              {/* Metrics Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Combined Metrics</CardTitle>
                  <CardDescription>
                    {metrics
                      ? 'QHH/Quotes from TDS, Sales/Items/Premium from AgencyZoom'
                      : 'Preview of parsed data'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* TDS Data Status */}
                  {metrics && (
                    <div className="mb-4">
                      {isLoadingTDS ? (
                        <Badge variant="secondary" className="text-xs">
                          Loading TDS data...
                        </Badge>
                      ) : hasTDSData ? (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          TDS activity data loaded
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          No TDS activity data for this week
                        </Badge>
                      )}
                    </div>
                  )}
                  <MetricsPreview
                    metrics={mergedMetrics}
                    parsedMetrics={parsedMetrics}
                    isLoading={isLoadingMetrics || isLoadingTDS}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="transcripts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teamMembers.map(member => (
              <ProducerTranscriptPanel
                key={member.id}
                producerName={member.display_name.toLowerCase()}
                producerDisplayName={member.display_name}
                uploadedFiles={filesByMember[member.id] || []}
                onFilesSelected={(files) => handleFilesSelected(member.id, files)}
                onRemoveFile={(fileId) => handleRemoveFile(member.id, fileId)}
                isReady={getMemberReadyStatus(member.id)}
                disabled={isLoadingTranscripts}
                memberLabel={config.memberLabel}
              />
            ))}
          </div>

          {teamMembers.length === 0 && !isLoadingTranscripts && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No active {config.membersLabel.toLowerCase()} found.
                  {coachingMode === 'sales'
                    ? ' Add producers in the Team section.'
                    : ' Add CSR profiles in the database.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="episodes" className="space-y-6">
          {/* Episode Generator */}
          <EpisodeGenerator
            teamMembers={episodeTeamMembers}
            episodes={episodes}
            generationStatus={generationStatus}
            onGenerateAll={generateAll}
            onGenerateForMember={(memberId) => {
              generateForMember(memberId)
              setSelectedMemberId(memberId)
            }}
            isGenerating={isGenerating || isGeneratingAll}
            canGenerate={canGenerate}
            memberLabel={config.memberLabel}
            coachingType={coachingMode}
          />

          {/* Team Member Episode Selector */}
          {episodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">View Episode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {episodeTeamMembers.map(member => {
                    const hasEpisode = episodes.some(e =>
                      coachingMode === 'sales'
                        ? e.producer_id === member.id
                        : (e as any).csr_profile_id === member.id
                    )
                    const isSelected = selectedMemberId === member.id

                    return (
                      <Badge
                        key={member.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer ${hasEpisode ? '' : 'opacity-50'}`}
                        onClick={() => hasEpisode && setSelectedMemberId(member.id)}
                      >
                        {member.display_name}
                        {hasEpisode && <CheckCircle className="h-3 w-3 ml-1" />}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Episode Viewer */}
          {selectedMemberId && (
            <EpisodeViewer
              producer={episodeTeamMembers.find(m => m.id === selectedMemberId)!}
              episode={getEpisodeForMember(selectedMemberId)}
              scores={
                getEpisodeForMember(selectedMemberId)
                  ? getScoresForEpisode(getEpisodeForMember(selectedMemberId)!.id)
                  : []
              }
              coachingType={coachingMode}
            />
          )}

          {/* No Episode Selected State */}
          {episodes.length > 0 && !selectedMemberId && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Select a {config.memberLabel.toLowerCase()} above to view their coaching episode.
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
