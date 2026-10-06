'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { redeem } from '@/app/actions';
import { Scanner } from '@/components/scanner';
import { tokenFromScannedCode } from '@/lib/redemption-code';
import { redemptionPresentation, type PartnerInspection } from '@/lib/partner-redemption';

type Mode = 'ready' | 'scan' | 'manual';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return <button className="partner-primary" disabled={pending}>{pending ? 'Se confirmă…' : 'Confirmă răscumpărarea'}</button>;
}

function formatTime(value: string | null) {
  return value ? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : null;
}

export function PartnerRedemption({ inspected, token, result, error }: { inspected: PartnerInspection | null; token?: string; result?: string; error?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('ready');
  const [manualCode, setManualCode] = useState('');
  const state = inspected?.state ?? result ?? (error ? 'ERROR' : null);
  const presentation = redemptionPresentation(state);
  const goToValidation = (raw: string) => {
    const scannedToken = tokenFromScannedCode(raw);
    if (scannedToken) window.location.assign(`/partner?token=${encodeURIComponent(scannedToken)}`);
  };
  const reset = () => { setManualCode(''); setMode('ready'); router.replace('/partner'); };

  if (state) return <section className={`partner-result partner-result-${presentation.tone}`} aria-live="polite">
    <span className="partner-result-eyebrow">{presentation.isSuccess ? 'Confirmare' : 'Rezultat validare'}</span>
    <h2>{presentation.title}</h2><p>{presentation.description}</p>
    {inspected && (inspected.offer_name || inspected.partner_name) && <div className="partner-claim-context">
      {inspected.offer_name && <strong>{inspected.offer_name}</strong>}
      {inspected.partner_name && <span>{inspected.partner_name}</span>}
      {inspected.redeemed_at && <span>Răscumpărat la {formatTime(inspected.redeemed_at)}</span>}
      {!inspected.redeemed_at && inspected.expires_at && <span>Valabil până la {formatTime(inspected.expires_at)}</span>}
    </div>}
    <div className="partner-result-actions">
      {presentation.canConfirm && token && <form action={redeem}><input type="hidden" name="token" value={token} /><ConfirmButton /></form>}
      <button className={presentation.canConfirm ? 'partner-secondary' : 'partner-primary'} type="button" onClick={reset}>{presentation.isSuccess ? 'Scanează următorul CINSTE' : 'Înapoi la scanare'}</button>
    </div>
  </section>;

  return <section className="partner-ready" aria-labelledby="partner-redemption-title">
    <div className="partner-ready-copy"><span className="partner-kicker">Răscumpărare CINSTE</span><h1 id="partner-redemption-title">Scanează un CINSTE</h1><p>Validează experiența și confirmă răscumpărarea în câțiva pași simpli.</p></div>
    {mode === 'scan' ? <div className="partner-scan-panel">
      <div className="partner-panel-heading"><div><h2>Scanează codul QR</h2><p>Ține codul în cadru. Codul manual rămâne disponibil mai jos.</p></div><button type="button" className="partner-text-button" onClick={() => setMode('ready')}>Închide</button></div>
      <Scanner onToken={goToValidation} />
      <button type="button" className="partner-secondary partner-full-width" onClick={() => setMode('manual')}>Introdu codul în schimb</button>
    </div> : mode === 'manual' ? <form className="partner-manual-form" onSubmit={(event) => { event.preventDefault(); goToValidation(manualCode); }}>
      <div className="partner-panel-heading"><div><h2>Introdu codul CINSTE</h2><p>Folosește codul scurt sau lipește conținutul QR.</p></div><button type="button" className="partner-text-button" onClick={() => setMode('ready')}>Înapoi</button></div>
      <label htmlFor="partner-redemption-code">Cod CINSTE</label><input id="partner-redemption-code" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Introdu codul" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
      <button className="partner-primary" type="submit">Validează codul</button><button className="partner-secondary partner-full-width" type="button" onClick={() => setMode('scan')}>Deschide scannerul QR</button>
    </form> : <div className="partner-ready-actions">
      <button className="partner-primary partner-scan-action" type="button" onClick={() => setMode('scan')}><span aria-hidden="true">⌁</span> Scanează un CINSTE</button><button className="partner-secondary" type="button" onClick={() => setMode('manual')}>Introdu codul în schimb</button><p>Scannerul sau codul manual sunt validate în siguranță de CINSTE.</p>
    </div>}
  </section>;
}
