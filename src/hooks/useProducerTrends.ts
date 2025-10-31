import { useEffect, useState } from 'react';
import { rpc } from '@/utils/rpc';
import { toNum } from '@/utils/num';

type SQL = Partial<{
  entry_date: string; dt: string; day: string; date: string; d: string;
  producer_id: string; producer_name: string;
  outbound_dials: any; dials: any; qhh: any; quotes: any; lines_quoted: any;
  items: any; sold_items: any; items_sold: any;
  policies_sold: any; sold_premium: any; talk_minutes: any;
  framework_status: 'Top' | 'Bottom' | 'Outside' | null;
  days_top: any; days_bottom: any; days_outside: any;
}>;

export type TrendPoint = {
  date: Date; producerId: string; producerName: string;
  dials: number; qhh: number; policiesSold: number; itemsSold: number;
  quotes?: number; soldPremium?: number; talkMinutes?: number;
  frameworkStatus?: 'Top' | 'Bottom' | 'Outside' | null;
  daysTop?: number; daysBottom?: number; daysOutside?: number;
};

const pickDate = (r: SQL) => r.entry_date ?? r.dt ?? r.day ?? r.date ?? r.d ?? null;

export function useProducerTrends(params?: Record<string, any>) {
  const [data, setData] = useState<TrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const raw = await rpc<SQL[]>('get_producer_trends', params);
      console.log('[get_producer_trends] raw', JSON.stringify(raw));
      const mapped = (raw ?? []).map(r => {
        const iso = pickDate(r); const date = iso ? new Date(`${iso}T00:00:00`) : new Date(NaN);
        return {
          date,
          producerId: r.producer_id ?? '',
          producerName: r.producer_name ?? '',
          dials: toNum(r.outbound_dials ?? r.dials),
          qhh: toNum(r.qhh),
          policiesSold: toNum(r.policies_sold),
          itemsSold: toNum(r.sold_items ?? r.items_sold ?? r.items),
          quotes: r.quotes !== undefined ? toNum(r.quotes ?? r.lines_quoted) : (r.lines_quoted !== undefined ? toNum(r.lines_quoted) : undefined),
          soldPremium: r.sold_premium !== undefined ? toNum(r.sold_premium) : undefined,
          talkMinutes: r.talk_minutes !== undefined ? toNum(r.talk_minutes) : undefined,
          frameworkStatus: r.framework_status ?? undefined,
          daysTop: r.days_top !== undefined ? toNum(r.days_top) : undefined,
          daysBottom: r.days_bottom !== undefined ? toNum(r.days_bottom) : undefined,
          daysOutside: r.days_outside !== undefined ? toNum(r.days_outside) : undefined,
        };
      }).filter(p => !Number.isNaN(p.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      setData(mapped);
      console.log('[useProducerTrends] parsed:', mapped.slice(0, 2));
    } catch (e: any) { setErr(e); } finally { setLoading(false); }
  })(); }, [JSON.stringify(params)]);

  return { data, loading, error };
}
