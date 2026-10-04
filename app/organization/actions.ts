'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const id = z.string().uuid();
const opportunity = z.object({ organizationId: id, title: z.string().trim().min(2).max(200), description: z.string().trim().min(1), category: z.enum(['community', 'education', 'environment', 'animals', 'events', 'skills', 'other']), mode: z.enum(['scheduled', 'flexible_remote']), city: z.string().trim().max(120), startsAt: z.string().optional(), endsAt: z.string().optional(), dueAt: z.string().min(1), minutes: z.coerce.number().int().min(1).max(1440), capacity: z.coerce.number().int().min(1).max(100000) });
async function db() { const client = await createClient(); const { data: { user } } = await client.auth.getUser(); if (!user) throw new Error('AUTH_REQUIRED'); return client; }
function iso(value?: string) { return value ? new Date(value).toISOString() : null; }
function refresh() { revalidatePath('/organization'); }
export async function createOpportunity(form: FormData) { const v = opportunity.parse(Object.fromEntries(form)); const client = await db(); const { error } = await client.rpc('organization_create_impact_opportunity', { p_organization_id: v.organizationId, p_title: v.title, p_description: v.description, p_category: v.category, p_mode: v.mode, p_city: v.city || null, p_starts_at: v.mode === 'scheduled' ? iso(v.startsAt) : null, p_ends_at: v.mode === 'scheduled' ? iso(v.endsAt) : null, p_due_at: iso(v.dueAt), p_expected_eligible_minutes: v.minutes, p_capacity: v.capacity }); if (error) throw new Error(error.message); refresh(); }
export async function publishOpportunity(form: FormData) { const v = z.object({ id }).parse(Object.fromEntries(form)); const { error } = await (await db()).rpc('organization_publish_impact_opportunity', { p_opportunity_id: v.id }); if (error) throw new Error(error.message); refresh(); }
export async function cancelOpportunity(form: FormData) { const v = z.object({ id, reason: z.string().trim().min(3).max(500) }).parse(Object.fromEntries(form)); const { error } = await (await db()).rpc('organization_cancel_impact_opportunity', { p_opportunity_id: v.id, p_reason: v.reason }); if (error) throw new Error(error.message); refresh(); }
export async function verifyParticipation(form: FormData) { const v = z.object({ id }).parse(Object.fromEntries(form)); const { error } = await (await db()).rpc('organization_verify_impact_participation', { p_participation_id: v.id }); if (error) throw new Error(error.message); refresh(); }
export async function resolveParticipation(form: FormData) { const v = z.object({ id, outcome: z.enum(['no_show', 'excused']), reason: z.string().trim().min(3).max(500) }).parse(Object.fromEntries(form)); const { error } = await (await db()).rpc('organization_resolve_impact_participation', { p_participation_id: v.id, p_outcome: v.outcome, p_reason: v.reason }); if (error) throw new Error(error.message); refresh(); }
