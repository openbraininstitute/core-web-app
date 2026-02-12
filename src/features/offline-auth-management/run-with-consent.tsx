import { useCallback } from 'react';

import { useEnsureOfflineTokenConsent } from '@/features/offline-auth-management/ensure-consent';

type NotifyError = (args: { message: string; duration?: number }) => void;

export function useRunWithOfflineTokenConsent(options?: {
  notifyError?: NotifyError;
  duration?: number;
  messages?: Partial<{
    denied: string;
    timeout: string;
    error: string;
  }>;
}) {
  const { ensure, modal, cancel, openConsentLink, prime } = useEnsureOfflineTokenConsent();

  const runWithConsent = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      const consent = await ensure();
      if (!consent.ok) {
        if (consent.reason === 'cancelled') return undefined;

        const duration = options?.duration ?? 10;
        const msg = (() => {
          if (consent.reason === 'denied') {
            return options?.messages?.denied ?? 'Consent declined. Task was not started.';
          }
          if (consent.reason === 'timeout') {
            return (
              options?.messages?.timeout ?? 'Consent timed out. Please grant consent to continue.'
            );
          }
          return options?.messages?.error ?? consent.message ?? 'Unexpected consent error.';
        })();

        options?.notifyError?.({ message: msg, duration });
        return undefined;
      }

      return await fn();
    },
    [
      ensure,
      options?.duration,
      options?.messages?.denied,
      options?.messages?.error,
      options?.messages?.timeout,
      options?.notifyError,
    ]
  );

  return {
    modal,
    ensure,
    cancel,
    openConsentLink,
    prime,
    runWithConsent,
  };
}
