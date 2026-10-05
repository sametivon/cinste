# CINSTE Design System v1

**Status:** Provisional but authoritative for implementation.

This is the implementation-level design source of truth for CINSTE web and
mobile. It applies the approved V1 brand direction without changing product,
business, privacy, authorization, or security behavior.

The **Ripple C / Soft Echo C** direction is a provisional V1 brand mark
direction. Current SVG geometry is not a final production logo and will be
revisited before launch. This document is not authorization for screen-specific
redesigns.

## 1. Color tokens

| Token | HEX | Intended use |
|---|---:|---|
| `color.primary` | `#C93F4A` | Primary actions and key brand moments |
| `color.primary.hover` | `#A92E3B` | Hover or focused pointer state |
| `color.primary.pressed` | `#8B2330` | Pressed state |
| `color.canvas` | `#FFF8F3` | Warm page background |
| `color.surface` | `#FFFFFF` | Cards, fields, sheets, elevated content |
| `color.surface.subtle` | `#FFF1EA` | Quiet grouped areas and decorative warmth |
| `color.text.primary` | `#231F20` | Main text and high-emphasis icons |
| `color.text.secondary` | `#625B61` | Supporting text |
| `color.text.muted` | `#857B81` | Captions and low-emphasis metadata |
| `color.border` | `#E9DED8` | Default boundaries and dividers |
| `color.border.strong` | `#CDBEB7` | Active neutral boundaries |
| `color.accent.lilac` | `#7658B5` | Expressive non-semantic accent |
| `color.accent.lilac.soft` | `#F1EBFB` | Lilac decorative surface |
| `color.accent.mint` | `#177965` | Expressive non-semantic accent |
| `color.accent.mint.soft` | `#E5F5F0` | Mint decorative surface |
| `color.accent.sky` | `#2F6FA8` | Expressive non-semantic accent |
| `color.accent.sky.soft` | `#E8F3FB` | Sky decorative surface |
| `color.success` | `#147A63` | Confirmed or successful outcome |
| `color.success.soft` | `#E4F5EF` | Success background |
| `color.warning` | `#9A5800` | Attention or time-sensitive state |
| `color.warning.soft` | `#FFF1D6` | Warning background |
| `color.destructive` | `#B42332` | Destructive action or failure |
| `color.destructive.soft` | `#FCE9EB` | Destructive background |
| `color.info` | `#2F6FA8` | Informational state |
| `color.info.soft` | `#E8F3FB` | Informational background |

### Accessible foreground pairings

- Use `color.text.primary` on canvas, surface, every `*.soft` surface, and
  mint fills.
- White may be used on primary, hover, pressed, lilac, sky, success, warning,
  and destructive fills after component-level contrast verification.
- Keep normal text and controls at WCAG AA contrast or better. If an accent
  cannot support text contrast, it is decorative only.

Lilac, mint, sky, and coral are decorative when they distinguish sections,
categories, illustration, or supportive card tone. Only named success, warning,
destructive, and info tokens have semantic status meaning. Never use color
alone to communicate a status.

## 2. Typography

Use **Plus Jakarta Sans** for web and mobile where supported. Prefer a variable
font or only the required weights to control payload. Use system fallbacks while
it loads. Arabic may require an appropriate fallback; preserve the same visual
hierarchy, optical size, line-height intent, and emphasis.

| Role | Weight | Web size / line-height | Mobile size / line-height |
|---|---:|---:|---:|
| Display | 700 | 48 / 56 | 36 / 42 |
| Heading 1 | 700 | 36 / 44 | 30 / 38 |
| Heading 2 | 700 | 28 / 36 | 24 / 32 |
| Heading 3 | 600 | 22 / 28 | 20 / 28 |
| Body | 400 | 16 / 24 | 16 / 24 |
| Body small | 400 | 14 / 20 | 14 / 20 |
| Label | 600 | 14 / 20 | 14 / 20 |
| Caption | 500 | 12 / 16 | 12 / 16 |

- Use 500 for compact controls and 600 for actions or labels; reserve 700 for
  headings and high-emphasis moments.
- Keep paragraph measure readable, avoid excessive all-caps, and use semantic
  heading order.
- Do not reduce body text below 14px; use captions only for secondary metadata.

## 3. Spacing scale

Use a 4px base unit. Do not introduce arbitrary gaps where a token fits.

| Token | Value | Token | Value |
|---|---:|---|---:|
| `space.0` | 0 | `space.1` | 4px |
| `space.2` | 8px | `space.3` | 12px |
| `space.4` | 16px | `space.5` | 20px |
| `space.6` | 24px | `space.8` | 32px |
| `space.10` | 40px | `space.12` | 48px |
| `space.16` | 64px | `space.20` | 80px |

Use 8–16px within compact controls, 16–24px within cards, and 32–64px between
major sections.

## 4. Border radius scale

| Token | Value | Use |
|---|---:|---|
| `radius.sm` | 8px | Inputs, compact controls, badges |
| `radius.md` | 12px | Buttons and standard cards |
| `radius.lg` | 16px | Prominent cards and sheets |
| `radius.xl` | 24px | Hero or expressive consumer modules |
| `radius.pill` | 999px | Tags, avatars, compact pills |

Use rounded shapes with restraint. Operational surfaces favor `sm` and `md`;
consumer and public moments may use `lg` and `xl`.

## 5. Shadows and elevation

Use borders before shadows. Shadows are soft, low-opacity, and communicate
layering or interaction—not decoration.

| Token | Value |
|---|---|
| `shadow.1` | `0 1px 2px rgb(35 31 32 / 6%)` |
| `shadow.2` | `0 6px 18px rgb(71 45 41 / 10%)` |
| `shadow.3` | `0 14px 32px rgb(71 45 41 / 12%)` |

Use `shadow.1` for raised controls, `shadow.2` for menus or hoverable cards,
and `shadow.3` only for modal-like layers. Avoid heavy floating-card effects.

## 6. Buttons

Every button has a visible label or accessible name, a visible focus state, and
a 44px minimum touch target on mobile.

| Variant | Base treatment | Interaction |
|---|---|---|
| Primary | Coral fill, white label | Hover and pressed primary tokens |
| Secondary | Surface fill, border, primary or text label | Peer action, not every secondary control |
| Ghost | Transparent, primary or text label | Low-emphasis contexts; preserve focus boundary |
| Destructive | Destructive fill, white label | Destructive confirmation only |

Disabled buttons use muted text and a subtle neutral surface while retaining
their label. Loading buttons retain their label, add progress feedback, prevent
repeated activation, and preserve width.

## 7. Card patterns

### Consumer card

Warm surface, `radius.lg`, 16–24px padding, optional soft accent background,
and one clear primary action. Use expressive color or imagery sparingly.

### Experience or opportunity card

Lead with experience, partner, or opportunity title, then essential
availability, timing, and action. Accent color may cue a category but never
acts as the only eligibility or availability signal.

### Metric card

Use a concise label, a prominent value, and supporting context or trend. Do
not invent precision; show unavailable or explanatory states where data is
absent.

### Operational card

Favor scanability: `radius.md`, surface/border separation, persistent labels,
record context, and restrained color. Avoid decorative gradients or oversized
metrics.

## 8. Status badges

Badges combine text, a stable semantic color, and optional icon; color alone is
never sufficient.

| Badge | Token pair | Typical lifecycle use |
|---|---|---|
| Neutral | text-secondary on surface-subtle | Draft, inactive, archived, unknown |
| Informational | info on info soft | Published, in review, scheduled |
| Success | success on success soft | Active, approved, completed, redeemed |
| Warning | warning on warning soft | Pending, expiring, overdue, action needed |
| Destructive | destructive on destructive soft | Rejected, cancelled, failed, revoked |

Use existing authoritative product state names; do not redefine backend
lifecycle meaning through visual treatment.

## 9. Form and input styles

- Labels are persistent, above controls, and use Label styling; placeholders
  are not labels.
- Inputs, selects, and textareas share `radius.sm`, surface fill, 1px border,
  and a 44px minimum control height where practical.
- Helper text sits below its control and explains format, limit, or consequence
  before submission.
- Error state uses destructive color plus explicit text; never a red border
  alone. Preserve entered values where safe.
- Focus uses a clearly visible 2px primary or dark high-contrast ring outside
  the component boundary. Do not remove focus outlines without replacement.
- Select and textarea labels, spacing, errors, and disabled behavior stay
  consistent with text inputs.

## 10. Empty, loading, error, and success states

- **Empty:** Explain what is absent and give the next relevant action only when
  the user has permission to take it.
- **Loading:** Use content-shaped skeletons for initial page/card loading and a
  spinner for compact action feedback. Never present loading as zero data.
- **Error:** State what failed plainly, preserve useful context, and offer retry
  only when safe. Do not expose internal identifiers or secrets.
- **Success:** Confirm the completed action briefly and visibly without
  blocking the next task. Use success styling plus text.

## 11. Motion principles

Motion is subtle, soft, modern, and purposeful. It clarifies state, continuity,
and spatial relationships rather than competing for attention.

| Use | Duration | Easing |
|---|---:|---|
| Press, focus, small feedback | 120–160ms | ease-out |
| Card, menu, state transition | 180–240ms | soft ease-out |
| Sheet, modal, section reveal | 240–320ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

Respect reduced-motion preferences. Consumer-facing and public surfaces may
use more expressive gradient, connection, or reveal motion; Admin and
Organization surfaces should remain shorter and functional. No heavy 3D,
scroll-jacking, or gimmicky cursor effects.

## 12. Responsive principles

- Start mobile-first for student flows and narrow web layouts; add space and
  information density progressively for tablet and desktop.
- Preserve primary actions near their content and maintain one clear action
  hierarchy at every width.
- Reflow grids into readable stacks; avoid horizontal overflow, cramped
  toolbars, and dense control walls.
- On desktop, use width constraints and grouped controls rather than stretching
  every form or table edge-to-edge.
- Test narrow web, tablet, desktop, and mobile safe-area states.

## 13. Consumer and operational surfaces

Public landing pages and student mobile may be expressive, colorful, and
motion-rich: soft gradients, generous space, and experience-led composition
are appropriate. Admin and Organization surfaces are simpler and functional:
high information clarity, restrained accents, and low-motion feedback.

Both clearly belong to CINSTE through shared coral-led palette, type scale,
spacing, radius, status language, and accessibility rules.

## 14. Accessibility principles

- Meet contrast requirements for text and controls; verify component states,
  not only base tokens.
- Use semantic headings, visible labels, descriptive accessible names, and
  programmatic feedback for validation and async changes.
- Keep keyboard focus visible and logical; do not rely on hover alone.
- Never communicate status, validation, or availability by color alone.
- Use 44px minimum touch targets for mobile/touch interaction and avoid tightly
  packed controls.
- Keep normal body text readable at 16px where possible and never below 14px.
- Test localization expansion, long labels, RTL ordering, and Arabic fallback
  rendering. Avoid direction-sensitive layout assumptions.

## 15. Implementation guidance

- Prefer shared tokens and shared components over one-off styling.
- Do not hardcode arbitrary colors, radii, spacing, shadows, or type sizes when
  a system token exists.
- Extend this system when a reusable pattern is missing; do not invent isolated
  screen styles.
- Future UI work must preserve existing product, business, security,
  authorization, privacy, and data behavior while changing presentation.
