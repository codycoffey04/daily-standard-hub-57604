import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatNumber, truncateText } from '@/lib/utils'

interface SummaryBarChartProps {
  data: Array<{ name: string; value: number }>
  title: string
  color?: string
  height?: number
  formatValue?: (value: number) => string
}

export const SummaryBarChart: React.FC<SummaryBarChartProps> = ({
  data,
  title,
  color = "hsl(var(--primary))",
  height = 400,
  formatValue = (value) => formatNumber(value)
}) => {
  const chartConfig = {
    value: {
      label: title,
      color: color,
    },
  }

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 50, right: 30, left: 20, bottom: 120 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="name" 
            className="text-sm fill-foreground font-semibold"
            angle={-90}
            textAnchor="end"
            height={120}
            interval={0}
            tick={{ fontSize: 13, fontWeight: 600 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground" 
            tickFormatter={formatValue}
          />
          <ChartTooltip 
            content={<ChartTooltipContent 
              formatter={(value) => [formatValue(Number(value)), title]}
              labelFormatter={(label) => String(label)}
            />}
          />
          <Bar 
            dataKey="value" 
            fill={color}
            radius={[4, 4, 0, 0]}
          >
            <LabelList 
              dataKey="value" 
              position="top" 
              className="fill-foreground text-xs font-bold"
              formatter={(value: number) => formatValue(value)}
              offset={8}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}