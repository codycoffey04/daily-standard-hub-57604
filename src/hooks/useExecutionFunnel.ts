import { useEffect, useState } from 'react';
import { rpc } from '@/utils/rpc';
import { firstRow, toNum } from '@/utils/num';

type RowSQL = {
  dials: any; qhh: any; policies_sold: any; items_sold: any; lines_quoted: any; households_sold: any;
};

export type ExecutionFunnel = {
  dials: number; qhh: number; policiesSold: number; itemsSold: number; linesQuoted: number; householdsSold: number;
};

export function useExecutionFunnel(params?: Record<string, any>) {
  const [data, setData] = useState<ExecutionFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const raw = await rpc<RowSQL[]>('get_execution_funnel', params);
      console.log('[get_execution_funnel] raw', JSON.stringify(raw));
      const r = firstRow(raw);
      setData({
        dials: toNum(r?.dials),
        qhh: toNum(r?.qhh),
        policiesSold: toNum(r?.policies_sold),
        itemsSold: toNum(r?.items_sold),
        linesQuoted: toNum(r?.lines_quoted),
        householdsSold: toNum(r?.households_sold),
      });
      console.log('[useExecutionFunnel] parsed:', {
        dials: toNum(r?.dials),
        qhh: toNum(r?.qhh),
        policiesSold: toNum(r?.policies_sold),
        itemsSold: toNum(r?.items_sold),
        linesQuoted: toNum(r?.lines_quoted),
        householdsSold: toNum(r?.households_sold),
      });
    } catch (e: any) { setErr(e); } finally { setLoading(false); }
  })(); }, [JSON.stringify(params)]);

  return { data, loading, error };
}
