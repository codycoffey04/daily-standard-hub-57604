import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Info, LineChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { supabase } from '@/integrations/supabase/client';
import { useProducerTrends } from '@/hooks/useProducerTrends';
import { today } from '@/lib/timezone';

type MetricKey = "qhh" | "items" | "sales" | "dials" | "talk";

function getMonthRange(fromYm: string, toYm: string) {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  const out: string[] = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function ymLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const short = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];
  return `${short} ${y}`;
}

function zeroTotals() {
  return { qhh: 0, items: 0, sales: 0, dials: 0, talk: 0 };
}
type Totals = ReturnType<typeof zeroTotals>;

type ProducerRollup = {
  producerId: string;
  producerName: string;
  totals: Totals;
  byMonth: Record<string, Totals>; // 'YYYY-MM' -> totals
};

interface YTDPerformanceReportProps {
  selectedYear: number
  // selectedMonth removed - YTD always uses full year to date
}

export default function YTDPerformanceReport({ selectedYear }: YTDPerformanceReportProps) {
  const [metric, setMetric] = useState<MetricKey>("qhh");

  // Calculate YTD range: Jan 1 to Today (current year) or Dec 31 (past year)
  const [fromYm, toYm, months] = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // 1-12
    
    const startYm = `${selectedYear}-01`
    
    let endYm: string
    let endMonth: number
    
    if (selectedYear === currentYear) {
      // Current year: Use today's month
      endYm = `${selectedYear}-${String(currentMonth).padStart(2, '0')}`
      endMonth = currentMonth
    } else if (selectedYear < currentYear) {
      // Past year: Use December
      endYm = `${selectedYear}-12`
      endMonth = 12
    } else {
      // Future year: Use December (shouldn't happen, but handle it)
      endYm = `${selectedYear}-12`
      endMonth = 12
    }
    
    // Generate all months from Jan to end month
    const monthsList: string[] = []
    for (let m = 1; m <= endMonth; m++) {
      monthsList.push(`${selectedYear}-${String(m).padStart(2, '0')}`)
    }
    
    return [startYm, endYm, monthsList]
  }, [selectedYear])

  // Convert month range to date range for get_producer_trends
  const fromDate = `${selectedYear}-01-01`;
  const toDate = useMemo(() => {
    const currentYear = new Date().getFullYear()
    
    if (selectedYear === currentYear) {
      // Current year: Use today's date
      return today()
    } else if (selectedYear < currentYear) {
      // Past year: Use Dec 31
      return `${selectedYear}-12-31`
    } else {
      // Future year: Use Dec 31
      return `${selectedYear}-12-31`
    }
  }, [selectedYear]);

  // Fetch producer trends (daily data) and aggregate by month in TypeScript
  const { data: trendsData, isLoading, error: queryError } = useProducerTrends(
    null, // null = all producers
    fromDate,
    toDate
  );

  // Debug: Log raw data from RPC
  useEffect(() => {
    if (trendsData) {
      console.log('[YTD Debug] Raw trendsData from RPC:', trendsData);
      console.log('[YTD Debug] Total rows:', trendsData.length);
      
      // Group by producer to see daily breakdown
      const byProducer = trendsData.reduce((acc, row) => {
        if (!acc[row.producer_name]) acc[row.producer_name] = [];
        acc[row.producer_name].push({
          date: row.entry_date,
          policies: row.policies_sold,
          items: row.items_sold
        });
        return acc;
      }, {} as Record<string, any[]>);
      
      console.log('[YTD Debug] Grouped by producer:', byProducer);
      
      // Calculate expected totals
      const expectedSales = trendsData.reduce((sum, row) => sum + row.policies_sold, 0);
      const expectedItems = trendsData.reduce((sum, row) => sum + row.items_sold, 0);
      console.log('[YTD Debug] Expected totals - Sales:', expectedSales, 'Items:', expectedItems);
    }
  }, [trendsData]);

  const rollups = useMemo<ProducerRollup[]>(() => {
    if (!trendsData || !months.length) return [];

    const byProducer: Record<string, ProducerRollup> = {};

    // Process ALL daily rows (not just the first one per producer)
    for (const dailyRow of trendsData) {
      // Skip rows with missing required fields
      if (!dailyRow.producer_id || !dailyRow.entry_date) {
        console.warn('[YTDPerformanceReport] Skipping row with missing data:', dailyRow);
        continue;
      }

      // Initialize producer if not exists
      if (!byProducer[dailyRow.producer_id]) {
        byProducer[dailyRow.producer_id] = {
          producerId: dailyRow.producer_id,
          producerName: dailyRow.producer_name,
          totals: zeroTotals(),
          byMonth: months.reduce((acc, ym) => {
            acc[ym] = zeroTotals();
            return acc;
          }, {} as Record<string, Totals>),
        };
      }

      const rollup = byProducer[dailyRow.producer_id];
      
      // Extract year-month from entry_date (format: "YYYY-MM-DD")
      const ym = dailyRow.entry_date?.substring(0, 7);

      // Skip rows with invalid dates
      if (!ym || !months.includes(ym)) {
        console.warn('[YTDPerformanceReport] Skipping row with invalid date:', dailyRow);
        continue;
      }
      
      // Accumulate into totals
      rollup.totals.qhh += dailyRow.qhh;
      rollup.totals.items += dailyRow.items_sold;
      rollup.totals.sales += dailyRow.policies_sold;
      rollup.totals.dials += dailyRow.outbound_dials;
      rollup.totals.talk += dailyRow.talk_minutes;
      
      // Accumulate into monthly breakdown
      if (rollup.byMonth[ym]) {
        rollup.byMonth[ym].qhh += dailyRow.qhh;
        rollup.byMonth[ym].items += dailyRow.items_sold;
        rollup.byMonth[ym].sales += dailyRow.policies_sold;
        rollup.byMonth[ym].dials += dailyRow.outbound_dials;
        rollup.byMonth[ym].talk += dailyRow.talk_minutes;
      }
    }

    // Return ordered by producer name
    return Object.values(byProducer).sort((a, b) =>
      a.producerName.localeCompare(b.producerName)
    );
  }, [trendsData, months]);

  const teamTotals = useMemo<Totals>(() => {
    const t = zeroTotals();
    for (const r of rollups) {
      t.qhh += r.totals.qhh;
      t.items += r.totals.items;
      t.sales += r.totals.sales;
      t.dials += r.totals.dials;
      t.talk += r.totals.talk;
    }
    
    // Debug: Log aggregated totals before display
    console.log('[YTD Debug] teamTotals being displayed:', t);
    console.log('[YTD Debug] Rollups detail:', rollups.map(r => ({
      name: r.producerName,
      sales: r.totals.sales,
      items: r.totals.items
    })));
    
    return t;
  }, [rollups]);

  const chartSeries = useMemo(() => {
    const key = metric;
    const series = rollups.map((r, idx) => ({
      label: r.producerName,
      color: ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6"][idx % 4],
      data: months.map((ym) => r.byMonth[ym]?.[key] ?? 0),
    }));
    const maxVal = Math.max(1, ...series.flatMap((s) => s.data));
    return { series, maxVal };
  }, [rollups, metric, months]);

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

  if (!rollups.length) {
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
            YTD Performance {selectedYear}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Metric:</span>
          <Select value={metric} onValueChange={(v: MetricKey) => setMetric(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Choose metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qhh">QHH (Quoted Households)</SelectItem>
              <SelectItem value="items">Items Sold</SelectItem>
              <SelectItem value="sales">Sales (Households)</SelectItem>
              <SelectItem value="dials">Outbound Dials</SelectItem>
              <SelectItem value="talk">Talk Time (min)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Team Totals */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <MetricTile label="Team QHH" value={teamTotals.qhh} />
          <MetricTile label="Team Items Sold" value={teamTotals.items} />
          <MetricTile label="Team Sales (HH)" value={teamTotals.sales} />
          <MetricTile label="Team Dials" value={teamTotals.dials} />
          <MetricTile label="Team Talk Time (min)" value={teamTotals.talk} />
        </div>

        {/* Per-Producer Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rollups.map((r) => (
            <Card key={r.producerId} className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">{r.producerName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <MetricRow label="QHH" value={r.totals.qhh} />
                  <MetricRow label="Items Sold" value={r.totals.items} />
                  <MetricRow label="Sales (HH)" value={r.totals.sales} />
                  <MetricRow label="Dials" value={r.totals.dials} />
                  <MetricRow label="Talk (min)" value={r.totals.talk} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Breakdown Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Monthly breakdown: <strong>{metricLabel(metric)}</strong>
            </div>
            <Legend series={chartSeries.series} />
          </div>
          {months.length === 1 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Trend lines will display when multiple months of data are available. Current view shows {ymLabel(months[0])} data only.
              </AlertDescription>
            </Alert>
          )}
          <MultiLineChart
            months={months.map(ymLabel)}
            series={chartSeries.series}
            max={chartSeries.maxVal}
          />
        </div>

        {/* Monthly table (quick audit) */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="py-2 pr-4">Producer</th>
                {months.map((m) => (
                  <th key={m} className="py-2 px-2">{ymLabel(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rollups.map((r) => (
                <tr key={r.producerId} className="border-t">
                  <td className="py-2 pr-4 font-medium">{r.producerName}</td>
                  {months.map((m) => (
                    <td key={m} className="py-2 px-2">
                      {formatNumber(r.byMonth[m]?.[metric] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- UI bits ---------- */

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{formatNumber(value)}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b py-1 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatNumber(value)}</span>
    </div>
  );
}

function Legend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-3">
      {series.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          <span className="text-xs">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function metricLabel(m: MetricKey) {
  switch (m) {
    case "qhh": return "QHH (Quoted Households)";
    case "items": return "Items Sold";
    case "sales": return "Sales (Households)";
    case "dials": return "Outbound Dials";
    case "talk": return "Talk Time (min)";
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

/**
 * Dependency-free responsive multi-line chart using SVG.
 */
function MultiLineChart({
  months,
  series,
  max,
}: {
  months: string[];
  series: { label: string; color: string; data: number[] }[];
  max: number;
}) {
  const W = 720;   // virtual width
  const H = 160;   // virtual height
  const P = 20;    // padding

  // Handle single month case by centering the data point
  const xStep = months.length > 1 ? (W - 2 * P) / (months.length - 1) : 0;
  const getX = (i: number) => {
    if (months.length === 1) return W / 2; // Center for single month
    return P + i * xStep;
  };
  
  const yScale = (v: number) => {
    const clamped = Math.max(0, v);
    return H - P - (clamped / max) * (H - 2 * P);
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" preserveAspectRatio="none" className="overflow-visible">
        {/* Axes (light) */}
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#e5e7eb" />
        <line x1={P} y1={P} x2={P} y2={H - P} stroke="#e5e7eb" />

        {/* Month ticks */}
        {months.map((m, i) => {
          const x = getX(i);
          return (
            <g key={m}>
              <line x1={x} y1={H - P} x2={x} y2={H - P + 4} stroke="#e5e7eb" />
              <text x={x} y={H - 2} fontSize="10" textAnchor="middle" fill="#6b7280">{m}</text>
            </g>
          );
        })}

        {/* Lines */}
        {series.map((s) => {
          const d = s.data.map((v, i) => {
            const x = getX(i);
            const y = yScale(v);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          }).join(" ");

          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
              {s.data.map((v, i) => {
                const x = getX(i);
                const y = yScale(v);
                return <circle key={i} cx={x} cy={y} r={2.5} fill={s.color} />;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
