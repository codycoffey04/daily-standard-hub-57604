import { useEffect, useState } from 'react';
import { rpc } from '@/utils/rpc';
import { toNum } from '@/utils/num';
import { supabase } from '@/integrations/supabase/client';

type SQL = Partial<{
  stage_no: any; stage_number: any; stage_name: string;
  value: any; stage_value: any;
  conversion_rate: any; drop_off_count: any; drop_off_rate: any;
}>;

export type Stage = {
  stageNo: number; stageName: string; count: number;
  conversionRate?: number; dropOffCount?: number; dropOffRate?: number;
};

export function useConversionFunnel(params?: Record<string, any>) {
  const [data, setData] = useState<Stage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const raw = await rpc<SQL[]>('get_conversion_funnel', params);
      console.log('[get_conversion_funnel] raw', JSON.stringify(raw));
      const mapped = (raw ?? []).map(r => ({
        stageNo: toNum(r.stage_no ?? r.stage_number),
        stageName: r.stage_name ?? '',
        count: toNum(r.value ?? r.stage_value),
        conversionRate: r.conversion_rate !== undefined ? toNum(r.conversion_rate) : undefined,
        dropOffCount: r.drop_off_count !== undefined ? toNum(r.drop_off_count) : undefined,
        dropOffRate: r.drop_off_rate !== undefined ? toNum(r.drop_off_rate) : undefined,
      })).sort((a, b) => a.stageNo - b.stageNo);
      setData(mapped);
      console.log('[useConversionFunnel] parsed:', mapped.slice(0, 2));
    } catch (e: any) { setErr(e); } finally { setLoading(false); }
  })(); }, [JSON.stringify(params)]);

  return { data, loading, error };
}

export function useProducers() {
  const [data, setData] = useState<Array<{ id: string; display_name: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const { data: producerData, error: producerError } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name');

      if (producerError) throw producerError;
      setData(producerData || []);
    } catch (e: any) { setErr(e); } finally { setLoading(false); }
  })(); }, []);

  return { data, loading, error };
}
