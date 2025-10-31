import { useEffect, useState } from 'react';
import { rpc } from '@/utils/rpc';
import { firstRow, toNum } from '@/utils/num';

type SQL = {
  dials: any; qhh: any; policies_sold: any; households_sold: any; items_sold: any;
  close_rate_pcts: any; attach_rate: any; est_commission: any;
};

export type Eff = {
  dials: number; qhh: number; policiesSold: number; householdsSold: number; itemsSold: number;
  closeRatePct: number; closeRateRatio: number; attachRate: number; estCommission: number;
};

export function useExecutionEfficiency(params?: Record<string, any>) {
  const [data, setData] = useState<Eff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const raw = await rpc<SQL[]>('get_execution_efficiency_metrics', params);
      console.log('[get_execution_efficiency_metrics] raw', JSON.stringify(raw));
      const r = firstRow(raw); const closePct = toNum(r?.close_rate_pcts);
      setData({
        dials: toNum(r?.dials),
        qhh: toNum(r?.qhh),
        policiesSold: toNum(r?.policies_sold),
        householdsSold: toNum(r?.households_sold),
        itemsSold: toNum(r?.items_sold),
        closeRatePct: closePct,
        closeRateRatio: closePct / 100,
        attachRate: toNum(r?.attach_rate),
        estCommission: toNum(r?.est_commission),
      });
      console.log('[useExecutionEfficiency] parsed:', {
        dials: toNum(r?.dials),
        closeRatePct: closePct,
        closeRateRatio: closePct / 100,
      });
    } catch (e: any) { setErr(e); } finally { setLoading(false); }
  })(); }, [JSON.stringify(params)]);

  return { data, loading, error };
}
