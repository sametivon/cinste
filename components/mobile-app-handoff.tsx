"use client";

import { useEffect } from "react";

type MobileAppHandoffProps = { title: string; copy: string; openLabel: string; fallback: string };

// This Expo scheme is declared in apps/mobile/app.json. It opens only the app
// root, so no student claim or bearer token is placed in a web handoff URL.
const appUrl = process.env.NEXT_PUBLIC_STUDENT_APP_URL || "cinste://";

export function MobileAppHandoff({ title, copy, openLabel, fallback }: MobileAppHandoffProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.location.assign(appUrl), 200);
    return () => window.clearTimeout(timer);
  }, []);

  return <main className="shell max-w-xl py-20 text-center">
    <span className="tag">CINSTE</span><h1 className="mt-4 text-4xl font-black">{title}</h1>
    <p className="mt-4 text-lg text-stone-600">{copy}</p>
    <a className="btn mt-7 inline-flex" href={appUrl}>{openLabel}</a>
    <p className="mt-4 text-sm text-stone-500">{fallback}</p>
  </main>;
}
