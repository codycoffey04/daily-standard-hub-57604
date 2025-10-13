import React from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { format } from 'date-fns'

interface SalesPerformanceChartProps {
  data: Array<{
    date: string
    [key: string]: string | number
  }>
  producerColors: Record<string, string>
  selectedProducers: string[]
}

export const SalesPerformanceChart: React.FC<SalesPerformanceChartProps> = ({
  data,
  producerColors,
  selectedProducers
}) => {
  const chartConfig = Object.entries(producerColors).reduce((acc, [producer, color]) => {
    acc[`${producer}_premium`] = { label: `${producer} Premium`, color }
    acc[`${producer}_items`] = { label: `${producer} Items`, color }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <ChartContainer config={chartConfig} className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tickFormatter={(value) => format(new Date(value), 'M/d')}
          />
          <YAxis yAxisId="left" className="text-xs" />
          <YAxis yAxisId="right" orientation="right" className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {selectedProducers.map((producer) => (
            <React.Fragment key={producer}>
              <Bar
                yAxisId="left"
                dataKey={`${producer}_premium`}
                fill={producerColors[producer]}
                fillOpacity={0.6}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={`${producer}_items`}
                stroke={producerColors[producer]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={true}
              />
            </React.Fragment>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
