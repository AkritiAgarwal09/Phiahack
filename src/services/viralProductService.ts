import { supabase } from "@/integrations/supabase/client";

export interface SparklinePoint { day: string; score: number }

export interface ViralProductRow {
  product_id: string;
  product_title: string | null;
  vendor: string | null;
  category: string | null;
  tags: string[] | null;
  total_score: number;
  unique_users: number;
  growth_pct: number;
  sparkline: SparklinePoint[];
}

export async function loadViralProduct(daysBack = 7): Promise<ViralProductRow | null> {
  const { data, error } = await supabase.rpc("get_viral_product" as never, { days_back: daysBack } as never);
  if (error) {
    console.warn("[viral] load failed", error);
    return null;
  }
  const row = (data as ViralProductRow[] | undefined)?.[0];
  return row || null;
}
