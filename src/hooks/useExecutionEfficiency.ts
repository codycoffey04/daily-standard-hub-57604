// ./hooks/useExecutionEfficiency.ts
import { useMemo } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { useExecutionFunnel } from './useExecutionFunnel';

export interface ExecutionEfficiency {
  qhh: number;
  quotes: number;
  sales: number;
  items: number;
  // Efficiency KPIs
  quotes_per_qhh: number;   // how many quotes per unique household
  sales_per_qhh: number;    // bind rate (household‑level)
  items_per_sale: number;   // attachment/upsell rate
  items_per_qhh: number;    // cross‑sell density
  close_rate: number;       // sales / quotes
}

type Args = {
  fromDate: string;
  toDate: string;
  producerId?: string | null;
  sourceId?: string | null;
};

export function useExecutionEfficiency(args: Args) {
  const { fromDate, toDate, producerId, sourceId } = args;

  // Reuse the same RPC (deduped if called elsewhere with same key)
  const funnelQuery = useExecutionFunnel({
    fromDate,
    toDate,
    producerId,
    sourceId,
  });

  const data: ExecutionEfficiency | undefined = useMemo(() => {
    if (!funnelQuery.data) return undefined;
    const { qhh_total, quotes_total, sales_total, items_total } =
      funnelQuery.data.totals;

    const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

    return {
      qhh: qhh_total,
      quotes: quotes_total,
      sales: sales_total,
      items: items_total,
      quotes_per_qhh: safeDiv(quotes_total, qhh_total),
      sales_per_qhh: safeDiv(sales_total, qhh_total), // bind rate @ household level
      items_per_sale: safeDiv(items_total, sales_total),
      items_per_qhh: safeDiv(items_total, qhh_total),
      close_rate: safeDiv(sales_total, quotes_total), // quote->bind close rate
    };
  }, [funnelQuery.data]);

  return {
    ...funnelQuery,
    data,
  };
}

export default useExecutionEfficiency;
