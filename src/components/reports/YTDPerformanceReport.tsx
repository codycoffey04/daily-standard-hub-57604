import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Info, LineChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { supabase } from '@/integrations/supabase/client';
import { useProducerTrends } from '@/hooks/useProducerTrends';

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

export default function YTDPerformanceReport() {
  // Auto-derived month window
  const [fromYm, setFromYm] = useState<string | null>(null);
  const [toYm, setToYm] = useState<string | null>(null);
  const [months, setMonths] = useState<string[]>([]);

  const [metric, setMetric] = useState<MetricKey>("qhh");

  // Fetch date range from daily_entries to determine YTD window
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // 0) Latest month in the dataset -> defines the active "YTD" year
        const latestRes = await supabase
          .from("daily_entries")
          .select("entry_month")
          .order("entry_month", { ascending: false })
          .limit(1);
        if (latestRes.error) throw latestRes.error;

        const latestYm = latestRes.data?.[0]?.entry_month ?? null;
        if (!latestYm) {
          if (!cancelled) {
            setFromYm(null);
            setToYm(null);
            setMonths([]);
          }
          return; // No data at all
        }

        const activeYear = latestYm.split("-")[0];

        // 1) Earliest month in *that same year*
        const earliestRes = await supabase
          .from("daily_entries")
          .select("entry_month")
          .like("entry_month", `${activeYear}-%`)
          .order("entry_month", { ascending: true })
          .limit(1);
        if (earliestRes.error) throw earliestRes.error;

        const earliestYmInYear = earliestRes.data?.[0]?.entry_month ?? `${activeYear}-01`;

        const MONTHS = getMonthRange(earliestYmInYear, latestYm);

        if (!cancelled) {
          setFromYm(earliestYmInYear);
          setToYm(latestYm);
          setMonths(MONTHS);
        }
      } catch (e: any) {
        console.error('Error determining YTD date range:', e);
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  // Convert month range to date range for get_producer_trends
  const fromDate = fromYm ? `${fromYm}-01` : '';
  const toDate = useMemo(() => {
    if (!toYm) return '';
    const [year, month] = toYm.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${toYm}-${String(lastDay).padStart(2, '0')}`;
  }, [toYm]);

  // Fetch producer trends (daily data) and aggregate by month in TypeScript
  const { data: trendsData, isLoading, error: queryError } = useProducerTrends(
    null, // null = all producers
    fromDate,
    toDate
  );

  const rollups = useMemo<ProducerRollup[]>(() => {
    if (!trendsData || !months.length) return [];

    const byProducer: Record<string, ProducerRollup> = {};

    // Initialize structure for all producers in the data
    const uniqueProducers = [...new Set(trendsData.map(d => d.producer_id))];
    for (const prodId of uniqueProducers) {
      const prodData = trendsData.find(d => d.producer_id === prodId);
      if (!prodData) continue;

      byProducer[prodId] = {
        producerId: prodId,
        producerName: prodData.producer_name,
        totals: zeroTotals(),
        byMonth: months.reduce((acc, ym) => {
          acc[ym] = zeroTotals();
          return acc;
        }, {} as Record<string, Totals>),
      };
    }

    // Aggregate daily producer trends by month
    for (const row of trendsData) {
      const p = byProducer[row.producer_id];
      if (!p || !row.entry_date) continue;

      // Extract YYYY-MM from entry_date (YYYY-MM-DD)
      const entryMonth = row.entry_date.substring(0, 7);
      const m = p.byMonth[entryMonth];
      if (!m) continue;

      // Aggregate metrics (QHH is already daily total from daily_entries.qhh_total)
      m.qhh += row.qhh;
      m.items += row.items;
      m.sales += row.sold_items; // Use sold_items for sales count
      m.dials += row.outbound_dials;
      m.talk += row.talk_minutes;

      // Update totals
      p.totals.qhh += row.qhh;
      p.totals.items += row.items;
      p.totals.sales += row.sold_items;
      p.totals.dials += row.outbound_dials;
      p.totals.talk += row.talk_minutes;
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

  if (!months.length || !rollups.length || !fromYm || !toYm) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No YTD data found</AlertTitle>
        <AlertDescription>
          No daily entries found for the latest year with data.
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
            YTD Performance ({ymLabel(fromYm)}–{ymLabel(toYm)})
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
