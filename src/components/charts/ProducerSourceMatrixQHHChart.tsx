import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { ProducerSourceMatrixData } from '@/hooks/useSummariesData'
import { formatNumber } from '@/lib/utils'

interface ProducerSourceMatrixQHHChartProps {
  data: ProducerSourceMatrixData[]
  height?: number
}

export const ProducerSourceMatrixQHHChart: React.FC<ProducerSourceMatrixQHHChartProps> = ({ 
  data, 
  height = 400 
}) => {
  // Get unique producers and sources
  const producers = [...new Set(data.map(d => d.producer_name))].sort()
  const sources = [...new Set(data.map(d => d.source_name))].sort()

  // Create matrix lookup
  const matrixData = new Map<string, number>()
  data.forEach(item => {
    matrixData.set(`${item.producer_name}-${item.source_name}`, item.qhh)
  })

  // Calculate totals
  const producerTotals = producers.map(producer => ({
    producer,
    total: data.filter(d => d.producer_name === producer).reduce((sum, d) => sum + d.qhh, 0)
  }))

  const sourceTotals = sources.map(source => ({
    source,
    total: data.filter(d => d.source_name === source).reduce((sum, d) => sum + d.qhh, 0)
  }))

  const grandTotal = data.reduce((sum, d) => sum + d.qhh, 0)
  const maxValue = Math.max(...data.map(d => d.qhh))

  // Color intensity based on value
  const getIntensity = (value: number): number => {
    if (maxValue === 0) return 0
    return value / maxValue
  }

  const getBackgroundColor = (intensity: number): string => {
    const opacity = 0.1 + (intensity * 0.6) // 10% to 70% opacity
    return `hsla(var(--chart-1) / ${opacity})`
  }

  // CSV Export
  const exportToCSV = () => {
    const csvData = [
      ['Producer', ...sources, 'Total'],
      ...producerTotals.map(pt => [
        pt.producer,
        ...sources.map(source => 
          formatNumber(matrixData.get(`${pt.producer}-${source}`) || 0)
        ),
        formatNumber(pt.total)
      ]),
      ['Total', ...sourceTotals.map(st => formatNumber(st.total)), formatNumber(grandTotal)]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'producer-source-qhh-matrix.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-auto" style={{ maxHeight: height }}>
        <div className="min-w-max">
          <div className="grid gap-1" style={{ 
            gridTemplateColumns: `200px repeat(${sources.length}, 100px) 120px` 
          }}>
            {/* Header */}
            <div className="font-semibold p-2 bg-muted text-center">Producer</div>
            {sources.map(source => (
              <div key={source} className="font-semibold p-2 bg-muted text-center text-xs">
                {source}
              </div>
            ))}
            <div className="font-semibold p-2 bg-muted text-center">Total</div>

            {/* Data rows */}
            {producerTotals.map(pt => (
              <React.Fragment key={pt.producer}>
                <div className="p-2 bg-muted font-medium text-sm truncate" title={pt.producer}>
                  {pt.producer}
                </div>
                {sources.map(source => {
                  const value = matrixData.get(`${pt.producer}-${source}`) || 0
                  const intensity = getIntensity(value)
                  return (
                    <Card 
                      key={`${pt.producer}-${source}`}
                      className="border-0 shadow-none"
                      style={{ backgroundColor: getBackgroundColor(intensity) }}
                    >
                      <CardContent className="p-2 text-center">
                        <div className="text-sm font-medium">
                          {formatNumber(value)}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                <div className="p-2 bg-accent font-semibold text-center">
                  {formatNumber(pt.total)}
                </div>
              </React.Fragment>
            ))}

            {/* Totals row */}
            <div className="font-semibold p-2 bg-accent text-center">Total</div>
            {sourceTotals.map(st => (
              <div key={st.source} className="font-semibold p-2 bg-accent text-center">
                {formatNumber(st.total)}
              </div>
            ))}
            <div className="font-bold p-2 bg-primary text-primary-foreground text-center">
              {formatNumber(grandTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}