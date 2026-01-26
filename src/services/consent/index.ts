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

  const waitForConsent = (signal?: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
      if (consentGranted) {
        resolve();
        return;
      }

      if (signal?.aborted) {
        reject(signal.reason || new Error('Aborted'));
        return;
      }

      const onAbort = () => {
        resolveRef.current = null;
        rejectRef.current = null;
        reject(signal!.reason || new Error('Aborted'));
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      resolveRef.current = () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };
      rejectRef.current = (reason) => {
        signal?.removeEventListener('abort', onAbort);
        reject(reason);
      };
    });
  };

  return { consentGranted, waitForConsent };
}
