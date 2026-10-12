# CINSTE UI design DNA

Use this short reference when you create a UI mockup or implement one in code.
It summarizes existing sources. It does not set new design rules.

## Sources of truth

- [Brand direction](../decisions/brand.md): provisional V1 identity, voice, and open brand decisions.
- [Design system](design-system.md): authoritative web and mobile tokens, patterns, states, motion, and accessibility guidance.
- [Project decision](../decisions/project.md): role journeys and platform boundaries.
- [Repository rules](../../AGENTS.md): UI scope, security boundaries, and validation workflow.

## Visual character

- Use the brand's **Soft Social Energy** direction: warm, light, social, and trustworthy.
- Use the provisional coral-led palette, Plus Jakarta Sans, generous space, and rounded shapes. Get exact values from the design system.
- Let public and consumer screens use more expression. Keep Admin and Organization screens clear and restrained.
- Treat Ripple C / Soft Echo C as a provisional logo direction. Do not treat exploratory SVGs as final assets.

## Find the implemented patterns

| Surface | Start here |
| --- | --- |
| Mobile tokens | [tokens.ts](../../apps/mobile/src/design/tokens.ts) |
| Mobile controls and states | [ui.tsx](../../apps/mobile/src/components/ui.tsx) |
| Mobile offer card and imagery | [offer-card.tsx](../../apps/mobile/src/components/offer-card.tsx), [offer-visual.tsx](../../apps/mobile/src/components/offer-visual.tsx) |
| Web foundations | [globals.css](../../app/globals.css) |
| Public web | [landing.tsx](../../components/landing/landing.tsx), [landing.css](../../components/landing/landing.css) |
| Web role flows | [auth-hero.tsx](../../components/auth-hero.tsx), [partner-redemption.tsx](../../components/partner-redemption.tsx) |

## From mockup to code

1. Name the screen, role, platform, and user task. Read the relevant sources above.
2. Use the mockup for layout and hierarchy. Check its colors, type, controls, and states against the design system and existing components.
3. Reuse the affected surface's tokens and components. Keep product behavior and server authority unchanged.
4. Check narrow layouts, safe areas, focus, touch targets, long localized text, Arabic RTL, and reduced motion where they apply.
5. Compare the rendered screen with the mockup. Record necessary differences before calling the UI complete.

The mockup is a visual reference. The linked decisions, design system, and implemented behavior remain authoritative.
