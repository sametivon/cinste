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
