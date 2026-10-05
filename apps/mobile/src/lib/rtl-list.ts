export function directionalListKey(name: string, isRTL: boolean) {
  return `${name}-${isRTL ? 'rtl' : 'ltr'}`;
}
