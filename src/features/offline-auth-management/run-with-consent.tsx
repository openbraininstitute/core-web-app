'use client';

import { useCallback } from 'react';

import { useEnsureOfflineTokenConsent } from '@/features/offline-auth-management/ensure-consent';

import type { EnsureResult } from '@/features/offline-auth-management/ensure-consent';

type NotifyError = (params: { message: string; duration?: number; key?: string }) => void;

type UseRunWithOfflineTokenConsentOptions = {
  /** When true, use localStorage and in-memory prefetch cache. Default: false (no cache). */
  useCache?: boolean;
  notifyError?: NotifyError;
  messages?: {
    denied?: string;
    timeout?: string;
    cancelled?: string;
    error?: string;
  };
};

export function useRunWithOfflineTokenConsent(options?: UseRunWithOfflineTokenConsentOptions) {
  const { useCache, notifyError, messages = {} } = options ?? {};
  const gate = useEnsureOfflineTokenConsent({ useCache });

  const runWithConsent = useCallback(
    async (args: { fn: () => Promise<unknown> }): Promise<unknown> => {
      const result: EnsureResult = await gate.ensure();

      if (result.ok) {
        return args.fn();
      }

      const msg =
        result.reason === 'denied'
          ? (messages.denied ?? 'Consent was declined.')
          : result.reason === 'timeout'
            ? (messages.timeout ?? 'Consent timed out. Please try again.')
            : result.reason === 'cancelled'
              ? (messages.cancelled ?? 'Consent was cancelled.')
              : (messages.error ??
                ('message' in result ? result.message : 'Consent could not be completed.'));

      notifyError?.({ message: msg, duration: 5 });
    },
    [
      gate.ensure,
      messages.cancelled,
      messages.denied,
      messages.error,
      messages.timeout,
      notifyError,
    ]
  );

  return {
    ...gate,
    runWithConsent,
  };
}
