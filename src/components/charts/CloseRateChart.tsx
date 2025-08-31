import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Bar, BarChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { CloseRateData } from '@/hooks/useSummariesData'

interface CloseRateChartProps {
  data: CloseRateData[]
  height?: number
}

export const CloseRateChart: React.FC<CloseRateChartProps> = ({
  data,
  height = 300
}) => {
  const chartConfig = {
    close_rate: {
      label: "Close Rate %",
      color: "hsl(var(--primary))",
    },
    items: {
      label: "Items",
      color: "hsl(var(--secondary))",
    },
    qhh: {
      label: "QHH",
      color: "hsl(var(--muted-foreground))",
    },
  }

  const chartData = data.map(item => ({
    name: item.source_name,
    close_rate: Number(item.close_rate.toFixed(2)),
    items: item.items,
    qhh: item.qhh
  }))

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="name" 
            className="text-xs"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis className="text-xs" />
          <ChartTooltip 
            content={<ChartTooltipContent 
              formatter={(value, name) => {
                if (name === 'close_rate') {
                  return [`${value}%`, 'Close Rate']
                }
                return [value, name === 'items' ? 'Items' : 'QHH']
              }}
            />}
          />
          <Bar 
            dataKey="close_rate" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}