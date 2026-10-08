import { createClient } from '@supabase/supabase-js';

// This runner is deliberately fail-closed. It is for the already-applied
// 0022 contract in an isolated, non-production DEV/QA project only.
if (process.env.NODE_ENV === 'production') {
  throw new Error('0022 hosted validation refuses NODE_ENV=production.');
}
if (process.env.CINSTE_HOSTED_QA_VALIDATION !== '1') {
  throw new Error('Set CINSTE_HOSTED_QA_VALIDATION=1 for an approved DEV/QA project.');
}
if (process.env.CINSTE_VALIDATE_0022 !== '1') {
  throw new Error('Set CINSTE_VALIDATE_0022=1 to explicitly acknowledge 0022 hosted validation.');
}

for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anonymous = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
const users = [];
const created = { campaigns: [], orders: [], items: [], payments: [], analytics: [], offers: [], partners: [] };
let assertions = 0;

function check(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  assertions += 1;
}

async function must(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label} failed`);
  return data;
}

async function expectError(query, label) {
  const { data, error } = await query;
  check(Boolean(error) && data === null, label);
  return error;
}

async function authClient(user) {
  const db = createClient(url, publishable, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await db.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error || !data.session) throw new Error(`${user.label} fixture sign-in failed`);
  return db;
}

async function createUser(label, role) {
  const email = `qa.0022.${label}.${crypto.randomUUID().slice(0, 8)}@cinste.test`;
  const password = `QA-0022-${crypto.randomUUID()}-x9!`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { cinste_test_data: true },
    app_metadata: { cinste_test_data: true },
  });
  if (error || !data.user) throw new Error(`${label} fixture creation failed`);
  users.push({ id: data.user.id, email, password, label });
  await must(service.from('profiles').update({ role, display_name: `QA 0022 ${label}` }).eq('id', data.user.id), `${label} fixture role`);
  return users.at(-1);
}

async function countRows(table, filter) {
  let query = service.from(table).select('id', { count: 'exact', head: true });
  for (const [column, value] of Object.entries(filter)) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw new Error(`Snapshot ${table} failed`);
  return count ?? 0;
}

async function snapshot(giverIds) {
  const [orders, items, payments, campaigns, analytics] = await Promise.all([
    countRows('giver_orders', { giver_id: giverIds[0] }),
    countRows('giver_order_items', { order_id: created.orders[0] ?? '00000000-0000-0000-0000-000000000000' }),
    countRows('payments', { order_id: created.orders[0] ?? '00000000-0000-0000-0000-000000000000' }),
    countRows('campaigns', { giver_order_id: created.orders[0] ?? '00000000-0000-0000-0000-000000000000' }),
    countRows('analytics_events', { actor_id: giverIds[0], event_name: 'mock_payment_completed' }),
  ]);
  return { orders, items, payments, campaigns, analytics };
}

async function orderSnapshot(orderId, giverId) {
  const [order, item, payment, campaign, event] = await Promise.all([
    service.from('giver_orders').select('id,status,total_bani').eq('id', orderId).eq('giver_id', giverId).maybeSingle(),
    service.from('giver_order_items').select('id,quantity,unit_price_bani').eq('order_id', orderId),
    service.from('payments').select('id,status,amount_bani').eq('order_id', orderId).maybeSingle(),
    service.from('campaigns').select('id,quantity_total,quantity_available').eq('giver_order_id', orderId),
    service.from('analytics_events').select('id').eq('entity_id', orderId).eq('event_name', 'mock_payment_completed'),
  ]);
  if ([order, item, payment, campaign, event].some((result) => result.error)) throw new Error('Order snapshot failed');
  return { order: order.data, item: item.data, payment: payment.data, campaign: campaign.data, event: event.data };
}

async function checkout(giverId, quantity) {
  const { data, error } = await service.rpc('create_mock_checkout', { p_giver_id: giverId, p_offer_id: fixture.offerId, p_quantity: quantity });
  if (error || !data) throw new Error('Service checkout failed');
  created.orders.push(data);
  return data;
}

async function cleanup() {
  // Dependency-safe and limited to IDs created by this run.
  if (created.orders.length) {
    await service.from('campaigns').delete().in('giver_order_id', created.orders);
    await service.from('analytics_events').delete().in('entity_id', created.orders);
    await service.from('payments').delete().in('order_id', created.orders);
    await service.from('giver_order_items').delete().in('order_id', created.orders);
    await service.from('giver_orders').delete().in('id', created.orders);
  }
  if (created.campaigns.length) await service.from('campaigns').delete().in('id', created.campaigns);
  if (created.analytics.length) await service.from('analytics_events').delete().in('id', created.analytics);
  if (created.payments.length) await service.from('payments').delete().in('id', created.payments);
  if (created.items.length) await service.from('giver_order_items').delete().in('id', created.items);
  if (created.offers.length) await service.from('offers').delete().in('id', created.offers);
  if (created.partners.length) await service.from('partners').delete().in('id', created.partners);
  for (const user of users) await service.auth.admin.deleteUser(user.id);
}

let fixture;
try {
  const giverA = await createUser('giver-a', 'giver');
  const giverB = await createUser('giver-b', 'giver');
  const student = await createUser('student', 'student');
  const category = await must(service.from('categories').select('id').limit(1).single(), 'QA category');
  const partner = await must(service.from('partners').insert({ name: `QA 0022 ${crypto.randomUUID()}`, slug: `qa-0022-${crypto.randomUUID()}`, address: 'QA-only fixture', city: 'Bucuresti', active: true }).select('id').single(), 'QA partner');
  created.partners.push(partner.id);
  const offer = await must(service.from('offers').insert({ partner_id: partner.id, category_id: category.id, name: `QA 0022 ${crypto.randomUUID()}`, description: 'Disposable hosted validation fixture', giver_price_bani: 137, fulfillment_type: 'instant', active: true }).select('id,giver_price_bani').single(), 'QA offer');
  created.offers.push(offer.id);
  fixture = { giverA, giverB, student, partnerId: partner.id, offerId: offer.id, price: offer.giver_price_bani };
  const giverADb = await authClient(giverA);
  const giverBDb = await authClient(giverB);
  const studentDb = await authClient(student);

  await expectError(service.rpc('confirm_mock_payment', { p_order_id: crypto.randomUUID(), p_success: true }), 'obsolete two-argument confirmation signature is unavailable');
  await expectError(anonymous.rpc('create_mock_checkout', { p_giver_id: giverA.id, p_offer_id: offer.id, p_quantity: 1 }), 'anonymous cannot execute checkout');
  await expectError(anonymous.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: crypto.randomUUID(), p_success: true }), 'anonymous cannot execute confirmation');
  await expectError(giverADb.rpc('create_mock_checkout', { p_giver_id: giverA.id, p_offer_id: offer.id, p_quantity: 1 }), 'authenticated client cannot execute checkout');
  await expectError(giverADb.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: crypto.randomUUID(), p_success: true }), 'authenticated client cannot execute confirmation');

  const baseline = await snapshot([giverA.id]);
  await expectError(service.rpc('create_mock_checkout', { p_giver_id: student.id, p_offer_id: offer.id, p_quantity: 1 }), 'non-Giver trusted ID is rejected');
  check(JSON.stringify(await snapshot([giverA.id])) === JSON.stringify(baseline), 'non-Giver checkout has no financial side effects');
  for (const quantity of [0, 101]) {
    await expectError(service.rpc('create_mock_checkout', { p_giver_id: giverA.id, p_offer_id: offer.id, p_quantity: quantity }), `quantity ${quantity} is rejected`);
    check(JSON.stringify(await snapshot([giverA.id])) === JSON.stringify(baseline), `quantity ${quantity} has no financial side effects`);
  }

  await must(service.from('offers').update({ active: false }).eq('id', offer.id), 'deactivate QA offer');
  await expectError(service.rpc('create_mock_checkout', { p_giver_id: giverA.id, p_offer_id: offer.id, p_quantity: 1 }), 'inactive offer cannot create checkout');
  await must(service.from('offers').update({ active: true }).eq('id', offer.id), 'restore QA offer');
  await must(service.from('partners').update({ active: false }).eq('id', partner.id), 'deactivate QA partner');
  await expectError(service.rpc('create_mock_checkout', { p_giver_id: giverA.id, p_offer_id: offer.id, p_quantity: 1 }), 'inactive partner cannot create checkout');
  await must(service.from('partners').update({ active: true }).eq('id', partner.id), 'restore QA partner');

  const validOrder = await checkout(giverA.id, 2);
  const validBefore = await orderSnapshot(validOrder, giverA.id);
  check(validBefore.order?.total_bani === fixture.price * 2, 'checkout total uses database offer price');
  check(validBefore.item?.[0]?.unit_price_bani === fixture.price && validBefore.payment?.amount_bani === fixture.price * 2, 'order item and payment use database-authoritative price');
  const paid = await must(service.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: validOrder, p_success: true }), 'valid confirmation');
  check(paid === 'paid', 'current three-argument confirmation signature executes for a valid Giver');
  check(paid === 'paid', 'valid Giver can pay an order');
  const validAfter = await orderSnapshot(validOrder, giverA.id);
  check(validAfter.order.status === 'paid' && validAfter.payment.status === 'succeeded', 'order and payment become paid authoritatively');
  check(validAfter.campaign.length === 1 && validAfter.campaign[0].quantity_total === 2 && validAfter.campaign[0].quantity_available === 2, 'payment creates authoritative campaign inventory');
  check(validAfter.event.length === 1, 'payment creates one analytics event');
  const duplicate = await must(service.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: validOrder, p_success: true }), 'duplicate successful confirmation');
  check(duplicate === 'paid', 'duplicate successful confirmation returns current status');
  const duplicateAfter = await orderSnapshot(validOrder, giverA.id);
  check(duplicateAfter.campaign.length === 1 && duplicateAfter.event.length === 1, 'duplicate successful confirmation creates no extra inventory or analytics');

  const wrongOwner = await service.rpc('confirm_mock_payment', { p_giver_id: giverB.id, p_order_id: validOrder, p_success: true });
  check(Boolean(wrongOwner.error) && wrongOwner.error.message === 'ORDER_NOT_FOUND', 'second Giver receives only safe ownership denial');
  check((await orderSnapshot(validOrder, giverA.id)).campaign.length === 1, 'wrong-owner confirmation has no side effects');

  const priceOrder = await checkout(giverA.id, 1);
  await must(service.from('offers').update({ giver_price_bani: fixture.price + 1 }).eq('id', offer.id), 'change QA offer price');
  await expectError(service.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: priceOrder, p_success: true }), 'changed offer price blocks confirmation');
  const priceAfter = await orderSnapshot(priceOrder, giverA.id);
  check(priceAfter.campaign.length === 0 && priceAfter.event.length === 0 && priceAfter.order.status === 'pending', 'price mismatch has no fulfillment side effects');
  await must(service.from('offers').update({ giver_price_bani: fixture.price }).eq('id', offer.id), 'restore QA offer price');

  for (const target of ['offer', 'partner']) {
    const order = await checkout(giverA.id, 1);
    if (target === 'offer') await must(service.from('offers').update({ active: false }).eq('id', offer.id), 'deactivate offer after checkout');
    else await must(service.from('partners').update({ active: false }).eq('id', partner.id), 'deactivate partner after checkout');
    await expectError(service.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: order, p_success: true }), `${target} deactivation blocks confirmation`);
    const after = await orderSnapshot(order, giverA.id);
    check(after.campaign.length === 0 && after.event.length === 0 && after.order.status === 'pending', `${target} deactivation has no fulfillment side effects`);
    if (target === 'offer') await must(service.from('offers').update({ active: true }).eq('id', offer.id), 'restore offer after checkout test');
    else await must(service.from('partners').update({ active: true }).eq('id', partner.id), 'restore partner after checkout test');
  }

  const failedOrder = await checkout(giverA.id, 1);
  check(await must(service.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: failedOrder, p_success: false }), 'failed confirmation') === 'failed', 'failed confirmation returns failed');
  const failedAgain = await must(service.rpc('confirm_mock_payment', { p_giver_id: giverA.id, p_order_id: failedOrder, p_success: true }), 'duplicate failed confirmation');
  const failedAfter = await orderSnapshot(failedOrder, giverA.id);
  check(failedAgain === 'failed' && failedAfter.order.status === 'failed' && failedAfter.payment.status === 'failed', 'failed confirmation is idempotent');
  check(failedAfter.campaign.length === 0 && failedAfter.event.length === 0, 'failed confirmation creates no inventory or payment-success event');

  const directOrder = await checkout(giverA.id, 1);
  const directRows = await orderSnapshot(directOrder, giverA.id);
  const mutationOrder = await must(service.from('giver_orders').insert({ giver_id: giverA.id, total_bani: 1 }).select('id').single(), 'financial mutation fixture');
  created.orders.push(mutationOrder.id);
  for (const db of [giverADb, giverBDb, studentDb]) {
    await expectError(db.from('giver_orders').insert({ giver_id: giverA.id, total_bani: 1 }), 'authenticated API cannot insert financial orders');
    const update = await db.from('giver_orders').update({ total_bani: 999 }).eq('id', directOrder).select('id');
    check(Boolean(update.error) || update.data?.length === 0, 'authenticated API cannot update financial orders');
    const remove = await db.from('giver_orders').delete().eq('id', directOrder).select('id');
    check(Boolean(remove.error) || remove.data?.length === 0, 'authenticated API cannot delete financial orders');
    await expectError(db.from('giver_order_items').insert({ order_id: mutationOrder.id, offer_id: offer.id, quantity: 1, unit_price_bani: fixture.price }), 'authenticated API cannot insert financial order items');
    const itemUpdate = await db.from('giver_order_items').update({ quantity: 2 }).eq('id', directRows.item[0].id).select('id');
    check(Boolean(itemUpdate.error) || itemUpdate.data?.length === 0, 'authenticated API cannot update financial order items');
    const itemDelete = await db.from('giver_order_items').delete().eq('id', directRows.item[0].id).select('id');
    check(Boolean(itemDelete.error) || itemDelete.data?.length === 0, 'authenticated API cannot delete financial order items');
    await expectError(db.from('payments').insert({ order_id: mutationOrder.id, provider: 'mock', provider_reference: `qa-0022-${crypto.randomUUID()}`, amount_bani: 1 }), 'authenticated API cannot insert financial payments');
    const paymentUpdate = await db.from('payments').update({ amount_bani: 999 }).eq('id', directRows.payment.id).select('id');
    check(Boolean(paymentUpdate.error) || paymentUpdate.data?.length === 0, 'authenticated API cannot update financial payments');
    const paymentDelete = await db.from('payments').delete().eq('id', directRows.payment.id).select('id');
    check(Boolean(paymentDelete.error) || paymentDelete.data?.length === 0, 'authenticated API cannot delete financial payments');
  }
  const directAfter = await orderSnapshot(directOrder, giverA.id);
  check(directAfter.order.total_bani === fixture.price && directAfter.order.status === 'pending', 'direct financial-table attempts do not mutate the fixture order');
  console.log(`PASS: ${assertions} hosted non-production 0022 assertions`);
} finally {
  await cleanup();
}
