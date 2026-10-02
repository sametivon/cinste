import { createClient } from "@supabase/supabase-js";

const password = "cinste-local-2026";
const accounts = [
  { role: "verified student", email: "verified.student@cinste.test", appRole: "student", name: "Alex Student", verification: "verified", university: "ASE București" },
  { role: "pending student", email: "pending.student@cinste.test", appRole: "student", name: "Dana Pending", verification: "pending", university: "POLITEHNICA București" },
  { role: "unverified student", email: "unverified.student@cinste.test", appRole: "student", name: "Nora Unverified", resetUnverified: true },
  { role: "giver", email: "giver@cinste.test", appRole: "giver", name: "Mara Giver" },
  { role: "café partner", email: "cafe.partner@cinste.test", appRole: "partner", name: "Café Partner", partnerSlug: "cafeneaua-verde" },
  { role: "cinema partner", email: "cinema.partner@cinste.test", appRole: "partner", name: "Cinema Partner", partnerSlug: "cinema-luna" },
  { role: "barber partner", email: "barber.partner@cinste.test", appRole: "partner", name: "Barber Partner", partnerSlug: "barber-club" },
  { role: "admin", email: "admin@cinste.test", appRole: "admin", name: "CINSTE Test Admin" },
];

function fail(message) { console.error(`\nBootstrap blocked: ${message}`); process.exit(1); }
if (process.env.NODE_ENV === "production") fail("NODE_ENV is production.");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) fail("Supabase URL or server-only service role key is missing.");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) fail(listError.message);
const existingByEmail = new Map(listed.users.map((user) => [user.email, user]));

for (const account of accounts) {
  let user = existingByEmail.get(account.email);
  if (user && user.app_metadata?.cinste_test_data !== true) fail(`${account.email} already exists but is not marked CINSTE test data.`);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email, password, email_confirm: true,
      user_metadata: { display_name: account.name, cinste_test_data: true },
      app_metadata: { cinste_test_data: true },
    });
    if (error || !data.user) fail(`could not create ${account.email}: ${error?.message ?? "unknown error"}`);
    user = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { ...user.user_metadata, display_name: account.name, cinste_test_data: true }, app_metadata: { ...user.app_metadata, cinste_test_data: true } });
    if (error) fail(`could not update ${account.email}: ${error.message}`);
  }
  const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, email: account.email, display_name: account.name, role: account.appRole }, { onConflict: "id" });
  if (profileError) fail(`could not set role for ${account.email}: ${profileError.message}`);
  if (account.resetUnverified) {
    const { error } = await supabase.from("student_profiles").delete().eq("user_id", user.id);
    if (error) fail(`could not reset ${account.email}: ${error.message}`);
  }
  if (account.verification) {
    const { data: university, error: universityError } = await supabase.from("universities").select("id").eq("name", account.university).single();
    if (universityError || !university) fail(`required university ${account.university} was not seeded.`);
    const { error } = await supabase.from("student_profiles").upsert({ user_id: user.id, full_name: account.name, university_id: university.id, verification_status: account.verification }, { onConflict: "user_id" });
    if (error) fail(`could not set verification for ${account.email}: ${error.message}`);
  }
  if (account.partnerSlug) {
    const { data: partner, error: partnerError } = await supabase.from("partners").select("id").eq("slug", account.partnerSlug).single();
    if (partnerError || !partner) fail(`required partner ${account.partnerSlug} was not seeded.`);
    const { error } = await supabase.from("partner_users").upsert({ partner_id: partner.id, user_id: user.id }, { onConflict: "partner_id,user_id" });
    if (error) fail(`could not assign ${account.email}: ${error.message}`);
  }
}

console.table(accounts.map(({ role, email }) => ({ ROLE: role, EMAIL: email, PASSWORD: password })));
console.log("\nDone. These accounts are marked cinste_test_data and can be safely re-bootstrapped.");
