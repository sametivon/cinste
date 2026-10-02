import { redirect } from 'next/navigation';
export default async function RedemptionLink({params}:{params:Promise<{token:string}>}){redirect(`/partner?token=${encodeURIComponent((await params).token)}`)}
