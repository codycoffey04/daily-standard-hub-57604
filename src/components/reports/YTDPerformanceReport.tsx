import * as React from "react";
import { useMemo } from "react";
import { Info, LineChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { useProducerTrends } from '@/hooks/useProducerTrends';
import { today } from '@/lib/timezone';

// YTD Report now focuses solely on Items Sold and Sales (Households)
// Removed: qhh, dials, talk (those belong in Execution Dashboard)

interface YTDPerformanceReportProps {
  selectedYear: number
  // selectedMonth removed - YTD always uses full year to date
}

export default function YTDPerformanceReport({ selectedYear }: YTDPerformanceReportProps) {
  // Calculate YTD range: Jan 1 to Today (current year) or Dec 31 (past year)
  const [fromDate, toDate] = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const startDate = `${selectedYear}-01-01`
    
    let endDate: string
    if (selectedYear === currentYear) {
      endDate = today()
    } else if (selectedYear < currentYear) {
      endDate = `${selectedYear}-12-31`
    } else {
      endDate = `${selectedYear}-12-31`
    }
    
    return [startDate, endDate]
  }, [selectedYear]);

  // Fetch producer trends - hook now returns pre-aggregated { byProducer, totals }
  const { data: trends, isLoading, error: queryError } = useProducerTrends(
    null, // null = all producers
    fromDate,
    toDate
  );

  // Use trends totals directly (no manual aggregation, no merging with funnel data)
  const trendsTotals = trends?.totals ?? { items: 0, households: 0 }

  // Dev guard: catch pollution from execution funnel or other sources
  if (process.env.NODE_ENV !== 'production' && trends) {
    const forbiddenKeys = ['qhh', 'dials', 'talk', 'premium', 'policies_sold', 'items_sold']
    const actualKeys = Object.keys(trendsTotals)
    const hasForbidden = actualKeys.some(k => forbiddenKeys.includes(k))
    
    if (hasForbidden) {
      console.error('[YTD Guard] trendsTotals polluted by non-trends keys:', actualKeys)
      throw new Error('[YTD Guard] trendsTotals contains forbidden keys - check for object merges/spreads')
    }
    
    console.debug('[YTD Debug] trendsTotals for display:', {
      items: trendsTotals.items,
      households: trendsTotals.households
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <LineChart className="h-5 w-5 text-muted-foreground" />
          <CardTitle>YTD Performance (Loading…)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (queryError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load YTD Performance</AlertTitle>
        <AlertDescription>{queryError.message}</AlertDescription>
      </Alert>
    );
  }

  if (!trends || trends.byProducer.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No YTD data found</AlertTitle>
        <AlertDescription>
          No performance data found for {selectedYear}.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-muted-foreground" />
          <CardTitle>
            YTD Sales Performance {selectedYear}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Team Totals - Only Items and Households */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Items Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(trendsTotals.items)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total items in period</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Sales (HH)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(trendsTotals.households)}</div>
              <p className="text-xs text-muted-foreground mt-1">Households sold in period</p>
            </CardContent>
          </Card>
        </div>

        {/* Per-Producer Breakdown */}
        <div>
          <h3 className="text-sm font-medium mb-3">Performance by Producer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {trends.byProducer.map((producer) => (
              <Card key={producer.producerName} className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">{producer.producerName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b py-1.5">
                      <span className="text-sm text-muted-foreground">Items Sold</span>
                      <span className="text-lg font-semibold">{formatNumber(producer.items)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b py-1.5 last:border-b-0">
                      <span className="text-sm text-muted-foreground">Sales (HH)</span>
                      <span className="text-lg font-semibold">{formatNumber(producer.households)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- UI bits ---------- */

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}
