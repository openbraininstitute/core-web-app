import { useEffect, useRef, useState } from 'react';

const MESSAGE_TYPE = 'consent_granted';

export function emitConsentGranted() {
  if (typeof window === 'undefined') return;
  // TODO: provide explicit origin, remove wildcard.
  window.opener?.postMessage({ messageType: MESSAGE_TYPE }, '*');
}

export function useConsent() {
  const [consentGranted, setConsentGranted] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);
  const rejectRef = useRef<((reason: Error) => void) | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.messageType === MESSAGE_TYPE) {
        setConsentGranted(true);
        resolveRef.current?.();
      }
    };

    window.addEventListener('message', handler);

    return () => {
      window.removeEventListener('message', handler);
      rejectRef.current?.(new Error('Component unmounted'));
    };
  }, []);

  const waitForConsent = () => {
    return new Promise<void>((resolve, reject) => {
      if (consentGranted) {
        resolve();
      } else {
        resolveRef.current = resolve;
        rejectRef.current = reject;
      }
    });
  };

  return { consentGranted, waitForConsent };
}
