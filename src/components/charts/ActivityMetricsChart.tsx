import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface ActivityMetricsChartProps {
  data: Array<{
    date: string
    [key: string]: string | number
  }>
  producerColors: Record<string, string>
  selectedProducers: string[]
}

export const ActivityMetricsChart: React.FC<ActivityMetricsChartProps> = ({
  data,
  producerColors,
  selectedProducers
}) => {
  const [showDials, setShowDials] = useState(true)
  const [showTalkMinutes, setShowTalkMinutes] = useState(true)

  const chartConfig = Object.entries(producerColors).reduce((acc, [producer, color]) => {
    acc[`${producer}_dials`] = { label: `${producer} Dials`, color }
    acc[`${producer}_talk`] = { label: `${producer} Talk`, color }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={showDials ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDials(!showDials)}
        >
          Outbound Dials
        </Button>
        <Button
          variant={showTalkMinutes ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTalkMinutes(!showTalkMinutes)}
        >
          Talk Minutes
        </Button>
      </div>
      
      <ChartContainer config={chartConfig} className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tickFormatter={(value) => {
                try {
                  const dateObj = value instanceof Date ? value : new Date(value)
                  if (isNaN(dateObj.getTime())) return String(value)
                  return format(dateObj, 'M/d')
                } catch {
                  return String(value)
                }
              }}
            />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {showDials && selectedProducers.map((producer) => (
              <Line
                key={`${producer}_dials`}
                type="monotone"
                dataKey={`${producer}_dials`}
                stroke={producerColors[producer]}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={true}
              />
            ))}
            {showTalkMinutes && selectedProducers.map((producer) => (
              <Line
                key={`${producer}_talk`}
                type="monotone"
                dataKey={`${producer}_talk`}
                stroke={producerColors[producer]}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 2 }}
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
