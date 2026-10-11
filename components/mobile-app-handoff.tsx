"use client";

import { useEffect } from "react";
import Link from 'next/link';

type MobileAppHandoffProps = { title: string; copy: string; nextStep?: string; nextLabel?: string; statusLabel?: string; accountLabel?: string; openLabel: string; fallback?: string; betaNote?: string; autoOpen?: boolean };

// This Expo scheme is declared in apps/mobile/app.json. It opens only the app
// root, so no student claim or bearer token is placed in a web handoff URL.
const appUrl = process.env.NEXT_PUBLIC_STUDENT_APP_URL || "cinste://";

export function MobileAppHandoff({ title, copy, nextStep, nextLabel, statusLabel, accountLabel, openLabel, fallback, betaNote, autoOpen = true }: MobileAppHandoffProps) {
  useEffect(() => {
    if (!autoOpen) return;
    const timer = window.setTimeout(() => window.location.assign(appUrl), 200);
    return () => window.clearTimeout(timer);
  }, [autoOpen]);

  return <main className="shell max-w-3xl py-12 sm:py-20">
    <section className="card p-6 sm:p-10">
      {statusLabel && <span className="tag">{statusLabel}</span>}
      <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700">{copy}</p>
      {nextStep && <div className="mt-8 rounded-2xl bg-rose-50 p-5 text-stone-800">{nextLabel && <h2 className="font-bold">{nextLabel}</h2>}<p className="mt-2 leading-7">{nextStep}</p></div>}
      <div className="mt-8 flex flex-wrap items-center gap-4"><a className="btn" href={appUrl}>{openLabel}</a>{accountLabel && <Link className="btn secondary" href="/account">{accountLabel}</Link>}</div>
      {fallback && <p className="mt-5 text-sm text-stone-600">{fallback}</p>}
      {betaNote && <p className="mt-2 text-sm text-stone-600">{betaNote}</p>}
    </section>
  </main>;
}
