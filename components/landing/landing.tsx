"use client";

import Link from "next/link";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { WebLocale } from "@/lib/i18n/web";
import { landingCopy } from "./copy";
import "./landing.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";

// Existing Soft Echo C exploration; intentionally not production-final geometry.
function Mark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 128 128" fill="none" aria-hidden="true">
    <path d="M91 30C78 19 57 18 42 28C20 43 18 75 38 94C53 108 76 108 91 96" stroke="currentColor" strokeWidth="19" strokeLinecap="round" />
    <path d="M91 69C99 72 105 78 108 86" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
  </svg>;
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false}
    whileInView={reduced ? undefined : { y: [12, 0] }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.32, delay, ease: [0.2, 0.8, 0.2, 1] }}>{children}</motion.div>;
}

function ExperienceArt({ kind }: { kind: "cinema" | "care" | "activity" }) {
  return <svg viewBox="0 0 320 200" aria-hidden="true" className="experience-art" fill="none">
    {kind === "cinema" ? <>
      <rect x="56" y="32" width="208" height="124" rx="16" fill="var(--lp-surface)" />
      <path d="M78 56H242V128H78Z" fill="var(--lp-lilac-soft)" />
      <path d="M142 72L180 92L142 112Z" fill="var(--lp-lilac)" />
      <path d="M50 180V168Q50 154 64 154H80Q94 154 94 168V180M112 180V168Q112 154 126 154H142Q156 154 156 168V180M174 180V168Q174 154 188 154H204Q218 154 218 168V180M236 180V168Q236 154 250 154H266Q280 154 280 168V180" stroke="var(--lp-lilac)" strokeWidth="8" />
    </> : kind === "care" ? <>
      <rect x="92" y="20" width="136" height="160" rx="64" fill="var(--lp-surface)" />
      <rect x="108" y="36" width="104" height="128" rx="48" fill="var(--lp-canvas)" />
      <path d="M132 136C120 106 138 64 172 66C196 68 199 100 180 112" stroke="var(--lp-primary)" strokeWidth="10" strokeLinecap="round" />
      <path d="M57 64V88M45 76H69M257 124V148M245 136H269" stroke="var(--lp-primary)" strokeWidth="4" strokeLinecap="round" />
    </> : <>
      <path d="M30 155C70 160 88 62 135 70S190 180 226 121S275 46 299 55" stroke="var(--lp-surface)" strokeWidth="32" strokeLinecap="round" />
      <path d="M30 155C70 160 88 62 135 70S190 180 226 121S275 46 299 55" stroke="var(--lp-mint)" strokeWidth="3" strokeDasharray="5 10" />
      <circle cx="135" cy="70" r="16" fill="var(--lp-mint)" /><circle cx="226" cy="121" r="12" fill="var(--lp-sky)" />
      <circle cx="62" cy="44" r="20" fill="var(--lp-surface)" />
    </>}
  </svg>;
}

export function Landing({ locale }: { locale: WebLocale }) {
  const t = landingCopy[locale];
  const reduced = useReducedMotion();
  const experiences = [
    { kind: "cinema" as const, title: t.cinema, body: t.cinemaText },
    { kind: "care" as const, title: t.care, body: t.careText },
    { kind: "activity" as const, title: t.activity, body: t.activityText },
  ];
  return <MotionConfig reducedMotion="user">
    <div className="cinste-landing" dir={locale === "ar" ? "rtl" : "ltr"}>
      <a className="lp-skip" href="#landing-content">{t.skip}</a>
      <main id="landing-content" tabIndex={-1}>
        <section className="lp-wrap lp-hero" aria-labelledby="hero-title">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow"><span className="lp-dot" />{t.eyebrow}</p>
            <h1 id="hero-title">{t.title}<br /><em>{t.accent}</em></h1>
            <p className="lp-intro">{t.intro}</p>
            <div className="lp-actions"><a className="lp-button" href="#how-it-works">{t.student}<span aria-hidden="true">↓</span></a><Link className="lp-button lp-secondary" href="/giver">{t.give}</Link></div>
            <p className="lp-caption">{t.note}</p>
            <a className="lp-text-link" href="#how-it-works">{t.how}<span aria-hidden="true"> ↓</span></a>
          </div>
          <div className="lp-scene" aria-label={t.example}>
            <div className="lp-scene-disc" />
            <svg className="lp-thread" viewBox="0 0 500 480" fill="none" aria-hidden="true">
              <motion.path d="M28 300C50 450 470 468 457 239C452 132 294 91 222 148C114 233 102 85 171 33"
                stroke="var(--lp-primary)" strokeWidth="2" strokeDasharray="6 10"
                initial={false} whileInView={reduced ? undefined : { pathLength: [0, 1] }} viewport={{ once: true }}
                transition={{ duration: 0.32 }} />
            </svg>
            <Reveal className="lp-ticket" delay={0.08}>
              <div className="lp-ticket-top"><span>CINSTE</span><Mark /></div>
              <ExperienceArt kind="cinema" />
              <h2>{t.cinema}</h2><p>{t.cinemaText}</p>
              <div className="lp-ticket-stub"><span>{t.example}</span><span aria-hidden="true">01 / 03</span></div>
            </Reveal>
            <Reveal className="lp-mini-card" delay={0.16}><span className="lp-mini-art" aria-hidden="true">✳</span><div><strong>{t.activity}</strong><p>{t.activityText}</p></div></Reveal>
            <div className="lp-echo-note"><Mark /><span>{t.impactNote}</span></div>
          </div>
        </section>

        <div className="lp-category-band"><div className="lp-wrap">{t.categories.map((category) => <span key={category}>{category}<span aria-hidden="true">✳</span></span>)}</div></div>

        <section id="how-it-works" className="lp-wrap lp-section">
          <Reveal className="lp-section-heading"><p className="lp-eyebrow">{t.how}</p><h2>{t.stepsTitle}</h2></Reveal>
          <ol className="lp-steps">{t.steps.map(([title, body], index) => <li key={title}><Reveal delay={index * 0.04}><span className="lp-step-number">0{index + 1}</span><h3>{title}</h3><p>{body}</p></Reveal></li>)}</ol>
        </section>

        <section className="lp-discovery lp-section">
          <div className="lp-wrap"><Reveal className="lp-discovery-heading"><div><p className="lp-eyebrow">{t.discovery}</p><h2>{t.discoveryTitle}</h2></div><p>{t.discoveryBody}</p></Reveal>
            <div className="lp-experiences">{experiences.map((experience, index) => <Reveal key={experience.kind} className={`lp-experience ${experience.kind}`} delay={index * 0.04}>
              <ExperienceArt kind={experience.kind} /><div><span className="lp-caption">0{index + 1}</span><h3>{experience.title}</h3><p>{experience.body}</p></div>
            </Reveal>)}</div>
          </div>
        </section>

        <section id="impact" className="lp-wrap lp-section lp-impact">
          <Reveal className="lp-impact-art"><Mark className="lp-impact-mark" /><div className="lp-story">{t.story.map((label, i) => <div key={label}><span aria-hidden="true">0{i + 1}</span>{label}</div>)}</div></Reveal>
          <Reveal className="lp-impact-copy"><p className="lp-eyebrow">{t.impact}</p><h2>{t.impactTitle}</h2><p>{t.impactBody}</p><strong className="lp-impact-note">{t.impactNote}</strong><a className="lp-text-link" href="#how-it-works">{t.student} <span aria-hidden="true">↓</span></a></Reveal>
        </section>

        <section className="lp-wrap lp-section lp-roles"><h2>{t.rolesTitle}</h2>{t.roles.map(([title, body, link], i) => <Reveal className="lp-role" key={title}><span className="lp-role-index">0{i + 1}</span><h3>{title}</h3><p>{body}</p><Link className="lp-text-link" href={["/giver", "/partner", "/organization"][i]}>{link} <span aria-hidden="true">↗</span></Link></Reveal>)}<p className="lp-caption">{t.workspace}</p></section>

        <section className="lp-wrap lp-final"><Mark /><p className="lp-eyebrow">CINSTE</p><h2>{t.finalTitle}</h2><p>{t.finalBody}</p><div className="lp-actions"><Link href="/giver" className="lp-button">{t.give}<span aria-hidden="true">↗</span></Link><a href="#how-it-works" className="lp-button lp-secondary">{t.student}</a></div></section>
      </main>
      <footer className="lp-wrap lp-footer"><a href="/" className="lp-wordmark" aria-label="CINSTE"><Mark />CINSTE</a><p>{t.footer}</p><a href="#how-it-works" className="lp-text-link">{t.how}</a><span className="lp-caption">© {new Date().getFullYear()} CINSTE</span></footer>
    </div>
  </MotionConfig>;
}
