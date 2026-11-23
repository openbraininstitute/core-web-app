import { WebSocketStatus } from '@hocuspocus/provider';
import { useEffect } from 'react';

import { ProblemType } from '@/api/logbook/types';
import { REJOIN_FIRST_MS, REJOIN_MAX_MS, REJOIN_MIN_MS } from '@/features/logbook/constants';

import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import type { IRejoinProvider } from '@/features/logbook/types';

export const RetryableRefusal: ReadonlySet<string> = new Set([
  ProblemType.Overloaded,
  ProblemType.Unavailable,
  ProblemType.Internal,
]);

export const rejoinDelayMs = (attempt: number, random: () => number = Math.random): number =>
  Math.max(REJOIN_MIN_MS, random() * Math.min(REJOIN_MAX_MS, REJOIN_FIRST_MS * 2 ** attempt));

export function watchRefusals(
  provider: IRejoinProvider,
  notices: CollaborationNotices,
  random: () => number = Math.random,
  now: () => number = Date.now
): () => void {
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refused = ({ reason }: { reason: string }): void => {
    if (!RetryableRefusal.has(reason)) return;
    clearTimeout(timer);
    const wait = rejoinDelayMs(attempt, random);
    attempt += 1;
    notices.refused(now() + wait);
    timer = setTimeout(() => {
      if (provider.configuration.websocketProvider.status !== WebSocketStatus.Connected) return;
      void provider.sendToken().then(() => provider.startSync());
    }, wait);
  };
  const joined = (): void => {
    attempt = 0;
    notices.joined();
  };
  const reopened = (): void => clearTimeout(timer);
  provider.on('authenticationFailed', refused);
  provider.on('authenticated', joined);
  provider.on('open', reopened);
  return () => {
    clearTimeout(timer);
    provider.off('authenticationFailed', refused);
    provider.off('authenticated', joined);
    provider.off('open', reopened);
  };
}

export const useRejoin = (provider: IRejoinProvider, notices: CollaborationNotices): void =>
  useEffect(() => watchRefusals(provider, notices), [provider, notices]);
