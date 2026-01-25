import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Database, Eye, Archive } from 'lucide-react'
import { PeriodSelector } from '@/components/email-updates/PeriodSelector'
import { ProductionMetricsInput } from '@/components/email-updates/ProductionMetricsInput'
import { LeadSourceMetricsInput } from '@/components/email-updates/LeadSourceMetricsInput'
import { TDSActivityPreview } from '@/components/email-updates/TDSActivityPreview'
import { MetricsSummaryCard } from '@/components/email-updates/MetricsSummaryCard'
import { EmailGenerator } from '@/components/email-updates/EmailGenerator'
import { EmailPreview } from '@/components/email-updates/EmailPreview'
import { EmailArchive } from '@/components/email-updates/EmailArchive'
import { useEmailMetrics, type PeriodType } from '@/hooks/useEmailMetrics'
import { useEmailLeadSources } from '@/hooks/useEmailLeadSources'
import { useEmailGeneration } from '@/hooks/useEmailGeneration'

const EmailUpdatesPage: React.FC = () => {
  const [periodType, setPeriodType] = useState<PeriodType>('weekly')
  const [selectedPeriodStart, setSelectedPeriodStart] = useState<Date>(() => {
    // Default to current week's Monday
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - (day === 0 ? 6 : day - 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const {
    metrics,
    isLoading: metricsLoading,
    rawProductionPaste,
    setRawProductionPaste,
    parsedProduction,
    parseError: productionParseError,
    tdsActivity,
    tdsLoading,
    deltas,
    saveMetrics,
    isSaving: isSavingProduction,
    refetch: refetchMetrics,
    periodStartStr,
    periodEndStr
  } = useEmailMetrics(selectedPeriodStart, periodType)

  const {
    leadSources,
    isLoading: leadSourcesLoading,
    rawLeadSourcePaste,
    setRawLeadSourcePaste,
    parsedLeadSources,
    parsedTotals,
    csrTotals,
    parseError: leadSourceParseError,
    saveLeadSources,
    isSaving: isSavingLeadSources
  } = useEmailLeadSources(metrics?.id)

  const {
    existingEmail,
    generationStatus,
    generatedEmail,
    isGenerating,
    generateEmail
  } = useEmailGeneration(periodStartStr, periodType)

  // Combined metrics for summary card
  const summaryMetrics = useMemo(() => {
    return {
      teamSales: metrics?.team_sales || 0,
      teamItems: metrics?.team_items || 0,
      teamPremium: Number(metrics?.team_premium) || 0,
      teamQhh: metrics?.team_qhh || 0,
      teamQuotes: metrics?.team_quotes || 0
    }
  }, [metrics])

  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type)
    // Reset to appropriate current period
    const d = new Date()
    if (type === 'weekly') {
      const day = d.getDay()
      const diff = d.getDate() - (day === 0 ? 6 : day - 1)
      d.setDate(diff)
      d.setHours(0, 0, 0, 0)
    } else {
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
    }
    setSelectedPeriodStart(d)
  }

  const handleSaveProduction = () => {
    // Save with TDS activity included
    saveMetrics({ includeTDS: true })
  }

  const handleGenerateEmail = (announcements: string) => {
    if (!metrics?.id) return

    generateEmail({
      emailMetricsId: metrics.id,
      emailType: periodType,
      announcements: announcements || undefined,
      compareWithPreviousPeriod: true
    })
  }

  // Determine which email content to show (generated or existing)
  const emailToShow = generatedEmail || (existingEmail ? {
    subject_line: existingEmail.subject_line,
    html_content: existingEmail.html_content,
    markdown_content: existingEmail.markdown_content
  } : null)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Email Updates</h1>
            <p className="text-sm text-muted-foreground">
              Generate weekly and monthly team performance emails
            </p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <PeriodSelector
            periodType={periodType}
            selectedPeriodStart={selectedPeriodStart}
            onPeriodTypeChange={handlePeriodTypeChange}
            onPeriodChange={setSelectedPeriodStart}
          />
        </CardContent>
      </Card>

      {/* Summary Card (show when we have data) */}
      {metrics && (
        <MetricsSummaryCard
          teamSales={summaryMetrics.teamSales}
          teamItems={summaryMetrics.teamItems}
          teamPremium={summaryMetrics.teamPremium}
          teamQhh={summaryMetrics.teamQhh}
          teamQuotes={summaryMetrics.teamQuotes}
          deltas={deltas}
          periodType={periodType}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Input
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!metrics}>
            <Eye className="h-4 w-4" />
            Generate & Preview
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archive
          </TabsTrigger>
        </TabsList>

        {/* Data Input Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Production Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Production Data</CardTitle>
                <CardDescription>
                  Upload AgencyZoom producer breakdown (Sales, Items, Premium)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductionMetricsInput
                  rawPaste={rawProductionPaste}
                  onRawPasteChange={setRawProductionPaste}
                  parsedMetrics={parsedProduction}
                  parseError={productionParseError}
                  onSave={handleSaveProduction}
                  isSaving={isSavingProduction}
                  hasExistingMetrics={!!metrics}
                />
              </CardContent>
            </Card>

            {/* Lead Source Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Source Data</CardTitle>
                <CardDescription>
                  Upload AgencyZoom lead source breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeadSourceMetricsInput
                  rawPaste={rawLeadSourcePaste}
                  onRawPasteChange={setRawLeadSourcePaste}
                  parsedLeadSources={parsedLeadSources}
                  parsedTotals={parsedTotals}
                  csrTotals={csrTotals}
                  parseError={leadSourceParseError}
                  onSave={saveLeadSources}
                  isSaving={isSavingLeadSources}
                  hasExistingData={!!(leadSources && leadSources.length > 0)}
                  disabled={!metrics}
                />
              </CardContent>
            </Card>
          </div>

          {/* TDS Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">TDS Activity</CardTitle>
              <CardDescription>
                Automatically pulled from daily entries for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TDSActivityPreview
                tdsActivity={tdsActivity}
                isLoading={tdsLoading}
                periodStartStr={periodStartStr}
                periodEndStr={periodEndStr}
                onRefresh={() => refetchMetrics()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate & Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Email</CardTitle>
              <CardDescription>
                Generate a {periodType} team update email using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailGenerator
                emailMetricsId={metrics?.id}
                periodType={periodType}
                periodStart={periodStartStr}
                periodEnd={periodEndStr}
                hasExistingEmail={!!existingEmail}
                generationStatus={generationStatus}
                isGenerating={isGenerating}
                existingEmailTimestamp={existingEmail?.created_at}
                onGenerate={handleGenerateEmail}
              />
            </CardContent>
          </Card>

          {emailToShow && (
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  Copy HTML and paste directly into Outlook
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailPreview
                  subjectLine={emailToShow.subject_line}
                  htmlContent={emailToShow.html_content}
                  markdownContent={emailToShow.markdown_content}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Archive</CardTitle>
              <CardDescription>
                View and copy previously generated emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailArchive />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EmailUpdatesPage
