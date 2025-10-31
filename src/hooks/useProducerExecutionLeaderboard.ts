import { useEffect, useState } from 'react';
import { rpc } from '@/utils/rpc';
import { toNum } from '@/utils/num';

type SQL = Partial<{
  producer_id: string; producer_name: string;
  dials: any; qhh: any; policies_sold: any; households_sold: any; items_sold: any; rank_by_sales: any;
  total_dials: any; total_qhh: any; total_shh: any; total_items: any; rank: any;
  quote_rate: any; close_rate: any; attach_rate: any; total_premium: any;
  quote_guidance: any; close_guidance: any; attach_guidance: any;
}>;

export type Leader = {
  producerId: string; producerName: string; dials: number; qhh: number; policiesSold: number; itemsSold: number;
  householdsSold?: number; rankBySales?: number; quoteRate?: number; closeRate?: number; attachRate?: number; totalPremium?: number;
  quoteGuidance?: string; closeGuidance?: string; attachGuidance?: string;
};

export function useProducerExecutionLeaderboard(params?: Record<string, any>) {
  const [data, setData] = useState<Leader[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const raw = await rpc<SQL[]>('get_producer_execution_leaderboard', params);
      console.log('[get_producer_execution_leaderboard] raw', JSON.stringify(raw));
      const mapped = (raw ?? []).map(r => ({
        producerId: r.producer_id ?? '',
        producerName: r.producer_name ?? '',
        dials: toNum(r.dials ?? r.total_dials),
        qhh: toNum(r.qhh ?? r.total_qhh),
        policiesSold: toNum(r.policies_sold ?? r.total_shh),
        itemsSold: toNum(r.items_sold ?? r.total_items),
        householdsSold: r.households_sold !== undefined ? toNum(r.households_sold) : undefined,
        rankBySales: r.rank_by_sales !== undefined ? toNum(r.rank_by_sales) : (r.rank !== undefined ? toNum(r.rank) : undefined),
        quoteRate: r.quote_rate !== undefined ? toNum(r.quote_rate) : undefined,
        closeRate: r.close_rate !== undefined ? toNum(r.close_rate) : undefined,
        attachRate: r.attach_rate !== undefined ? toNum(r.attach_rate) : undefined,
        totalPremium: r.total_premium !== undefined ? toNum(r.total_premium) : undefined,
        quoteGuidance: r.quote_guidance as string | undefined,
        closeGuidance: r.close_guidance as string | undefined,
        attachGuidance: r.attach_guidance as string | undefined,
      }));
      const sorted = mapped.some(m => m.rankBySales !== undefined)
        ? mapped.sort((a, b) => (a.rankBySales! - b.rankBySales!))
        : mapped.sort((a, b) => (b.policiesSold - a.policiesSold));
      setData(sorted);
      console.log('[useProducerExecutionLeaderboard] parsed:', sorted.slice(0, 2));
    } catch (e: any) { setErr(e); } finally { setLoading(false); }
  })(); }, [JSON.stringify(params)]);

  return { data, loading, error };
}
