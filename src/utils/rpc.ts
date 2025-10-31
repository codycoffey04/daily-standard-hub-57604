import { supabase } from '@/integrations/supabase/client';

export async function rpc<T = unknown>(fn: string, params?: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, params ?? {});
  if (error) throw error;
  return data as T;
}
