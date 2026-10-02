import { createClient } from '@supabase/supabase-js';

if (process.env.NODE_ENV === 'production') throw new Error('Claim maintenance refuses NODE_ENV=production. Use a separately authorized scheduler in production.');
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase URL or server-only service role key is missing.');

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.rpc('expire_stale_claims');
if (error) throw error;
console.log(`Restored inventory for ${data ?? 0} stale CINSTE claim reservation(s).`);
