import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { format } from 'date-fns'

interface FrameworkTrendChartProps {
  data: Array<{
    date: string
    Top: number
    Bottom: number
    Outside: number
  }>
}

export const FrameworkTrendChart: React.FC<FrameworkTrendChartProps> = ({ data }) => {
  const chartConfig = {
    Top: { label: "Top", color: "#10B981" },
    Bottom: { label: "Bottom", color: "#F59E0B" },
    Outside: { label: "Outside", color: "#EF4444" }
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          <Area 
            type="monotone" 
            dataKey="Top" 
            stackId="1"
            stroke="#10B981" 
            fill="#10B981" 
            fillOpacity={0.6}
          />
          <Area 
            type="monotone" 
            dataKey="Bottom" 
            stackId="1"
            stroke="#F59E0B" 
            fill="#F59E0B" 
            fillOpacity={0.6}
          />
          <Area 
            type="monotone" 
            dataKey="Outside" 
            stackId="1"
            stroke="#EF4444" 
            fill="#EF4444" 
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
