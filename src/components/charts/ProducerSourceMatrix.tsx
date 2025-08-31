import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ProducerSourceMatrixData } from '@/hooks/useSummariesData'

interface ProducerSourceMatrixProps {
  data: ProducerSourceMatrixData[]
  height?: number
}

export const ProducerSourceMatrix: React.FC<ProducerSourceMatrixProps> = ({
  data,
  height = 300
}) => {
  // Create matrix structure
  const producers = [...new Set(data.map(d => d.producer_name))].sort()
  const sources = [...new Set(data.map(d => d.source_name))].sort()
  
  // Create lookup map
  const dataMap = data.reduce((acc, item) => {
    const key = `${item.producer_name}|${item.source_name}`
    acc[key] = item
    return acc
  }, {} as Record<string, ProducerSourceMatrixData>)

  // Calculate max values for color scaling
  const maxQuotes = Math.max(...data.map(d => d.quotes), 1)
  const maxQHH = Math.max(...data.map(d => d.qhh), 1)

  const getIntensity = (quotes: number, qhh: number) => {
    const quotesIntensity = quotes / maxQuotes
    const qhhIntensity = qhh / maxQHH
    return Math.max(quotesIntensity, qhhIntensity)
  }

  const getBackgroundColor = (intensity: number) => {
    if (intensity === 0) return 'hsl(var(--muted))'
    const opacity = Math.max(0.1, intensity)
    return `hsl(var(--primary) / ${opacity})`
  }

  return (
    <div className="w-full overflow-auto" style={{ height }}>
      <div className="min-w-max">
        <div className="grid grid-cols-1 gap-1" style={{ 
          gridTemplateColumns: `120px repeat(${sources.length}, minmax(80px, 1fr))` 
        }}>
          {/* Header row */}
          <div></div>
          {sources.map(source => (
            <div 
              key={source} 
              className="text-xs font-medium p-2 text-center bg-muted/50 rounded"
            >
              {source}
            </div>
          ))}
          
          {/* Data rows */}
          {producers.map(producer => (
            <React.Fragment key={producer}>
              <div className="text-xs font-medium p-2 bg-muted/30 rounded flex items-center">
                {producer}
              </div>
              {sources.map(source => {
                const key = `${producer}|${source}`
                const cellData = dataMap[key]
                const quotes = cellData?.quotes || 0
                const qhh = cellData?.qhh || 0
                const items = cellData?.items || 0
                const intensity = getIntensity(quotes, qhh)
                
                return (
                  <Card 
                    key={source} 
                    className="m-0.5"
                    style={{ backgroundColor: getBackgroundColor(intensity) }}
                  >
                    <CardContent className="p-2 text-center">
                      <div className="text-xs font-medium">{quotes}</div>
                      <div className="text-xs text-muted-foreground">Q</div>
                      <div className="text-xs">{qhh}</div>
                      <div className="text-xs text-muted-foreground">QHH</div>
                      {items > 0 && (
                        <>
                          <div className="text-xs font-medium text-primary">{items}</div>
                          <div className="text-xs text-muted-foreground">I</div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}