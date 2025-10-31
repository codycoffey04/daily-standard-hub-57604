import { useEffect, useState } from 'react';
import { rpc } from '@/utils/rpc';
import { toNum, ymToDate } from '@/utils/num';

type SQL = { ym: string; policies_sold: any; items_sold: any; qhh: any; lines_quoted: any; households_sold: any; };

export type YtdPoint = { date: Date; policiesSold: number; itemsSold: number; qhh: number; linesQuoted: number; householdsSold: number; };

export function useYTDPerformance(params?: Record<string, any>) {
  const [data, setData] = useState<YtdPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const raw = await rpc<SQL[]>('get_ytd_performance', params);
      console.log('[get_ytd_performance] raw', JSON.stringify(raw));
      const series = (raw ?? []).map(r => ({
        date: ymToDate(r.ym),
        policiesSold: toNum(r.policies_sold),
        itemsSold: toNum(r.items_sold),
        qhh: toNum(r.qhh),
        linesQuoted: toNum(r.lines_quoted),
        householdsSold: toNum(r.households_sold),
      })).sort((a, b) => a.date.getTime() - b.date.getTime());
      setData(series);
      console.log('[useYTDPerformance] parsed:', series.slice(0, 2));
    } catch (e: any) { setErr(e); } finally { setLoading(false); }
  })(); }, [JSON.stringify(params)]);

  return { data, loading, error };
}
