export function tokenFromScannedCode(value: string) {
  const scanned = value.trim();
  if (!scanned) return '';

  try {
    const url = new URL(scanned);
    const match = url.pathname.match(/^\/r\/([^/]+)$/);
    if (match) return match[1];
  } catch {
    // A partner may scan the manual token value rather than a CINSTE URL.
  }

  return scanned.replace(/^.*\/r\//, '');
}
