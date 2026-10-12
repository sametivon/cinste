"use client";

import Link from "next/link";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import type { WebLocale } from "@/lib/i18n/web";
import { publicRoleDestinations } from "@/lib/auth-routing";
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

function Arrow() {
  return <svg className="lp-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
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

function HeroScene({ giver, student, experience, community }: { giver: string; student: string; experience: string; community: string }) {
  const reduced = useReducedMotion();
  const pathMotion = reduced ? undefined : { pathLength: [0, 1] };
  return <div className="lp-scene">
    <svg className="lp-scene-map" viewBox="0 0 120 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <motion.path className="lp-scene-path lp-scene-path-giver" d="M9 15C28 15 41 30 56 48" initial={false} whileInView={pathMotion} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.62, ease: [0.2, 0.8, 0.2, 1] }} />
      <motion.path className="lp-scene-path lp-scene-path-student" d="M111 15C92 15 79 30 64 48" initial={false} whileInView={pathMotion} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.62, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }} />
      <motion.path className="lp-scene-path lp-scene-path-community" d="M60 53C60 68 60 79 60 92" initial={false} whileInView={pathMotion} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.62, delay: 0.24, ease: [0.2, 0.8, 0.2, 1] }} />
      <circle cx="9" cy="15" r="2.4" className="lp-scene-origin-giver" />
      <circle cx="111" cy="15" r="2.4" className="lp-scene-origin-student" />
      <circle cx="60" cy="92" r="2.8" className="lp-scene-origin-community" />
    </svg>
    <span className="lp-scene-label lp-scene-giver">{giver}</span>
    <span className="lp-scene-label lp-scene-student">{student}</span>
    <div className="lp-scene-experience"><Mark /><span>{experience}</span></div>
    <span className="lp-scene-label lp-scene-community">{community}</span>
  </div>;
}

export function Landing({ locale }: { locale: WebLocale }) {
  const t = landingCopy[locale];
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
            <h1 id="hero-title">{t.title}<br /><em>{t.accent}</em></h1>
            <p className="lp-intro">{t.intro}</p>
            <div className="lp-actions">
              <Link className="lp-button" href={publicRoleDestinations.student}>{t.student}<Arrow /></Link>
              <Link className="lp-button" href={publicRoleDestinations.giver}>{t.give}<Arrow /></Link>
            </div>
            <div className="lp-hero-meta"><p className="lp-caption">{t.note}</p><a className="lp-text-link" href="#how-it-works">{t.how}<Arrow /></a></div>
          </div>
          <HeroScene giver={t.roles[0][0]} student={t.student} experience={t.story[1]} community={t.story[3]} />
        </section>

        <div className="lp-category-band"><ul className="lp-wrap" aria-label={t.example}>{t.categories.map((category) => <li key={category}>{category}</li>)}</ul></div>

        <section className="lp-wrap lp-section lp-paths" aria-labelledby="paths-title">
          <h2 id="paths-title">{t.rolesTitle}</h2>
          <div className="lp-path-pair">
            <article className="lp-path lp-path-student">
              <h3>{t.student}</h3>
              <p>{t.studentRole}</p>
              <Link className="lp-text-link" href={publicRoleDestinations.student}>{t.studentAction}<Arrow /></Link>
            </article>
            <article className="lp-path lp-path-giver">
              <h3>{t.roles[0][0]}</h3>
              <p>{t.roles[0][1]}</p>
              <Link className="lp-text-link" href={publicRoleDestinations.giver}>{t.roles[0][2]}<Arrow /></Link>
            </article>
          </div>
          <ul className="lp-future-roles">
            {t.roles.slice(1).map(([title, body, status]) => <li key={title}><span><strong>{title}</strong><span>{body}</span></span><small>{status}</small></li>)}
          </ul>
          <p className="lp-caption lp-workspace-note">{t.workspace}</p>
        </section>

        <section id="how-it-works" className="lp-journey lp-section" aria-labelledby="journey-title">
          <div className="lp-wrap">
            <h2 id="journey-title">{t.stepsTitle}</h2>
            <ol className="lp-steps">{t.steps.map(([title, body], index) => <li key={title}>
              <span className={`lp-step-number lp-step-${index + 1}`} aria-hidden="true">0{index + 1}</span>
              <h3>{title}</h3><p>{body}</p>
            </li>)}</ol>
          </div>
        </section>

        <section className="lp-discovery lp-section" aria-labelledby="discovery-title">
          <div className="lp-wrap">
            <div className="lp-discovery-heading"><h2 id="discovery-title">{t.discoveryTitle}</h2><p>{t.discoveryBody}</p></div>
            <div className="lp-discovery-showcase">
              <article className="lp-feature-experience"><ExperienceArt kind={experiences[0].kind} /><div><h3>{experiences[0].title}</h3><p>{experiences[0].body}</p></div></article>
              <div className="lp-other-experiences">{experiences.slice(1).map(({ kind, title, body }) => <article className={`lp-other-experience ${kind}`} key={kind}><ExperienceArt kind={kind} /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
            </div>
          </div>
        </section>

        <section id="impact" className="lp-impact lp-section" aria-labelledby="impact-title">
          <div className="lp-wrap lp-impact-inner">
            <div className="lp-impact-art" aria-hidden="true"><Mark /><span /><span /><span /></div>
          <div className="lp-impact-copy"><h2 id="impact-title">{t.impactTitle}</h2><p>{t.impactBody}</p><strong>{t.impactNote}</strong><div className="lp-actions"><Link className="lp-button" href={publicRoleDestinations.student}>{t.student}<Arrow /></Link><Link className="lp-button" href={publicRoleDestinations.giver}>{t.give}<Arrow /></Link></div></div>
          </div>
        </section>

        <section className="lp-wrap lp-final" aria-labelledby="final-title">
          <Mark />
          <h2 id="final-title">{t.finalTitle}</h2>
          <p>{t.finalBody}</p>
          <div className="lp-actions">
            <Link href={publicRoleDestinations.student} className="lp-button">{t.student}<Arrow /></Link>
            <Link href={publicRoleDestinations.giver} className="lp-button">{t.give}<Arrow /></Link>
          </div>
        </section>
      </main>
      <footer className="lp-wrap lp-footer"><a href="/" className="lp-wordmark" aria-label="CINSTE"><Mark />CINSTE</a><p>{t.footer}</p><a href="#how-it-works" className="lp-text-link">{t.how}<Arrow /></a><span className="lp-caption">© {new Date().getFullYear()} CINSTE</span></footer>
    </div>
  </MotionConfig>;
}
