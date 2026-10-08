'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';

type AuthHeroProps = {
  title: string;
  body: string;
  steps: readonly string[];
  variant: 'giver' | 'student' | 'generic';
};

export function AuthHero({ title, body, steps, variant }: AuthHeroProps) {
  const reduceMotion = useReducedMotion();
  const pointerX = useSpring(useMotionValue(0), { stiffness: 120, damping: 24 });
  const pointerY = useSpring(useMotionValue(0), { stiffness: 120, damping: 24 });
  const tiltX = useTransform(pointerY, [-0.5, 0.5], [3, -3]);
  const tiltY = useTransform(pointerX, [-0.5, 0.5], [-4, 4]);

  return (
    <motion.section
      className={`auth-intro auth-intro-${variant}`}
      style={reduceMotion ? undefined : { rotateX: tiltX, rotateY: tiltY }}
      onPointerMove={reduceMotion ? undefined : (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
        pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
      }}
      onPointerLeave={reduceMotion ? undefined : () => { pointerX.set(0); pointerY.set(0); }}
    >
      <div className="auth-network" aria-hidden="true">
        <svg viewBox="0 0 420 220" role="presentation">
          <motion.path className="auth-network-path" d="M34 158C105 158 106 62 190 91S284 173 386 48" initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} />
          <motion.path className="auth-network-path auth-network-path-soft" d="M34 158C116 205 158 34 242 87S318 126 386 48" initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, delay: .12, ease: [0.2, 0.8, 0.2, 1] }} />
          {[{ cx: 34, cy: 158, delay: 0 }, { cx: 190, cy: 91, delay: .24 }, { cx: 386, cy: 48, delay: .42 }].map((node) => <motion.circle className="auth-network-node" cx={node.cx} cy={node.cy} r="9" key={node.cx} initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: node.delay, duration: .4, type: 'spring', stiffness: 180, damping: 16 }} />)}
          {!reduceMotion && <motion.circle className="auth-network-pulse" cx="190" cy="91" r="16" initial={{ opacity: 0, scale: .4 }} animate={{ opacity: [0, .5, 0], scale: [0.4, 1.5, 2.2] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }} />}
        </svg>
      </div>
      <div className="auth-hero-copy">
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      <ol className="auth-journey">{steps.map((step) => <li key={step}>{step}</li>)}</ol>
    </motion.section>
  );
}
