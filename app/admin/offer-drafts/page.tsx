import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { reviewPartnerOfferDraft } from '../actions';
import { AdminNav } from '@/components/admin-nav';

export default async function PartnerOfferDrafts() {
  const db = await createClient(); const { data: { user } } = await db.auth.getUser(); if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single(); if (profile?.role !== 'admin') redirect('/');
  const { data: drafts } = await db.from('partner_offer_drafts').select('id,name,description,fulfillment_type,redemption_instructions,booking_url,partners(name),categories(name)').eq('status', 'submitted').order('created_at');
  return <main className="shell operational-shell admin-v1-page py-10"><AdminNav current="/admin/manage"/><Link className="text-link" href="/admin/manage">Înapoi la catalog</Link><h1 className="mt-4 text-4xl font-black">Propuneri de oferte de la parteneri</h1><p className="mt-2 text-stone-600">Aprobarea creează oferta publicabilă. Prețul și valoarea internă se stabilesc numai aici.</p><div className="mt-8 grid gap-4">{drafts?.length ? drafts.map((draft: any) => <article className="card" key={draft.id}><h2 className="text-xl font-black">{draft.name} · {draft.partners?.name} · {draft.categories?.name}</h2><p className="mt-2 text-stone-600">{draft.description}</p><p className="mt-2 text-sm text-stone-600">{draft.fulfillment_type}{draft.redemption_instructions ? ` · ${draft.redemption_instructions}` : ''}{draft.booking_url ? ` · ${draft.booking_url}` : ''}</p><form action={reviewPartnerOfferDraft} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="draftId" value={draft.id}/><label>Preț giver (bani)<input name="price" type="number" min="1" required/></label><label>Valoare internă (bani)<input name="internalValue" type="number" min="0"/></label><label className="sm:col-span-2">Notă pentru partener<textarea name="reviewNote" maxLength={500}/></label><div className="flex gap-3"><button className="btn" name="decision" value="approved">Aprobă oferta</button><button className="btn secondary" name="decision" value="rejected">Respinge</button></div></form></article>) : <p className="empty-inline">Nu există propuneri trimise spre revizuire.</p>}</div></main>;
}
