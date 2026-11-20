// Retry server-side join refusals with jittered backoff so refused tabs don't all return at once.
// Never detach and re-attach: the server would replay the CLOSE onto the new join.
import { WebSocketStatus } from '@hocuspocus/provider';
import { useEffect } from 'react';

import { ProblemType } from '@/api/logbook/types';

import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import type { IRejoinProvider } from '@/features/logbook/types';

export const RetryableRefusal: ReadonlySet<string> = new Set([
  ProblemType.Overloaded,
  ProblemType.Unavailable,
  ProblemType.Internal,
]);

// Matches the server's 10 s shed hold; sooner is almost surely refused again.
const FIRST_MS = 10_000;
const MAX_MS = 30_000; // the provider's own reconnect cap
const MIN_MS = 5000;

// Full jitter under a doubling cap.
export const rejoinDelayMs = (attempt: number, random: () => number = Math.random): number =>
  Math.max(MIN_MS, random() * Math.min(MAX_MS, FIRST_MS * 2 ** attempt));

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
      // Socket down: its reopen re-joins by itself; sending now would join twice.
      if (provider.configuration.websocketProvider.status !== WebSocketStatus.Connected) return;
      void provider.sendToken().then(() => provider.startSync());
    }, wait);
  };
  const joined = (): void => {
    attempt = 0;
    notices.joined();
  };
  // Reopen re-joins by itself; a pending retry would join twice.
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
