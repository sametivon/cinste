'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { redeem } from '@/app/actions';
import { Scanner } from '@/components/scanner';
import { tokenFromScannedCode } from '@/lib/redemption-code';
import { redemptionPresentation, type PartnerInspection } from '@/lib/partner-redemption';
import { formatWebDate, webT, type WebLocale } from '@/lib/i18n/web';

type Mode = 'ready' | 'scan' | 'manual';

function ConfirmButton({ locale }: { locale: WebLocale }) {
  const { pending } = useFormStatus();
  return <button className="partner-primary" disabled={pending}>{pending ? webT(locale, 'partner.confirming') : webT(locale, 'partner.confirm')}</button>;
}

export function PartnerRedemption({ locale, inspected, token, result, error }: { locale: WebLocale; inspected: PartnerInspection | null; token?: string; result?: string; error?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('ready');
  const [manualCode, setManualCode] = useState('');
  const state = inspected?.state ?? result ?? (error ? 'ERROR' : null);
  const presentation = redemptionPresentation(state, locale);
  const goToValidation = (raw: string) => { const scannedToken = tokenFromScannedCode(raw); if (scannedToken) window.location.assign(`/partner?token=${encodeURIComponent(scannedToken)}`); };
  const reset = () => { setManualCode(''); setMode('ready'); router.replace('/partner'); };

  if (state) return <section className={`partner-result partner-result-${presentation.tone}`} aria-live="polite"><span className="partner-result-eyebrow">CINSTE</span><h2>{presentation.title}</h2><p>{presentation.description}</p>{inspected && (inspected.offer_name || inspected.partner_name) && <div className="partner-claim-context">{inspected.offer_name && <strong>{inspected.offer_name}</strong>}{inspected.partner_name && <span>{inspected.partner_name}</span>}{inspected.redeemed_at && <span>{formatWebDate(locale, inspected.redeemed_at)}</span>}{!inspected.redeemed_at && inspected.expires_at && <span>{formatWebDate(locale, inspected.expires_at)}</span>}</div>}<div className="partner-result-actions">{presentation.canConfirm && token && <form action={redeem}><input type="hidden" name="token" value={token}/><ConfirmButton locale={locale}/></form>}<button className={presentation.canConfirm ? 'partner-secondary' : 'partner-primary'} type="button" onClick={reset}>{webT(locale, 'partner.scan')}</button></div></section>;

  return <section className="partner-ready" aria-labelledby="partner-redemption-title"><div className="partner-ready-copy"><span className="partner-kicker">CINSTE</span><h1 id="partner-redemption-title">{webT(locale, 'partner.scan')}</h1></div>{mode === 'scan' ? <div className="partner-scan-panel"><Scanner onToken={goToValidation}/><button type="button" className="partner-secondary partner-full-width" onClick={() => setMode('manual')}>{webT(locale, 'partner.manual')}</button></div> : mode === 'manual' ? <form className="partner-manual-form" onSubmit={(event) => { event.preventDefault(); goToValidation(manualCode); }}><label htmlFor="partner-redemption-code">CINSTE</label><input id="partner-redemption-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} required/><button className="partner-primary" type="submit">{webT(locale, 'partner.validate')}</button><button className="partner-secondary partner-full-width" type="button" onClick={() => setMode('scan')}>{webT(locale, 'partner.scan')}</button></form> : <div className="partner-ready-actions"><button className="partner-primary partner-scan-action" type="button" onClick={() => setMode('scan')}>{webT(locale, 'partner.scan')}</button><button className="partner-secondary" type="button" onClick={() => setMode('manual')}>{webT(locale, 'partner.manual')}</button></div>}</section>;
}
