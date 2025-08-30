import React, { useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthYearPickers } from '@/components/MonthYearPickers'
import { BarChart, Calendar } from 'lucide-react'

const SummariesPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <BarChart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Summaries & Reports</h1>
          </div>
          <p className="text-muted-foreground">
            Comprehensive analytics and performance summaries
          </p>
        </div>

        {/* Date Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Report Period</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthYearPickers
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
            />
          </CardContent>
        </Card>

        {/* Summary Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">QHH by Source</CardTitle>
              <CardDescription>Qualified household distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart placeholder - QHH by Source × Month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quotes by Producer</CardTitle>
              <CardDescription>Total quotes per producer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart placeholder - Total Quotes by Producer × Month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quotes by Source</CardTitle>
              <CardDescription>Quote generation by lead source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart placeholder - Total Quotes by Source × Month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items by LSP</CardTitle>
              <CardDescription>Items sold by producer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart placeholder - Items by LSP × Month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items by Source</CardTitle>
              <CardDescription>Sales performance by source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart placeholder - Items by Source × Month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Producer × Source Matrix</CardTitle>
              <CardDescription>Items by producer and source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart placeholder - Items by Producer × Source × Month
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Close Rate Analysis</CardTitle>
              <CardDescription>Close rate per source (Items ÷ QHH)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart placeholder - Close Rate per Source
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SummariesPage