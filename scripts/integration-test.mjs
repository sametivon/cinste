import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Integration tests refuse NODE_ENV=production.');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) if (!process.env[name]) throw new Error(`Missing ${name}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const run = `QA ${new Date().toISOString().replace(/[:.]/g, '-')}`;
const createdCampaigns = [];
const createdOffers = [];
const createdPartners = [];
let assertions = 0;
const check = (value, message) => { assert.ok(value, message); assertions += 1; };
const eq = (actual, expected, message) => { assert.equal(actual, expected, message); assertions += 1; };
async function must(query, label) { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; }
async function auth(email) {
  const db = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await db.auth.signInWithPassword({ email, password: 'cinste-local-2026' });
  if (error) throw new Error(`Login ${email}: ${error.message}`);
  return db;
}
async function qaStudent(label, status = 'verified') {
  const email = `qa.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'cinste-local-2026', email_confirm: true, user_metadata: { display_name: `QA ${label}`, cinste_test_data: true }, app_metadata: { cinste_test_data: true } });
  if (error || !data.user) throw new Error(`Create ${email}: ${error?.message}`);
  const university = await must(admin.from('universities').select('id').eq('name', 'ASE București').single(), 'seed university');
  await must(admin.from('profiles').upsert({ id: data.user.id, email, display_name: `QA ${label}`, role: 'student' }, { onConflict: 'id' }), 'QA profile');
  await must(admin.from('student_profiles').upsert({ user_id: data.user.id, full_name: `QA ${label}`, university_id: university.id, verification_status: status }, { onConflict: 'user_id' }), 'QA student profile');
  return { email, id: data.user.id, db: await auth(email) };
}
async function qaPartner(label, categoryId) {
  const email = `qa.partner.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'cinste-local-2026', email_confirm: true, user_metadata: { cinste_test_data: true }, app_metadata: { cinste_test_data: true } });
  if (error || !data.user) throw new Error(`Create ${email}: ${error?.message}`);
  await must(admin.from('profiles').upsert({ id: data.user.id, email, display_name: `QA partner ${label}`, role: 'partner' }, { onConflict: 'id' }), 'QA partner profile');
  const partner = await must(admin.from('partners').insert({ name: `${run} partner ${label}`, slug: `qa-partner-${crypto.randomUUID().slice(0, 8)}`, address: 'QA address', city: 'București', active: true }).select('id').single(), 'create QA partner');
  createdPartners.push(partner.id);
  await must(admin.from('partner_users').insert({ partner_id: partner.id, user_id: data.user.id }), 'assign QA partner user');
  const offer = await must(admin.from('offers').insert({ partner_id: partner.id, category_id: categoryId, name: `${run} offer ${label}`, description: 'QA offer', giver_price_bani: 100, fulfillment_type: 'instant', active: true }).select('id').single(), 'create QA partner offer');
  createdOffers.push(offer.id);
  return { ...partner, offerId: offer.id, db: await auth(email) };
}
async function uploadQaDocument(student, label) {
  const path = `${student.id}/qa-${label}-${crypto.randomUUID()}.pdf`;
  const bytes = new Blob(['CINSTE QA private document'], { type: 'application/pdf' });
  await must(student.db.storage.from('student-documents').upload(path, bytes, { contentType: 'application/pdf' }), 'upload QA private document');
  return { path, bytes };
}
async function campaign({ offerName = 'Cappuccino', quantity = 2, available = quantity, startsAt, endsAt, expiry = 60, event = false }) {
  const offer = await must(admin.from('offers').select('id,fulfillment_type').eq('name', offerName).single(), `seed offer ${offerName}`);
  const now = Date.now();
  const row = {
    offer_id: offer.id, name: `${run} ${offerName}`, sponsor_type: 'cinste', funding_source: 'admin',
    quantity_total: quantity, quantity_available: available,
    starts_at: startsAt ?? new Date(now - 60_000).toISOString(),
    ends_at: endsAt ?? new Date(now + 3_600_000).toISOString(), claim_expiration_minutes: expiry, status: 'active',
  };
  if (event) { row.event_starts_at = new Date(now - 60_000).toISOString(); row.event_ends_at = new Date(now + 3_600_000).toISOString(); }
  const data = await must(admin.from('campaigns').insert(row).select('id,quantity_available,quantity_total,offer_id').single(), 'create QA campaign');
  createdCampaigns.push(data.id);
  return data;
}
async function claim(student, campaignId) { return student.db.rpc('claim_campaign', { p_campaign_id: campaignId }); }
async function availability(id) { return (await must(admin.from('campaigns').select('quantity_available').eq('id', id).single(), 'campaign availability')).quantity_available; }
async function campaignCount(orderId) { return (await must(admin.from('campaigns').select('id').eq('giver_order_id', orderId), 'funded campaign count')).length; }
async function rawOrder({ giverId, offerId, quantity, unitPrice, total, paymentAmount, provider = 'mock', payment = true }) {
  const order = await must(admin.from('giver_orders').insert({ giver_id: giverId, total_bani: total }).select('id').single(), 'raw order');
  await must(admin.from('giver_order_items').insert({ order_id: order.id, offer_id: offerId, quantity, unit_price_bani: unitPrice }), 'raw order item');
  if (payment) await must(admin.from('payments').insert({ order_id: order.id, provider, provider_reference: `qa_${crypto.randomUUID()}`, amount_bani: paymentAmount ?? total }), 'raw payment');
  return order.id;
}
async function serviceConfirm(giverId, orderId, success) { return admin.rpc('confirm_mock_payment', { p_giver_id: giverId, p_order_id: orderId, p_success: success }); }

try {
  const verified = await qaStudent('verified');
  const instant = await campaign({ quantity: 2 });
  const first = await claim(verified, instant.id);
  check(!first.error && first.data?.[0]?.redemption_token, 'verified student claims an active treat');
  eq(await availability(instant.id), 1, 'claim atomically decrements inventory');

  const pending = await qaStudent('pending', 'pending');
  const pendingResult = await claim(pending, instant.id);
  check(pendingResult.error?.message.includes('STUDENT_NOT_VERIFIED'), 'pending student is rejected');
  const secondCampaign = await campaign({ quantity: 1 });
  const limitResult = await claim(verified, secondCampaign.id);
  check(limitResult.error?.message.includes('CLAIM_LIMIT_REACHED'), 'rolling 24-hour limit is enforced');

  const concurrentCampaign = await campaign({ quantity: 1 }); const concurrentA = await qaStudent('concurrency-a'); const concurrentB = await qaStudent('concurrency-b');
  const concurrent = await Promise.all([claim(concurrentA, concurrentCampaign.id), claim(concurrentB, concurrentCampaign.id)]);
  eq(concurrent.filter((item) => !item.error).length, 1, 'only one concurrent final-unit claim succeeds');
  eq(await availability(concurrentCampaign.id), 0, 'inventory never becomes negative under concurrent claims');
  const soldOut = await campaign({ quantity: 1, available: 0 });
  check((await claim(await qaStudent('sold-out'), soldOut.id)).error?.message.includes('SOLD_OUT'), 'sold-out campaign is rejected');
  const future = await campaign({ startsAt: new Date(Date.now() + 3_600_000).toISOString() });
  check((await claim(await qaStudent('future'), future.id)).error?.message.includes('CAMPAIGN_UNAVAILABLE'), 'future campaign is rejected');
  const ended = await campaign({ startsAt: new Date(Date.now() - 7_200_000).toISOString(), endsAt: new Date(Date.now() - 3_600_000).toISOString() });
  check((await claim(await qaStudent('ended'), ended.id)).error?.message.includes('CAMPAIGN_UNAVAILABLE'), 'ended campaign is rejected');

  const cafe = await auth('cafe.partner@cinste.test'); const cinema = await auth('cinema.partner@cinste.test');
  const expiryStudent = await qaStudent('expiry'); const expiryCampaign = await campaign({ quantity: 1, expiry: 60 }); const expiryClaim = await claim(expiryStudent, expiryCampaign.id);
  await must(admin.from('claims').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', expiryClaim.data[0].claim_id), 'force QA claim expiry');
  eq((await cafe.rpc('inspect_redemption', { p_token: expiryClaim.data[0].redemption_token })).data?.[0]?.state, 'EXPIRED', 'expired claim cannot validate');
  eq(await availability(expiryCampaign.id), 1, 'expired reservation restores inventory');
  await admin.rpc('expire_stale_claims'); eq(await availability(expiryCampaign.id), 1, 'repeated expiration is idempotent');

  const reclaimCampaign = await campaign({ quantity: 1, expiry: 60 }); const reclaimFirst = await claim(await qaStudent('reclaim-first'), reclaimCampaign.id);
  await must(admin.from('claims').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', reclaimFirst.data[0].claim_id), 'force reclaim expiry');
  const reclaimSecond = await claim(await qaStudent('reclaim-second'), reclaimCampaign.id);
  check(!reclaimSecond.error, 'claim creation expires stale reservations before inventory evaluation');
  eq(await availability(reclaimCampaign.id), 0, 'reclaimed final unit remains correctly reserved');

  const expiryRaceCampaign = await campaign({ quantity: 1, expiry: 60 }); const expiryRaceFirst = await claim(await qaStudent('expiry-race-first'), expiryRaceCampaign.id);
  await must(admin.from('claims').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', expiryRaceFirst.data[0].claim_id), 'force concurrent expiry');
  const expiryRaceSecond = await qaStudent('expiry-race-second');
  await Promise.all([admin.rpc('expire_stale_claims'), claim(expiryRaceSecond, expiryRaceCampaign.id)]);
  const raceAvailability = await availability(expiryRaceCampaign.id);
  check(raceAvailability >= 0 && raceAvailability <= 1, 'maintenance and claim concurrency cannot over-restore inventory');

  const redemptionStudent = await qaStudent('redemption'); const redemptionCampaign = await campaign({ quantity: 1 }); const redemptionClaim = await claim(redemptionStudent, redemptionCampaign.id); const redemptionToken = redemptionClaim.data[0].redemption_token;
  eq((await cinema.rpc('inspect_redemption', { p_token: redemptionToken })).data?.[0]?.state, 'NOT VALID AT THIS PARTNER', 'wrong partner cannot validate a claim');
  eq((await cafe.rpc('inspect_redemption', { p_token: redemptionToken })).data?.[0]?.state, 'VALID', 'mapped partner validates a normal active claim');
  eq((await cafe.rpc('redeem_claim', { p_token: redemptionToken })).data, 'REDEEMED', 'mapped partner redeems claim');
  eq((await cafe.rpc('redeem_claim', { p_token: redemptionToken })).data, 'ALREADY REDEEMED', 'duplicate redemption is rejected');
  eq((await cafe.rpc('inspect_redemption', { p_token: crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '') })).data?.[0]?.state, 'INVALID CODE', 'invalid bearer token is rejected');

  const endedClaimCampaign = await campaign({ quantity: 1, expiry: null }); const endedClaim = await claim(await qaStudent('claim-ended'), endedClaimCampaign.id);
  await must(admin.from('campaigns').update({ starts_at: new Date(Date.now() - 10 * 60_000).toISOString(), ends_at: new Date(Date.now() - 5 * 60_000).toISOString() }).eq('id', endedClaimCampaign.id), 'end claimed campaign');
  eq((await admin.rpc('claim_redeemability', { p_claim_id: endedClaim.data[0].claim_id })).data, 'expired', 'central validity recognizes a campaign-ended claim');
  eq((await cafe.rpc('inspect_redemption', { p_token: endedClaim.data[0].redemption_token })).data?.[0]?.state, 'EXPIRED', 'campaign-ended claim cannot validate');
  eq((await cafe.rpc('redeem_claim', { p_token: endedClaim.data[0].redemption_token })).data, 'EXPIRED', 'campaign-ended claim cannot redeem');

  const eventCampaign = await campaign({ offerName: 'Movie Ticket', quantity: 1, expiry: null, event: true }); const eventClaim = await claim(await qaStudent('event-ended'), eventCampaign.id);
  const eventStart = new Date(Date.now() - 3_600_000).toISOString(); const eventEnd = new Date(Date.now() - 1_800_000).toISOString();
  await must(admin.from('campaigns').update({ starts_at: new Date(Date.now() - 7_200_000).toISOString(), event_starts_at: eventStart, event_ends_at: eventEnd }).eq('id', eventCampaign.id), 'end event window');
  eq((await cinema.rpc('inspect_redemption', { p_token: eventClaim.data[0].redemption_token })).data?.[0]?.state, 'EXPIRED', 'event-ended claim cannot validate');
  eq((await cinema.rpc('redeem_claim', { p_token: eventClaim.data[0].redemption_token })).data, 'EXPIRED', 'event-ended claim cannot redeem');

  for (const offerName of ['Student Haircut', 'Movie Ticket']) {
    const student = await qaStudent(`fulfillment-${offerName.replaceAll(' ', '-')}`); const c = await campaign({ offerName, quantity: 1, event: offerName === 'Movie Ticket' }); const result = await claim(student, c.id);
    check(!result.error, `${offerName} claims through the shared engine`);
    const claimed = await must(admin.from('claims').select('campaigns(offers(fulfillment_type))').eq('id', result.data[0].claim_id).single(), 'fulfillment record');
    eq(claimed.campaigns.offers.fulfillment_type, offerName === 'Movie Ticket' ? 'scheduled_event' : 'appointment_required', `${offerName} preserves fulfillment type`);
  }

  const giver = await auth('giver@cinste.test'); const giverProfile = await must(admin.from('profiles').select('id').eq('email', 'giver@cinste.test').single(), 'giver profile');
  const cappuccino = await must(admin.from('offers').select('id,giver_price_bani,partner_id,category_id').eq('name', 'Cappuccino').single(), 'giver offer');
  const directOrder = await rawOrder({ giverId: giverProfile.id, offerId: cappuccino.id, quantity: 1, unitPrice: cappuccino.giver_price_bani, total: cappuccino.giver_price_bani, payment: false });
  const directConfirmation = await giver.rpc('confirm_mock_payment', { p_giver_id: giverProfile.id, p_order_id: directOrder, p_success: true });
  check(Boolean(directConfirmation.error), 'authenticated client cannot execute trusted payment confirmation');
  const noPayment = await serviceConfirm(giverProfile.id, directOrder, true); check(noPayment.error?.message.includes('PAYMENT_INVALID'), 'cannot fund without a pending payment'); eq(await campaignCount(directOrder), 0, 'missing payment adds zero inventory');
  const foreignPayment = await admin.from('payments').insert({ order_id: crypto.randomUUID(), provider_reference: `qa_${crypto.randomUUID()}`, amount_bani: 1 });
  check(Boolean(foreignPayment.error), 'payment foreign key prevents a payment from targeting a different or missing order');
  const wrongAmountOrder = await rawOrder({ giverId: giverProfile.id, offerId: cappuccino.id, quantity: 2, unitPrice: cappuccino.giver_price_bani, total: cappuccino.giver_price_bani * 2, paymentAmount: cappuccino.giver_price_bani * 2 + 1 });
  check((await serviceConfirm(giverProfile.id, wrongAmountOrder, true)).error?.message.includes('PAYMENT_AMOUNT_MISMATCH'), 'cannot fund mismatched payment amount'); eq(await campaignCount(wrongAmountOrder), 0, 'mismatched payment adds zero inventory');
  const manipulatedPrice = cappuccino.giver_price_bani + 1; const manipulatedOrder = await rawOrder({ giverId: giverProfile.id, offerId: cappuccino.id, quantity: 1, unitPrice: manipulatedPrice, total: manipulatedPrice, paymentAmount: manipulatedPrice });
  check((await serviceConfirm(giverProfile.id, manipulatedOrder, true)).error?.message.includes('ORDER_PRICE_MISMATCH'), 'cannot fund manipulated item price'); eq(await campaignCount(manipulatedOrder), 0, 'manipulated item adds zero inventory');
  check((await admin.rpc('create_mock_checkout', { p_giver_id: giverProfile.id, p_offer_id: cappuccino.id, p_quantity: 0 })).error?.message.includes('INVALID_QUANTITY'), 'cannot create invalid quantity checkout');
  const successCheckout = await must(admin.rpc('create_mock_checkout', { p_giver_id: giverProfile.id, p_offer_id: cappuccino.id, p_quantity: 2 }), 'create trusted checkout');
  eq((await serviceConfirm(giverProfile.id, successCheckout, true)).data, 'paid', 'successful mock payment is server-confirmed'); eq(await campaignCount(successCheckout), 1, 'successful payment creates one funded campaign');
  const funded = await must(admin.from('campaigns').select('id,quantity_available').eq('giver_order_id', successCheckout), 'funded inventory'); createdCampaigns.push(...funded.map((campaign) => campaign.id)); eq(funded[0].quantity_available, 2, 'funded quantity matches trusted checkout');
  eq((await serviceConfirm(giverProfile.id, successCheckout, true)).data, 'paid', 'duplicate confirmation is idempotent'); eq(await campaignCount(successCheckout), 1, 'duplicate confirmation does not double-fund');
  const failedCheckout = await must(admin.rpc('create_mock_checkout', { p_giver_id: giverProfile.id, p_offer_id: cappuccino.id, p_quantity: 1 }), 'create failed checkout');
  eq((await serviceConfirm(giverProfile.id, failedCheckout, false)).data, 'failed', 'failed mock payment is recorded'); eq(await campaignCount(failedCheckout), 0, 'failed payment creates zero inventory');
  check(Boolean((await giver.rpc('track_event', { p_event: 'claim_completed', p_entity_type: 'claim', p_entity_id: first.data[0].claim_id })).error), 'client cannot submit arbitrary analytics events');
  await must(giver.rpc('track_event', { p_event: 'pay_it_forward_clicked', p_entity_type: 'conversion', p_entity_id: null }), 'client may record the allowed pay-it-forward conversion');
  check(Boolean((await admin.from('campaigns').insert({ offer_id: cappuccino.id, name: 'invalid inventory', sponsor_type: 'cinste', funding_source: 'admin', quantity_total: 1, quantity_available: 2, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3_600_000).toISOString(), status: 'draft' })).error), 'database rejects campaign availability above funded capacity');
  check(Boolean((await admin.from('campaigns').insert({ offer_id: cappuccino.id, name: 'invalid event range', sponsor_type: 'cinste', funding_source: 'admin', quantity_total: 1, quantity_available: 1, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3_600_000).toISOString(), event_starts_at: new Date(Date.now() - 60_000).toISOString(), event_ends_at: new Date(Date.now() + 60_000).toISOString(), status: 'draft' })).error), 'database rejects event windows outside the campaign interval');
  check(Boolean((await admin.from('claims').update({ status: 'cancelled' }).eq('id', redemptionClaim.data[0].claim_id)).error), 'unsupported claim cancellation is blocked');

  const inactiveOffer = await must(admin.from('offers').insert({ partner_id: cappuccino.partner_id, category_id: cappuccino.category_id, name: `${run} inactive offer`, description: 'QA', giver_price_bani: 100, fulfillment_type: 'instant', active: false }).select('id').single(), 'create inactive offer'); createdOffers.push(inactiveOffer.id);
  check((await admin.rpc('create_mock_checkout', { p_giver_id: giverProfile.id, p_offer_id: inactiveOffer.id, p_quantity: 1 })).error?.message.includes('OFFER_NOT_FUNDABLE'), 'inactive offer cannot be funded');
  const inactivePartner = await must(admin.from('partners').insert({ name: `${run} inactive partner`, slug: `qa-inactive-${crypto.randomUUID().slice(0, 8)}`, address: 'QA', city: 'București', active: false }).select('id').single(), 'create inactive partner'); createdPartners.push(inactivePartner.id);
  const inactivePartnerOffer = await must(admin.from('offers').insert({ partner_id: inactivePartner.id, category_id: cappuccino.category_id, name: `${run} inactive partner offer`, description: 'QA', giver_price_bani: 100, fulfillment_type: 'instant', active: true }).select('id').single(), 'create inactive partner offer'); createdOffers.push(inactivePartnerOffer.id);
  check((await admin.rpc('create_mock_checkout', { p_giver_id: giverProfile.id, p_offer_id: inactivePartnerOffer.id, p_quantity: 1 })).error?.message.includes('OFFER_NOT_FUNDABLE'), 'inactive partner cannot be funded');

  // Verification lifecycle: a rejection remains in history and a student can
  // submit one replacement through the protected RPC, but cannot mutate review
  // fields or profile verification state directly.
  const adminUser = await auth('admin@cinste.test');
  const adminProfile = await must(admin.from('profiles').select('id').eq('email', 'admin@cinste.test').single(), 'admin profile');
  const university = await must(admin.from('universities').select('id').eq('name', 'ASE București').single(), 'QA verification university');
  const lifecycleStudent = await qaStudent('verification-lifecycle', 'rejected');
  const rejectedDocument = await uploadQaDocument(lifecycleStudent, 'rejected-history');
  const rejectedHistory = await must(admin.from('student_verifications').insert({ student_id: lifecycleStudent.id, university_id: university.id, full_name: 'QA rejected history', document_path: rejectedDocument.path, document_mime: 'application/pdf', document_bytes: rejectedDocument.bytes.size, status: 'rejected', reviewer_id: adminProfile.id, reviewed_at: new Date().toISOString(), rejection_reason: 'Documentul nu este lizibil.' }).select('id').single(), 'create rejected verification history');
  const selfVerify = await lifecycleStudent.db.from('student_profiles').update({ verification_status: 'verified' }).eq('user_id', lifecycleStudent.id).select();
  check(Boolean(selfVerify.error) || selfVerify.data?.length === 0, 'student cannot self-verify');
  const directReview = await lifecycleStudent.db.from('student_verifications').update({ status: 'verified' }).eq('id', rejectedHistory.id).select();
  check(Boolean(directReview.error) || directReview.data?.length === 0, 'student cannot modify protected review fields');
  const replacementDocument = await uploadQaDocument(lifecycleStudent, 'replacement');
  const replacement = await must(lifecycleStudent.db.rpc('submit_student_verification', { p_full_name: 'QA replacement', p_university_id: university.id, p_faculty: null, p_document_path: replacementDocument.path, p_document_mime: 'application/pdf', p_document_bytes: replacementDocument.bytes.size }), 'rejected student replacement submission');
  const lifecycleRows = await must(admin.from('student_verifications').select('id,status,rejection_reason,document_path').eq('student_id', lifecycleStudent.id).order('submitted_at'), 'verification lifecycle rows');
  eq(lifecycleRows.length, 2, 'replacement preserves rejected verification history');
  eq(lifecycleRows[0].status, 'rejected', 'prior result remains rejected'); eq(lifecycleRows[0].rejection_reason, 'Documentul nu este lizibil.', 'rejection reason is persisted');
  eq(lifecycleRows[1].id, replacement, 'replacement is the current submission'); eq(lifecycleRows[1].status, 'pending', 'replacement becomes pending'); check(lifecycleRows[1].document_path !== lifecycleRows[0].document_path, 'replacement uses a distinct document');
  const studentReason = await lifecycleStudent.db.from('student_verifications').select('rejection_reason').eq('id', rejectedHistory.id).single(); eq(studentReason.data?.rejection_reason, 'Documentul nu este lizibil.', 'student can read their intended rejection reason');
  eq((await must(admin.from('student_profiles').select('verification_status').eq('user_id', lifecycleStudent.id).single(), 'replacement student profile')).verification_status, 'pending', 'replacement returns profile safely to pending');
  eq((await adminUser.rpc('review_student_verification', { p_verification_id: replacement, p_decision: 'rejected', p_rejection_reason: 'Folosește un document actual.' })).data, 'rejected', 'admin can reject a pending replacement');
  check((await adminUser.rpc('review_student_verification', { p_verification_id: replacement, p_decision: 'verified', p_rejection_reason: null })).error?.message.includes('VERIFICATION_NOT_PENDING'), 'approve cannot overwrite a rejection');
  const approvalDocument = await uploadQaDocument(lifecycleStudent, 'approval-replacement');
  const approvalReplacement = await must(lifecycleStudent.db.rpc('submit_student_verification', { p_full_name: 'QA replacement', p_university_id: university.id, p_faculty: null, p_document_path: approvalDocument.path, p_document_mime: 'application/pdf', p_document_bytes: approvalDocument.bytes.size }), 'second replacement submission');
  eq((await adminUser.rpc('review_student_verification', { p_verification_id: approvalReplacement, p_decision: 'verified', p_rejection_reason: null })).data, 'verified', 'admin can approve a pending replacement');
  check((await adminUser.rpc('review_student_verification', { p_verification_id: approvalReplacement, p_decision: 'rejected', p_rejection_reason: 'No longer applicable' })).error?.message.includes('VERIFICATION_NOT_PENDING'), 'reject cannot overwrite an approval');

  const concurrentReviewStudent = await qaStudent('concurrent-review', 'rejected');
  const concurrentDocument = await uploadQaDocument(concurrentReviewStudent, 'concurrent');
  const concurrentSubmission = await must(concurrentReviewStudent.db.rpc('submit_student_verification', { p_full_name: 'QA concurrent review', p_university_id: university.id, p_faculty: null, p_document_path: concurrentDocument.path, p_document_mime: 'application/pdf', p_document_bytes: concurrentDocument.bytes.size }), 'concurrent review submission');
  const concurrentDecisions = await Promise.all([
    adminUser.rpc('review_student_verification', { p_verification_id: concurrentSubmission, p_decision: 'verified', p_rejection_reason: null }),
    adminUser.rpc('review_student_verification', { p_verification_id: concurrentSubmission, p_decision: 'rejected', p_rejection_reason: 'Document invalid' }),
  ]);
  eq(concurrentDecisions.filter((decision) => !decision.error).length, 1, 'concurrent review has exactly one winning decision');
  const concurrentFinal = await must(admin.from('student_verifications').select('status').eq('id', concurrentSubmission).single(), 'concurrent final status');
  check(['verified', 'rejected'].includes(concurrentFinal.status), 'concurrent review leaves one final decision');

  const identityStudent = await qaStudent('identity-change', 'verified');
  const identityDocument = await uploadQaDocument(identityStudent, 'identity-change');
  await must(identityStudent.db.rpc('submit_student_verification', { p_full_name: 'QA changed identity', p_university_id: university.id, p_faculty: null, p_document_path: identityDocument.path, p_document_mime: 'application/pdf', p_document_bytes: identityDocument.bytes.size }), 'verified identity re-verification');
  const changedIdentity = await must(admin.from('student_profiles').select('full_name,verification_status').eq('user_id', identityStudent.id).single(), 'changed identity profile');
  eq(changedIdentity.full_name, 'QA changed identity', 'verification-relevant identity changes only through re-verification'); eq(changedIdentity.verification_status, 'pending', 'identity change cannot retain verified status');

  // Operational deactivation hides new availability and invalidates redemption
  // live, without mutating an otherwise valid active claim into history.
  const operationalPartner = await qaPartner('deactivation', cappuccino.category_id);
  const operationalCampaign = await must(admin.from('campaigns').insert({ offer_id: operationalPartner.offerId, name: `${run} operational campaign`, sponsor_type: 'cinste', funding_source: 'admin', quantity_total: 3, quantity_available: 3, starts_at: new Date(Date.now() - 60_000).toISOString(), ends_at: new Date(Date.now() + 3_600_000).toISOString(), claim_expiration_minutes: 60, status: 'active' }).select('id').single(), 'create operational campaign'); createdCampaigns.push(operationalCampaign.id);
  const operationalStudent = await qaStudent('operational-claim'); const operationalClaim = await claim(operationalStudent, operationalCampaign.id); check(!operationalClaim.error, 'active partner offer remains claimable before deactivation');
  eq((await admin.rpc('campaign_is_claimable', { p_campaign_id: operationalCampaign.id })).data, true, 'active campaign is in discovery contract');
  await must(admin.from('partners').update({ active: false }).eq('id', operationalPartner.id), 'deactivate QA partner');
  eq((await admin.rpc('campaign_is_claimable', { p_campaign_id: operationalCampaign.id })).data, false, 'inactive partner disappears from claimable discovery contract');
  check((await claim(await qaStudent('inactive-partner-claim'), operationalCampaign.id)).error?.message.includes('CAMPAIGN_UNAVAILABLE'), 'inactive partner rejects new claim');
  eq((await operationalPartner.db.rpc('inspect_redemption', { p_token: operationalClaim.data[0].redemption_token })).data?.[0]?.state, 'EXPIRED', 'inactive partner rejects redemption inspection as valid');
  eq((await operationalPartner.db.rpc('redeem_claim', { p_token: operationalClaim.data[0].redemption_token })).data, 'EXPIRED', 'inactive partner rejects redemption');
  eq((await must(admin.from('claims').select('status').eq('id', operationalClaim.data[0].claim_id).single(), 'inactive partner active claim')).status, 'active', 'partner deactivation does not destructively expire an active claim');
  check((await admin.rpc('create_mock_checkout', { p_giver_id: giverProfile.id, p_offer_id: operationalPartner.offerId, p_quantity: 1 })).error?.message.includes('OFFER_NOT_FUNDABLE'), 'inactive partner cannot be newly funded');
  await must(admin.from('partners').update({ active: true }).eq('id', operationalPartner.id), 'reactivate QA partner');
  eq((await operationalPartner.db.rpc('inspect_redemption', { p_token: operationalClaim.data[0].redemption_token })).data?.[0]?.state, 'VALID', 'reactivation restores only an otherwise-valid active claim');
  await must(admin.from('offers').update({ active: false }).eq('id', operationalPartner.offerId), 'deactivate QA offer');
  eq((await admin.rpc('campaign_is_claimable', { p_campaign_id: operationalCampaign.id })).data, false, 'inactive offer disappears from claimable discovery contract');
  check((await claim(await qaStudent('inactive-offer-claim'), operationalCampaign.id)).error?.message.includes('CAMPAIGN_UNAVAILABLE'), 'inactive offer rejects new claim');
  eq((await operationalPartner.db.rpc('inspect_redemption', { p_token: operationalClaim.data[0].redemption_token })).data?.[0]?.state, 'EXPIRED', 'inactive offer rejects redemption inspection as valid');
  eq((await operationalPartner.db.rpc('redeem_claim', { p_token: operationalClaim.data[0].redemption_token })).data, 'EXPIRED', 'inactive offer rejects redemption');
  check((await admin.rpc('create_mock_checkout', { p_giver_id: giverProfile.id, p_offer_id: operationalPartner.offerId, p_quantity: 1 })).error?.message.includes('OFFER_NOT_FUNDABLE'), 'inactive offer cannot be newly funded');
  await must(admin.from('offers').update({ active: true }).eq('id', operationalPartner.offerId), 'reactivate QA offer');
  eq((await operationalPartner.db.rpc('redeem_claim', { p_token: operationalClaim.data[0].redemption_token })).data, 'REDEEMED', 'reactivated offer redeems only an otherwise-valid active claim');
  await must(admin.from('offers').update({ active: false }).eq('id', operationalPartner.offerId), 'deactivate after historical redemption');
  eq((await operationalPartner.db.rpc('inspect_redemption', { p_token: operationalClaim.data[0].redemption_token })).data?.[0]?.state, 'ALREADY REDEEMED', 'historical redeemed claim remains historical while offer inactive');
  await must(admin.from('offers').update({ active: true }).eq('id', operationalPartner.offerId), 'restore QA offer');
  const endedOperationalCampaign = await must(admin.from('campaigns').insert({ offer_id: operationalPartner.offerId, name: `${run} ended operational campaign`, sponsor_type: 'cinste', funding_source: 'admin', quantity_total: 1, quantity_available: 1, starts_at: new Date(Date.now() - 60_000).toISOString(), ends_at: new Date(Date.now() + 3_600_000).toISOString(), claim_expiration_minutes: null, status: 'active' }).select('id').single(), 'create ended operational campaign'); createdCampaigns.push(endedOperationalCampaign.id);
  const endedOperationalClaim = await claim(await qaStudent('ended-operational'), endedOperationalCampaign.id);
  await must(admin.from('campaigns').update({ ends_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', endedOperationalCampaign.id), 'end operational campaign');
  await must(admin.rpc('expire_stale_claims'), 'expire ended operational claim');
  await must(admin.from('partners').update({ active: false }).eq('id', operationalPartner.id), 'deactivate after permanent expiry'); await must(admin.from('partners').update({ active: true }).eq('id', operationalPartner.id), 'reactivate after permanent expiry');
  eq((await must(admin.from('claims').select('status').eq('id', endedOperationalClaim.data[0].claim_id).single(), 'expired operational claim')).status, 'expired', 'reactivation never resurrects an expired or ended claim');

  // Batch 3 operational boundaries: campaign creation is fulfillment-aware,
  // inventory is not an editable operator input, and membership revocation is
  // immediate for redemption and history access.
  const campaignStart = new Date(Date.now() - 60_000).toISOString(); const campaignEnd = new Date(Date.now() + 3_600_000).toISOString();
  const validInstantCampaign = await must(adminUser.rpc('admin_create_campaign', { p_offer_id: cappuccino.id, p_name: `${run} admin instant`, p_quantity: 3, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: 60, p_sponsor_type: 'cinste', p_sponsor_display_name: null, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' }), 'admin creates valid instant campaign'); createdCampaigns.push(validInstantCampaign);
  const haircut = await must(admin.from('offers').select('id').eq('name', 'Student Haircut').single(), 'appointment offer');
  const validAppointmentCampaign = await must(adminUser.rpc('admin_create_campaign', { p_offer_id: haircut.id, p_name: `${run} admin appointment`, p_quantity: 2, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: null, p_sponsor_type: 'partner', p_sponsor_display_name: null, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' }), 'admin creates valid appointment campaign'); createdCampaigns.push(validAppointmentCampaign);
  const movie = await must(admin.from('offers').select('id').eq('name', 'Movie Ticket').single(), 'scheduled event offer');
  const adminEventStart = new Date(Date.now() + 600_000).toISOString(); const adminEventEnd = new Date(Date.now() + 1_800_000).toISOString();
  const validEventCampaign = await must(adminUser.rpc('admin_create_campaign', { p_offer_id: movie.id, p_name: `${run} admin event`, p_quantity: 2, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: null, p_sponsor_type: 'company', p_sponsor_display_name: 'QA', p_event_starts_at: adminEventStart, p_event_ends_at: adminEventEnd, p_status: 'active' }), 'admin creates valid scheduled-event campaign'); createdCampaigns.push(validEventCampaign);
  check((await giver.rpc('admin_create_campaign', { p_offer_id: cappuccino.id, p_name: 'forbidden', p_quantity: 1, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: 60, p_sponsor_type: 'cinste', p_sponsor_display_name: null, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' })).error?.message.includes('ADMIN_REQUIRED'), 'non-admin cannot create campaigns');
  check((await adminUser.rpc('admin_create_campaign', { p_offer_id: cappuccino.id, p_name: 'bad dates', p_quantity: 1, p_starts_at: campaignEnd, p_ends_at: campaignStart, p_claim_expiration_minutes: 60, p_sponsor_type: 'cinste', p_sponsor_display_name: null, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' })).error?.message.includes('INVALID_CAMPAIGN_WINDOW'), 'invalid campaign date range is rejected');
  check((await adminUser.rpc('admin_create_campaign', { p_offer_id: movie.id, p_name: 'missing event', p_quantity: 1, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: null, p_sponsor_type: 'cinste', p_sponsor_display_name: null, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' })).error?.message.includes('INVALID_EVENT_WINDOW'), 'scheduled event requires event metadata');
  check((await adminUser.rpc('admin_create_campaign', { p_offer_id: cappuccino.id, p_name: 'bad quantity', p_quantity: 0, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: 60, p_sponsor_type: 'cinste', p_sponsor_display_name: null, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' })).error?.message.includes('INVALID_QUANTITY'), 'invalid campaign inventory is rejected');
  check((await adminUser.rpc('admin_create_campaign', { p_offer_id: inactiveOffer.id, p_name: 'inactive offer campaign', p_quantity: 1, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: 60, p_sponsor_type: 'cinste', p_sponsor_display_name: null, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' })).error?.message.includes('OFFER_NOT_OPERATIONAL'), 'inactive offer cannot receive a new campaign');
  const beforeAdminUpdate = await availability(validInstantCampaign);
  await must(adminUser.rpc('admin_update_campaign', { p_campaign_id: validInstantCampaign, p_name: `${run} admin instant edited`, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: 30, p_event_starts_at: null, p_event_ends_at: null, p_status: 'paused' }), 'admin updates safe campaign scheduling');
  eq(await availability(validInstantCampaign), beforeAdminUpdate, 'campaign operator update cannot alter available inventory');
  await must(adminUser.rpc('admin_update_campaign', { p_campaign_id: validInstantCampaign, p_name: `${run} admin instant active`, p_starts_at: campaignStart, p_ends_at: campaignEnd, p_claim_expiration_minutes: 30, p_event_starts_at: null, p_event_ends_at: null, p_status: 'active' }), 'admin reactivates unclaimed campaign');

  const cinemaProfile = await must(admin.from('profiles').select('id').eq('email', 'cinema.partner@cinste.test').single(), 'cinema partner profile');
  await must(adminUser.rpc('admin_assign_partner_user', { p_partner_id: operationalPartner.id, p_user_id: cinemaProfile.id }), 'admin assigns eligible partner user');
  check((await adminUser.rpc('admin_assign_partner_user', { p_partner_id: operationalPartner.id, p_user_id: cinemaProfile.id })).error?.message.includes('PARTNER_USER_ALREADY_ASSIGNED'), 'duplicate partner assignment is prevented');
  const revocationCampaign = await must(admin.from('campaigns').insert({ offer_id: operationalPartner.offerId, name: `${run} revocation campaign`, sponsor_type: 'cinste', funding_source: 'admin', quantity_total: 1, quantity_available: 1, starts_at: campaignStart, ends_at: campaignEnd, claim_expiration_minutes: 60, status: 'active' }).select('id').single(), 'create revocation campaign'); createdCampaigns.push(revocationCampaign.id);
  const revocationClaim = await claim(await qaStudent('revocation-claim'), revocationCampaign.id);
  eq((await cinema.rpc('inspect_redemption', { p_token: revocationClaim.data[0].redemption_token })).data?.[0]?.state, 'VALID', 'assigned partner user can inspect matching partner claim');
  await must(adminUser.rpc('admin_revoke_partner_user', { p_partner_id: operationalPartner.id, p_user_id: cinemaProfile.id }), 'admin revokes partner user');
  eq((await cinema.rpc('inspect_redemption', { p_token: revocationClaim.data[0].redemption_token })).data?.[0]?.state, 'NOT VALID AT THIS PARTNER', 'revoked user immediately loses inspection access');
  eq((await cinema.rpc('redeem_claim', { p_token: revocationClaim.data[0].redemption_token })).data, 'NOT VALID AT THIS PARTNER', 'revoked user immediately loses redemption access');
  const revokedHistory = await cinema.from('redemption_events').select('id').eq('partner_id', operationalPartner.id); eq(revokedHistory.data?.length, 0, 'revoked user cannot read partner redemption history');
  const partnerAccessAudit = await must(adminUser.from('partner_user_access_events').select('action,actor_id').eq('partner_id', operationalPartner.id).eq('user_id', cinemaProfile.id).order('created_at'), 'admin reads partner access audit');
  eq(partnerAccessAudit.map((event) => event.action).join(','), 'assigned,revoked', 'partner assignment and revocation have an audit trail');
  eq((await cinema.from('partner_user_access_events').select('id').eq('partner_id', operationalPartner.id)).data?.length, 0, 'revoked partner cannot read access audit history');
  const partnerHistory = await operationalPartner.db.from('redemption_events').select('id,claim_id,redeemed_at').eq('partner_id', operationalPartner.id); check((partnerHistory.data?.length ?? 0) >= 1, 'partner history returns only the assigned partner redemption events');
  const adminOperationalClaims = await adminUser.from('claims').select('id,status,claimed_at,expires_at,redeemed_at').limit(1); check(!adminOperationalClaims.error && Array.isArray(adminOperationalClaims.data), 'admin can inspect claims without claim secrets');
  const adminOperationalOrders = await adminUser.from('giver_orders').select('id,status,total_bani,created_at').limit(1); check(!adminOperationalOrders.error && Array.isArray(adminOperationalOrders.data), 'admin can inspect orders');
  const adminOperationalPayments = await adminUser.from('payments').select('id,status,amount_bani,created_at').limit(1); check(!adminOperationalPayments.error && Array.isArray(adminOperationalPayments.data), 'admin can inspect payments');
  const adminOperationalRedemptions = await adminUser.from('redemption_events').select('id,claim_id,partner_id,redeemed_at').limit(1); check(!adminOperationalRedemptions.error && Array.isArray(adminOperationalRedemptions.data), 'admin can inspect redemption events');
  const giverOperationalClaims = await giver.from('claims').select('id').limit(1); eq(giverOperationalClaims.data?.length, 0, 'giver cannot access admin operational claim view');

  const crossProfile = await verified.db.from('student_profiles').select('user_id').eq('user_id', pending.id); eq(crossProfile.data?.length, 0, 'RLS prevents one student reading another profile');
  const crossSecret = await pending.db.from('claim_secrets').select('redemption_token').eq('claim_id', first.data[0].claim_id); eq(crossSecret.data?.length, 0, 'RLS prevents another student reading a bearer token');
  const partnerClaims = await cinema.from('claims').select('id').eq('id', redemptionClaim.data[0].claim_id); eq(partnerClaims.data?.length, 0, 'RLS prevents a partner reading other-partner claims');
  const documentStudent = await qaStudent('document-access', 'rejected'); const documentFile = await uploadQaDocument(documentStudent, 'access');
  const verification = await must(documentStudent.db.rpc('submit_student_verification', { p_full_name: 'QA document access', p_university_id: university.id, p_faculty: null, p_document_path: documentFile.path, p_document_mime: 'application/pdf', p_document_bytes: documentFile.bytes.size }), 'create QA verification through the ownership-checked RPC');
  check(Boolean((await verified.db.storage.from('student-documents').download(documentFile.path)).error), 'storage RLS blocks non-admin document access');
  eq((await adminUser.storage.from('student-documents').download(documentFile.path)).data?.size, documentFile.bytes.size, 'admin storage policy permits document review');
  const documentOtherStudent = await qaStudent('document-cross-reference', 'rejected');
  check((await documentOtherStudent.db.rpc('submit_student_verification', { p_full_name: 'QA document cross reference', p_university_id: university.id, p_faculty: null, p_document_path: documentFile.path, p_document_mime: 'application/pdf', p_document_bytes: documentFile.bytes.size })).error?.message.includes('INVALID_DOCUMENT'), 'verification cannot reference another student document');
  const oversizedDocument = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'application/pdf' });
  check(Boolean((await documentOtherStudent.db.storage.from('student-documents').upload(`${documentOtherStudent.id}/oversized.pdf`, oversizedDocument, { contentType: 'application/pdf' })).error), 'trusted bucket rejects oversized documents');
  const unsupportedDocument = new Blob(['not a verification document'], { type: 'text/plain' });
  check(Boolean((await documentOtherStudent.db.storage.from('student-documents').upload(`${documentOtherStudent.id}/unsupported.txt`, unsupportedDocument, { contentType: 'text/plain' })).error), 'trusted bucket rejects unsupported declared document type');
  await must(admin.from('student_verifications').delete().eq('id', verification), 'remove QA verification'); await must(admin.storage.from('student-documents').remove([documentFile.path]), 'remove QA private document');
  console.log(`PASS: ${assertions} hosted integration assertions (${run})`);
} finally {
  if (createdCampaigns.length) await admin.from('campaigns').update({ status: 'ended' }).in('id', createdCampaigns);
  if (createdOffers.length) await admin.from('offers').delete().in('id', createdOffers);
  if (createdPartners.length) await admin.from('partners').delete().in('id', createdPartners);
}
