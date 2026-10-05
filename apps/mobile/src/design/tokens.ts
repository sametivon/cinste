// CINSTE Design System v1 — mobile implementation tokens.
// Arabic glyphs intentionally fall back to the platform font while retaining this scale.
export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const color = {
  primary: '#C93F4A', primaryHover: '#A92E3B', primaryPressed: '#8B2330',
  canvas: '#FFF8F3', surface: '#FFFFFF', surfaceSubtle: '#FFF1EA',
  ink: '#231F20', muted: '#857B81', secondaryText: '#625B61', line: '#E9DED8', lineStrong: '#CDBEB7',
  lilac: '#7658B5', lilacSoft: '#F1EBFB', mint: '#177965', mintSoft: '#E5F5F0', sky: '#2F6FA8', skySoft: '#E8F3FB',
  success: '#147A63', successSoft: '#E4F5EF', warning: '#9A5800', warningSoft: '#FFF1D6',
  danger: '#B42332', dangerSoft: '#FCE9EB', info: '#2F6FA8', infoSoft: '#E8F3FB',
  // Compatibility aliases for existing student screens. New code should use the semantic tokens above.
  brand: '#C93F4A', brandDark: '#8B2330', coral: '#C93F4A', peach: '#FFF1EA', sand: '#FFF1EA',
} as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, display: 40, section: 48 } as const;
export const radius = { control: 8, button: 12, card: 16, hero: 24, pill: 999 } as const;
export const type = {
  display: { fontFamily: font.bold, fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  title: { fontFamily: font.bold, fontSize: 30, lineHeight: 38, letterSpacing: -0.6 },
  section: { fontFamily: font.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.25 },
  cardTitle: { fontFamily: font.semiBold, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
} as const;

export const shadow = {
  raised: { shadowColor: '#231F20', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  floating: { shadowColor: '#472D29', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
} as const;
