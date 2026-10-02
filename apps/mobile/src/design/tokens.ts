export const color = {
  brand: '#146B4E', brandDark: '#103F31', coral: '#FF6B57', canvas: '#FFF9F2', surface: '#FFFFFF', ink: '#18211F', muted: '#69736F', line: '#E9E5DD', success: '#2F8A63', warning: '#C87520', danger: '#C94B43', mint: '#DDEFE5', peach: '#FFF0E9', sand: '#F4EEE2',
} as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, display: 40 } as const;
export const radius = { control: 14, button: 16, card: 20, hero: 28, pill: 999 } as const;
export const type = {
  display: { fontSize: 38, lineHeight: 42, fontWeight: '900' as const, letterSpacing: -1.4 }, title: { fontSize: 31, lineHeight: 36, fontWeight: '900' as const, letterSpacing: -1 }, section: { fontSize: 21, lineHeight: 26, fontWeight: '800' as const }, cardTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800' as const }, body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const }, meta: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const }, label: { fontSize: 14, lineHeight: 18, fontWeight: '800' as const },
} as const;

export const shadow = { raised: { shadowColor: '#18211F', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 } } as const;
