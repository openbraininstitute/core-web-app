import { useCallback, useMemo, useRef, useState } from 'react';

import { requestOfflineTokenConsent } from '@/features/offline-auth-management/auth-manager-client';
import {
  publishOfflineTokenConsentEvent,
  subscribeOfflineTokenConsentEvents,
} from '@/features/offline-auth-management/bus';
import {
  isOfflineTokenConsentGrantedForSession,
  readOfflineTokenConsentState,
  writeOfflineTokenConsentState,
} from '@/features/offline-auth-management/store';
import {
  OfflineTokenConsentEventSource,
  OfflineTokenConsentEventType,
} from '@/features/offline-auth-management/types';

import type { OfflineTokenConsentRequest } from '@/features/offline-auth-management/auth-manager-client';
import type { OfflineTokenConsentEvent } from '@/features/offline-auth-management/types';

type EnsureOptions = {
  /**
   * reuse a grant recorded in localStorage, skipping the consent tab when it belongs to
   * the session we are in. auth-manager is still asked which session that is, so this
   * saves the round trip through the consent page rather than the request (defaults: false)
   */
  useCache?: boolean;
  timeoutMs?: number;
  // max time we'll accept a previously-emitted event as relevant to this wait.
  // this prevents stale “granted” events from auto-unblocking a new flow.
  maxEventAgeMs?: number;
};

export type EnsureResult =
  | { ok: true }
  | { ok: false; reason: 'denied'; error?: string; description?: string }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'timeout' }
  | { ok: false; reason: 'error'; message: string };

export type OfflineTokenConsentModalState = {
  open: boolean;
  consentUrl?: string;
};

const PREFETCH_TTL_MS = 30_000;
const INMEMORY_GRANT_TTL_MS = 10 * 60_000;

/**
 * whether a consent event answers the flow waiting on `flowSessionStateId`.
 *
 * an event carrying no session id is accepted: auth-manager does not always put
 * `session_state_id` on the callback redirect, and rejecting those would hang every flow
 * until it times out. a positive mismatch is a grant made in a different session — the
 * offline token it created is not the one this flow needs.
 */
function answersConsentSession(eventSessionStateId?: string, flowSessionStateId?: string) {
  if (!eventSessionStateId || !flowSessionStateId) return true;
  return eventSessionStateId === flowSessionStateId;
}

async function waitForDecision({
  timeoutMs,
  maxEventAgeMs,
  minEventAt,
  sessionStateId,
  signal,
}: {
  timeoutMs: number;
  maxEventAgeMs: number;
  minEventAt: number;
  sessionStateId?: string;
  signal: AbortSignal;
}): Promise<OfflineTokenConsentEvent> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(signal.reason ?? new Error('Aborted'));
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timeout'));
    }, timeoutMs);

    const unsubscribe = subscribeOfflineTokenConsentEvents((event) => {
      if (Date.now() - event.at > maxEventAgeMs) return;
      if (event.at < minEventAt) return;
      if (
        event.type !== OfflineTokenConsentEventType.Granted &&
        event.type !== OfflineTokenConsentEventType.Denied
      )
        return;
      if (!answersConsentSession(event.sessionStateId, sessionStateId)) return;
      cleanup();
      resolve(event);
    });

    function cleanup() {
      window.clearTimeout(timeout);
      unsubscribe();
      signal.removeEventListener('abort', onAbort);
    }

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * offline token consent gate
 *
 * use this when you need to make sure the user granted the “offline token” consent
 * before you start a task (extraction, simulation, ...)
 *
 * how it works:
 * - if we have a fresh local state that says “granted” *for the session we are in*, we
 *   allow the task directly — a grant from an earlier session does not count, because the
 *   offline token auth-manager hands the launch system is stored per session
 * - if not granted, we request a `consentUrl` from auth-manager, try to open it in a new tab,
 *   and we show a modal as a fallback (manual link)
 * - we wait for the consent callback page to emit an event (granted/denied) and then we return.
 *   an event naming a different session is ignored: it settles someone else's flow, not ours.
 *
 * @param options - Tuning options (timeouts, event age, etc).
 * @returns helpers for UI + the main `ensure()` function
 */
export function useEnsureOfflineTokenConsent(options?: EnsureOptions) {
  const opts = useMemo(
    () => ({
      useCache: options?.useCache ?? false,
      timeoutMs: options?.timeoutMs ?? 2 * 60 * 1000,
      maxEventAgeMs: options?.maxEventAgeMs ?? 10 * 60 * 1000,
    }),
    [options?.maxEventAgeMs, options?.timeoutMs, options?.useCache]
  );

  const abortRef = useRef<AbortController | null>(null);
  const [modal, setModal] = useState<OfflineTokenConsentModalState>({ open: false });
  const consentPrefetchRef = useRef<{
    at: number;
    value: OfflineTokenConsentRequest;
  } | null>(null);
  const inflightConsentRequestRef = useRef<Promise<OfflineTokenConsentRequest> | null>(null);
  const lastGrantAtRef = useRef<number>(0);

  const cancel = useCallback(() => {
    abortRef.current?.abort('cancelled');
    abortRef.current = null;
    setModal({ open: false, consentUrl: undefined });
  }, []);

  const openConsentLink = useCallback((consentUrl?: string) => {
    if (!consentUrl) return false;
    const w = window.open(consentUrl, '_blank', 'noopener,noreferrer');
    return !!w;
  }, []);

  const fetchConsent = useCallback(
    async (fetchOptions?: { force?: boolean; useCache?: boolean }) => {
      const useCache = fetchOptions?.useCache ?? false;
      const cached = consentPrefetchRef.current;
      if (useCache && !fetchOptions?.force && cached && Date.now() - cached.at < PREFETCH_TTL_MS) {
        return cached.value;
      }

      if (inflightConsentRequestRef.current) {
        return inflightConsentRequestRef.current;
      }

      inflightConsentRequestRef.current = (async () => {
        const value = await requestOfflineTokenConsent();
        consentPrefetchRef.current = { at: Date.now(), value };
        return value;
      })().finally(() => {
        inflightConsentRequestRef.current = null;
      });

      return inflightConsentRequestRef.current;
    },
    []
  );

  // prefetch so the consent tab can be opened synchronously on click.
  const prime = useCallback(() => {
    if (typeof window === 'undefined') return;
    void fetchConsent();
  }, [fetchConsent]);

  const ensure = useCallback(async (): Promise<EnsureResult> => {
    if (typeof window === 'undefined') {
      return {
        ok: false,
        reason: 'error',
        message: 'Consent can only be requested in the browser.',
      };
    }

    // not session-checked: knowing the current session costs a request to auth-manager,
    // which is the whole point of this short-lived in-memory window. a session only
    // rotates on a re-login, which unmounts this hook in the tab that did it.
    if (Date.now() - lastGrantAtRef.current < INMEMORY_GRANT_TTL_MS) {
      return { ok: true };
    }

    // abort any in-flight consent waits.
    abortRef.current?.abort('superseded');
    abortRef.current = new AbortController();

    try {
      // Only a prefetch from the last PREFETCH_TTL_MS is used: it carries the session id
      // the cached grant is checked against below, and an old one would answer for a
      // session we may no longer be in.
      const prefetched = consentPrefetchRef.current;
      const prefetchFresh = !!prefetched && Date.now() - prefetched.at < PREFETCH_TTL_MS;
      const hasUrl = prefetchFresh && !!prefetched?.value?.consentUrl;

      if (!hasUrl) {
        await new Promise<void>((r) => setTimeout(r, 0));
      }

      const consentRes =
        (prefetchFresh ? prefetched?.value : undefined) ??
        (await fetchConsent({ useCache: opts.useCache }));
      const consentUrl = consentRes.consentUrl;
      const sessionStateId = consentRes.sessionStateId;

      // The cached grant is only read once auth-manager has told us which session we are
      // in: it is keyed by session, so this has to come after the consent request rather
      // than short-circuiting ahead of it.
      if (opts.useCache) {
        const cached = readOfflineTokenConsentState();
        if (isOfflineTokenConsentGrantedForSession(cached, sessionStateId)) {
          setModal({ open: false, consentUrl: undefined });
          publishOfflineTokenConsentEvent({
            type: OfflineTokenConsentEventType.Granted,
            at: Date.now(),
            source: OfflineTokenConsentEventSource.Server,
            sessionStateId,
          });
          lastGrantAtRef.current = Date.now();
          return { ok: true };
        }
      }

      if (!consentUrl) {
        setModal({ open: false, consentUrl: undefined });
        return {
          ok: false,
          reason: 'error',
          message: 'Consent URL was not provided by auth-manager.',
        };
      }
      setModal({ open: true, consentUrl });

      const flowStartedAt = Date.now();

      openConsentLink(consentUrl);

      const decision = await waitForDecision({
        timeoutMs: opts.timeoutMs,
        maxEventAgeMs: opts.maxEventAgeMs,
        minEventAt: flowStartedAt,
        sessionStateId,
        signal: abortRef.current.signal,
      });

      setModal({ open: false, consentUrl: undefined });

      if (decision.type === OfflineTokenConsentEventType.Denied) {
        const now = Date.now();
        if (opts.useCache) {
          writeOfflineTokenConsentState({
            decision: 'denied',
            updatedAt: now,
            sessionStateId: decision.sessionStateId,
            error: decision.error,
            description: decision.description,
          });
        }
        return {
          ok: false,
          reason: 'denied',
          error: decision.error,
          description: decision.description,
        };
      }

      const now = Date.now();
      // the callback page reports the session Keycloak stored the token under; the id we
      // fetched before opening the consent page is a fallback for redirects that omit it.
      const grantedSessionStateId = decision.sessionStateId ?? sessionStateId;
      if (opts.useCache) {
        writeOfflineTokenConsentState({
          decision: 'granted',
          updatedAt: now,
          sessionStateId: grantedSessionStateId,
        });
        // the consent url is spent, so drop the prefetch instead of caching a url-less entry.
        consentPrefetchRef.current = null;
      }
      publishOfflineTokenConsentEvent({
        type: OfflineTokenConsentEventType.Granted,
        at: now,
        source: OfflineTokenConsentEventSource.Server,
        sessionStateId: grantedSessionStateId,
      });
      lastGrantAtRef.current = now;
      return { ok: true };
    } catch (err: any) {
      setModal({ open: false, consentUrl: undefined });

      if (err === 'cancelled' || err?.message === 'Aborted' || err?.toString?.() === 'cancelled') {
        return { ok: false, reason: 'cancelled' };
      }
      if (String(err?.message || err) === 'Timeout') {
        return { ok: false, reason: 'timeout' };
      }

      return {
        ok: false,
        reason: 'error',
        message: err?.message ?? 'Unexpected error while requesting consent.',
      };
    } finally {
      abortRef.current = null;
    }
  }, [opts.maxEventAgeMs, opts.timeoutMs, opts.useCache, openConsentLink, fetchConsent]);

  return {
    modal,
    ensure,
    cancel,
    openConsentLink,
    prime,
  };
}
