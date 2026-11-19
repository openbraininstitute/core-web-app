// A page join the server refused for its own reason (overloaded while it sheds load, unavailable,
// internal) is tried again later, on the same provider and socket. Pattern: retry with
// exponential backoff and full jitter, so tabs refused together do not come back together (no
// reconnect storm). A refusal for the client's own reason (not-found, forbidden, unauthenticated)
// stays final: LogView shows it.
// - The server forgets a refused join, so a retry is a fresh first join (Hocuspocus
//   ClientConnection), and such refusals do not count toward closing the socket
//   (COLLABORATION_MAX_REFUSED_JOINS).
// - Never detach and attach again: detach sends a CLOSE, which the server would replay onto the
//   new join.
// - A socket that never joined a page is closed after COLLABORATION_IDLE_TIMEOUT_S (120 s); it then
//   reconnects with its own backoff, and its open re-authenticates every page by itself.
import { WebSocketStatus } from '@hocuspocus/provider';
import { useEffect } from 'react';

import { ProblemType } from '@/api/logbook/types';

import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';

// The refusals of the server's own that are worth trying again.
export const RetryableRefusal: ReadonlySet<string> = new Set([
  ProblemType.Overloaded,
  ProblemType.Unavailable,
  ProblemType.Internal,
]);

// The cap of the first wait; it doubles with each refusal in a row. Near the server's hold
// (COLLABORATION_SHED_HOLD_MS, 10 s by default, also its Retry-After): a retry sooner is almost surely
// refused again, and costs a JWT check and a request_log row on a task already short of capacity.
const FIRST_MS = 10_000;
const MAX_MS = 30_000; // the provider's own reconnect cap
const MIN_MS = 5000; // never sooner: half the server's default hold

// How long to wait before attempt `attempt` (0 for the first): full jitter under a doubling cap.
export const rejoinDelayMs = (attempt: number, random: () => number = Math.random): number =>
  Math.max(MIN_MS, random() * Math.min(MAX_MS, FIRST_MS * 2 ** attempt));

// What watchRefusals uses of a HocuspocusProvider (a fake one in the tests).
export interface IRejoinProvider {
  on(event: string, listener: (data: never) => void): unknown;
  off(event: string, listener: (data: never) => void): unknown;
  sendToken(): Promise<void>;
  startSync(): void;
  readonly configuration: { readonly websocketProvider: { readonly status: WebSocketStatus } };
}

// Watches one provider's refusals and joins again after each retryable one. Returns the
// unsubscribe function (it also cancels a pending retry).
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
      // Socket down: its open re-authenticates every attached provider by itself. Sending now
      // would queue a second join of the same page for that open.
      if (provider.configuration.websocketProvider.status !== WebSocketStatus.Connected) return;
      void provider.sendToken().then(() => provider.startSync());
    }, wait);
  };
  const joined = (): void => {
    attempt = 0;
    notices.joined();
  };
  // The socket opened again: its open re-authenticates; a pending retry would be a second join.
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

// The hook form, for the page shown: one watcher per provider.
export const useRejoin = (provider: IRejoinProvider, notices: CollaborationNotices): void =>
  useEffect(() => watchRefusals(provider, notices), [provider, notices]);
