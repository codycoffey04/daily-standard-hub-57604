// ./hooks/useSummariesData.ts
import { useQuery } from '@tanstack/react-query';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type YearMonth = string; // 'YYYY-MM'
export type ISODate = string;

export interface MonthlySummaryData {
  total_quotes: number;
  total_qhh: number;
  total_dials: number;
  total_talk_time: number;
  avg_qhh_per_producer: number;
  avg_quotes_per_household: number;
  total_producers: number;
  total_presentation_days: number;
  total_sales: number;
  close_rate: number;
  total_items: number;
  attachment_rate: number;
}

export interface TopSourceData {
  source_name: string;
  metric_value: number;
  percentage: number;
}

export interface ItemsBySourceData {
  source_name: string;
  items: number;
  qhh: number;
  quotes: number;
  bundle_rate: number;
}

export interface CloseRateData {
  source_name: string;
  close_rate: number;
  sales: number;
  quotes: number;
}

export interface ProducerSourceMatrixData {
  producer_name: string;
  [sourceName: string]: string | number;
}

export interface SalesByProducerData {
  producer_name: string;
  sales: number;
  items: number;
  attachment_rate: number;
}

export interface SourceROIData {
  source_name: string;
  cost: number;
  qhh: number;
  quotes: number;
  sales: number;
  items: number;
  cost_per_qhh: number;
  cost_per_sale: number;
  roi_score: number;
}

// Backwards compatibility aliases
export type MonthlySummary = MonthlySummaryData;
export type TopSourcesRow = TopSourceData;
export type SourceRollupRow = ItemsBySourceData;

export function useMonthlySummary(year: number, month?: number | null) {
  return useQuery<MonthlySummaryData, PostgrestError>({
    queryKey: ['monthly-summary', year, month],
    queryFn: async () => {
      const targetMonth = month !== null && month !== undefined
        ? `${year}-${String(month).padStart(2, '0')}`
        : `${year}`;
      
      const { data, error } = await supabase
        .rpc('rpc_get_monthly_summary' as any, { 
          target_year: year,
          target_month: month 
        });

      if (error) throw error;
      
      return {
        total_quotes: Number(data?.total_quotes ?? 0),
        total_qhh: Number(data?.total_qhh ?? 0),
        total_dials: Number(data?.total_dials ?? 0),
        total_talk_time: Number(data?.total_talk_time ?? 0),
        avg_qhh_per_producer: Number(data?.avg_qhh_per_producer ?? 0),
        avg_quotes_per_household: Number(data?.avg_quotes_per_household ?? 0),
        total_producers: Number(data?.total_producers ?? 0),
        total_presentation_days: Number(data?.total_presentation_days ?? 0),
        total_sales: Number(data?.total_sales ?? 0),
        close_rate: Number(data?.close_rate ?? 0),
        total_items: Number(data?.total_items ?? 0),
        attachment_rate: Number(data?.attachment_rate ?? 0),
      };
    },
  });
}

export function useTopSourcesByMonth(monthYm: string, metricType: 'quotes' | 'qhh', limit: number = 10) {
  return useQuery<TopSourceData[], PostgrestError>({
    queryKey: ['top-sources', monthYm, metricType, limit],
    enabled: !!monthYm,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_top_sources_by_month' as any, {
          month_ym: monthYm,
          metric_type: metricType,
          lim: limit
        });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        source_name: row.source_name,
        metric_value: Number(row.metric_value ?? 0),
        percentage: Number(row.percentage ?? 0),
      }));
    },
  });
}

export function useQHHBySource(year: number, month?: number | null) {
  return useQuery<ItemsBySourceData[], PostgrestError>({
    queryKey: ['qhh-by-source', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_qhh_by_source' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        source_name: row.source_name,
        qhh: Number(row.qhh ?? 0),
        quotes: Number(row.quotes ?? 0),
        items: Number(row.items ?? 0),
        bundle_rate: Number(row.bundle_rate ?? 0),
      }));
    },
  });
}

export function useItemsBySource(year: number, month?: number | null) {
  return useQuery<ItemsBySourceData[], PostgrestError>({
    queryKey: ['items-by-source', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_items_by_source' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        source_name: row.source_name,
        items: Number(row.items ?? 0),
        qhh: Number(row.qhh ?? 0),
        quotes: Number(row.quotes ?? 0),
        bundle_rate: Number(row.bundle_rate ?? 0),
      }));
    },
  });
}

export function useProducerSourceMatrix(year: number, month?: number | null) {
  return useQuery<ProducerSourceMatrixData[], PostgrestError>({
    queryKey: ['producer-source-matrix', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_producer_source_matrix' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useItemsByProducer(year: number, month?: number | null) {
  return useQuery<any[], PostgrestError>({
    queryKey: ['items-by-producer', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_items_by_producer' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useQHHByProducer(year: number, month?: number | null) {
  return useQuery<any[], PostgrestError>({
    queryKey: ['qhh-by-producer', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_qhh_by_producer' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useQuotesByProducer(year: number, month?: number | null) {
  return useQuery<any[], PostgrestError>({
    queryKey: ['quotes-by-producer', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_quotes_by_producer' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useQuotesBySource(year: number, month?: number | null) {
  return useQuery<any[], PostgrestError>({
    queryKey: ['quotes-by-source', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_quotes_by_source' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useSalesByProducer(year: number, month?: number | null) {
  return useQuery<SalesByProducerData[], PostgrestError>({
    queryKey: ['sales-by-producer', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_sales_by_producer' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        producer_name: row.producer_name,
        sales: Number(row.sales ?? 0),
        items: Number(row.items ?? 0),
        attachment_rate: Number(row.attachment_rate ?? 0),
      }));
    },
  });
}

export function useSourceROI(year: number, month?: number | null) {
  return useQuery<SourceROIData[], PostgrestError>({
    queryKey: ['source-roi', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_source_roi' as any, {
          target_year: year,
          target_month: month
        });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        source_name: row.source_name,
        cost: Number(row.cost ?? 0),
        qhh: Number(row.qhh ?? 0),
        quotes: Number(row.quotes ?? 0),
        sales: Number(row.sales ?? 0),
        items: Number(row.items ?? 0),
        cost_per_qhh: Number(row.cost_per_qhh ?? 0),
        cost_per_sale: Number(row.cost_per_sale ?? 0),
        roi_score: Number(row.roi_score ?? 0),
      }));
    },
  });
}

// Additional helpers for backwards compatibility
export function useMTDProducerMetrics(dateWithinMonth: ISODate) {
  return useQuery<any[], PostgrestError>({
    queryKey: ['mtd-producer-metrics', dateWithinMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mtd_producer_metrics', {
        d: dateWithinMonth,
      });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useItemsAndQHHBySource(fromDate: ISODate, toDate: ISODate) {
  return useQuery<SourceRollupRow[], PostgrestError>({
    queryKey: ['items-qhh-by-source', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('rpc_get_items_by_source_daterange' as any, {
          from_date: fromDate,
          to_date: toDate,
        });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        source_name: row.source_name,
        qhh: Number(row.qhh ?? 0),
        quotes: Number(row.quotes ?? 0),
        items: Number(row.items ?? 0),
        bundle_rate: Number(row.bundle_rate ?? 0),
      }));
    },
  });
}

export type MetricType = 'qhh' | 'quotes' | 'items' | 'sales' | 'premium';

export default {
  useMonthlySummary,
  useTopSourcesByMonth,
  useQHHBySource,
  useItemsBySource,
  useProducerSourceMatrix,
  useItemsByProducer,
  useQHHByProducer,
  useQuotesByProducer,
  useQuotesBySource,
  useSalesByProducer,
  useSourceROI,
  useMTDProducerMetrics,
  useItemsAndQHHBySource,
};
