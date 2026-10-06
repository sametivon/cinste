'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenFromScannedCode } from '@/lib/redemption-code';

type ScannerControls = { stop: () => void };
type Diagnostics = { streamActive: boolean; videoReady: boolean; decoderStarted: boolean; attempts: number; lastDecoderError: string; rawDecodeDetected: boolean };
const emptyDiagnostics: Diagnostics = { streamActive: false, videoReady: false, decoderStarted: false, attempts: 0, lastDecoderError: '—', rawDecodeDetected: false };
const isRetryableFrameError = (name: string) => ['NotFoundException', 'ChecksumException', 'FormatException'].includes(name);

export function Scanner({ onToken }: { onToken: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const scanningRef = useRef(false);
  const attemptsRef = useRef(0);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [diagnostics, setDiagnostics] = useState<Diagnostics>(emptyDiagnostics);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const stopScanner = useCallback(() => {
    scanningRef.current = false; controlsRef.current?.stop(); controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);
  useEffect(() => stopScanner, [stopScanner]);
  const markVideoReady = () => {
    const stream = videoRef.current?.srcObject;
    setDiagnostics((current) => ({ ...current, videoReady: true, streamActive: stream instanceof MediaStream && stream.getVideoTracks().some((track) => track.readyState === 'live') }));
  };
  const startScanner = async () => {
    if (scanningRef.current || !videoRef.current) return;
    setMessage(''); attemptsRef.current = 0; setDiagnostics(emptyDiagnostics); scanningRef.current = true; setScanning(true);
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 500, tryPlayVideoTimeout: 10_000 });
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error, callbackControls) => {
        if (!scanningRef.current) return;
        attemptsRef.current += 1;
        const errorName = error?.name ?? '—';
        if (attemptsRef.current === 1 || attemptsRef.current % 10 === 0 || result || (error && !isRetryableFrameError(errorName))) {
          const stream = videoRef.current?.srcObject;
          setDiagnostics((current) => ({ ...current, streamActive: stream instanceof MediaStream && stream.getVideoTracks().some((track) => track.readyState === 'live'), videoReady: Boolean(videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA), attempts: attemptsRef.current, lastDecoderError: errorName, rawDecodeDetected: current.rawDecodeDetected || Boolean(result) }));
        }
        if (result) {
          const token = tokenFromScannedCode(result.getText());
          if (!token) return;
          setMessage('Cod QR detectat. Validăm…'); callbackControls.stop(); stopScanner(); onToken(token); return;
        }
        if (error && !isRetryableFrameError(errorName)) { callbackControls.stop(); stopScanner(); setMessage(`Scannerul s-a oprit (${errorName}). Folosește codul manual sau pornește camera din nou.`); }
      });
      if (!scanningRef.current) { controls.stop(); return; }
      controlsRef.current = controls;
      const stream = videoRef.current?.srcObject;
      setDiagnostics((current) => ({ ...current, decoderStarted: true, streamActive: stream instanceof MediaStream && stream.getVideoTracks().some((track) => track.readyState === 'live') }));
    } catch (error) {
      stopScanner(); setMessage('Nu am putut porni camera. Verifică permisiunea și folosește codul manual dacă este nevoie.');
      setDiagnostics((current) => ({ ...current, lastDecoderError: error instanceof Error ? error.name : 'CameraStartError' }));
    }
  };
  return <div className="partner-camera">
    <button type="button" className="partner-primary" onClick={scanning ? stopScanner : startScanner}>{scanning ? 'Închide scannerul' : 'Pornește camera'}</button>
    <video ref={videoRef} className={scanning ? 'partner-camera-video' : 'hidden'} autoPlay muted playsInline onCanPlay={markVideoReady} onLoadedMetadata={markVideoReady} aria-label="Previzualizare cameră pentru scanarea codului QR" />
    <p className={message ? 'partner-camera-error' : 'partner-camera-help'}>{message || (scanning ? 'Îndreaptă camera spre codul QR CINSTE.' : 'Camera pornește doar când alegi scannerul.')}</p>
    {isDevelopment && <dl className="partner-scanner-diagnostics"><dt>Stream activ</dt><dd>{diagnostics.streamActive ? 'da' : 'nu'}</dd><dt>Video pregătit</dt><dd>{diagnostics.videoReady ? 'da' : 'nu'}</dd><dt>Decoder pornit</dt><dd>{diagnostics.decoderStarted ? 'da' : 'nu'}</dd><dt>Încercări</dt><dd>{diagnostics.attempts}</dd><dt>Ultima eroare</dt><dd>{diagnostics.lastDecoderError}</dd><dt>Cod brut detectat</dt><dd>{diagnostics.rawDecodeDetected ? 'da' : 'nu'}</dd></dl>}
  </div>;
}
