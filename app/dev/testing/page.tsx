import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const accounts = [
  ["Student verificat", "verified.student@cinste.test"],
  ["Student în verificare", "pending.student@cinste.test"],
  ["Student neverificat (resetabil)", "unverified.student@cinste.test"],
  ["Giver", "giver@cinste.test"],
  ["Partener cafenea", "cafe.partner@cinste.test"],
  ["Partener cinema", "cinema.partner@cinste.test"],
  ["Partener barber", "barber.partner@cinste.test"],
  ["Admin", "admin@cinste.test"],
];

export default async function TestingPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const db = await createClient();
  const { data: campaigns } = await db.from("campaigns").select("id,name,quantity_total,quantity_available,status,offers(name,partners(name))").order("created_at", { ascending: false });
  return <main className="shell max-w-4xl py-10">
    <span className="tag">LOCAL DEVELOPMENT ONLY</span><h1 className="mt-4 text-4xl font-black">CINSTE testing desk</h1>
    <p className="mt-3 text-stone-600">This page exposes no Supabase secrets or redemption tokens. It is unavailable in production.</p>
    <section className="card mt-7"><h2 className="text-2xl font-black">Test accounts</h2><p className="mt-2">Password for every account: <code className="rounded bg-stone-100 px-2 py-1">cinste-local-2026</code></p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Role</th><th>Email</th></tr></thead><tbody>{accounts.map(([role,email])=><tr className="border-t" key={email}><td className="py-2 font-bold">{role}</td><td>{email}</td></tr>)}</tbody></table></div><Link className="btn mt-5" href="/login">Log in</Link></section>
    <section className="card mt-5"><h2 className="text-2xl font-black">Seeded inventory</h2><div className="mt-3 space-y-2">{campaigns?.map((campaign:any)=><div className="flex justify-between border-b pb-2" key={campaign.id}><span><b>{campaign.offers?.name}</b> · {campaign.offers?.partners?.name}<small className="ml-2">{campaign.name}</small></span><span>{campaign.quantity_available}/{campaign.quantity_total} · {campaign.status}</span></div>)}</div></section>
    <section className="mt-5 flex flex-wrap gap-3"><Link className="btn" href="/">Student marketplace</Link><Link className="btn" href="/giver">Giver</Link><Link className="btn" href="/partner">Partner</Link><Link className="btn" href="/admin">Admin</Link></section>
  </main>;
}
