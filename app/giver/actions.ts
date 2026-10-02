"use server";
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export async function payItForward(){const db=await createClient();await db.rpc('track_event',{p_event:'pay_it_forward_clicked',p_entity_type:'conversion',p_entity_id:null});redirect('/giver')}
