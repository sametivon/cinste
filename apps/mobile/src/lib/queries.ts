import { supabase } from './supabase';
import type { CampaignCard } from './types';

export async function getCampaigns(categoryId?: string) {
  let query = supabase.from('campaigns').select('id,name,quantity_available,ends_at,event_starts_at,offers!inner(id,localization_key,name,description,image_path,fulfillment_type,redemption_instructions,booking_url,partners(name,address),categories(name,slug))').eq('status', 'active').gt('ends_at', new Date().toISOString()).gt('quantity_available', 0).order('created_at', { ascending: false });
  if (categoryId) query = query.eq('offers.category_id', categoryId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as CampaignCard[];
}
export async function getCategories() { const { data, error } = await supabase.from('categories').select('id,name,slug').eq('active', true).order('sort_order'); if (error) throw error; return data; }
export type ImpactOpportunity = { id: string; organization_id: string; organization_name: string; title: string; description: string; category: string; mode: 'scheduled' | 'flexible_remote'; city: string | null; starts_at: string | null; ends_at: string | null; due_at: string; expected_eligible_minutes: number; capacity: number; remaining_capacity: number };
export async function getImpactOpportunities() { const { data, error } = await supabase.rpc('list_impact_opportunities'); if (error) throw error; return (data ?? []) as ImpactOpportunity[]; }
export type ImpactParticipationRead = { participation_id: string; participation_status: string; opportunity_id: string; organization_id: string; organization_name: string; title: string; description: string; category: string; mode: 'scheduled' | 'flexible_remote'; city: string | null; starts_at: string | null; ends_at: string | null; due_at: string; expected_eligible_minutes: number; capacity: number; remaining_capacity: number };
export async function getMyImpactParticipations() { const { data, error } = await supabase.rpc('list_my_impact_participations'); if (error) throw error; return (data ?? []) as ImpactParticipationRead[]; }
