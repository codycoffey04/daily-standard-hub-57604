import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { format } from 'date-fns'

interface QHHTrendChartProps {
  data: Array<{
    date: string
    [key: string]: string | number
  }>
  producerColors: Record<string, string>
  selectedProducers: string[]
}

export const QHHTrendChart: React.FC<QHHTrendChartProps> = ({
  data,
  producerColors,
  selectedProducers
}) => {
  const chartConfig = Object.entries(producerColors).reduce((acc, [producer, color]) => {
    acc[producer] = { label: producer, color }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
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
          {selectedProducers.map((producer) => (
            <Line
              key={producer}
              type="monotone"
              dataKey={producer}
              stroke={producerColors[producer]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
