import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConversionFunnelCard } from '@/components/insights/ConversionFunnelCard'
import { ProducerPerformanceCard } from '@/components/insights/ProducerPerformanceCard'
import { ActivePatternsCard } from '@/components/patterns/ActivePatternsCard'
import { CalendarIcon, Brain, Filter } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

export const PatternInsightsPage: React.FC = () => {
  // State for filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 14),
    to: new Date(),
  })
  const [selectedProducer, setSelectedProducer] = useState<string>('all')

  // Fetch producers for dropdown
  const { data: producers = [] } = useQuery({
    queryKey: ['producers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')

      if (error) throw error
      return data
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          Pattern Insights
        </h1>
        <p className="text-muted-foreground">
          AI-detected patterns and performance analysis across your team
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                      : 'Pick dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to })
                      }
                    }}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Producer Filter */}
            <div className="space-y-2">
              <Label>Producer</Label>
              <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Producers</SelectItem>
                  {producers.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Date Presets */}
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDateRange({
                      from: subDays(new Date(), 7),
                      to: new Date(),
                    })
                  }
                >
                  7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDateRange({
                      from: subDays(new Date(), 14),
                      to: new Date(),
                    })
                  }
                >
                  14 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDateRange({
                      from: subDays(new Date(), 30),
                      to: new Date(),
                    })
                  }
                >
                  30 days
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Patterns - Full Width at Top */}
      <div className="mb-6">
        <ActivePatternsCard selectedProducer={selectedProducer} />
      </div>

      {/* Performance Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionFunnelCard dateRange={dateRange} />
        <ProducerPerformanceCard dateRange={dateRange} selectedProducer={selectedProducer} />
      </div>
    </div>
  )
}
