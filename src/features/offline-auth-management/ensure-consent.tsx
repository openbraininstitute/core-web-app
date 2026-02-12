import { useCallback, useMemo, useRef, useState } from 'react';

import { requestOfflineTokenConsent } from '@/features/offline-auth-management/auth-manager-client';
import {
  publishOfflineTokenConsentEvent,
  readLastOfflineTokenConsentEvent,
  subscribeOfflineTokenConsentEvents,
} from '@/features/offline-auth-management/bus';
import {
  isOfflineTokenConsentStateFresh,
  readOfflineTokenConsentState,
  writeOfflineTokenConsentState,
} from '@/features/offline-auth-management/store';
import {
  OfflineTokenConsentEventSource,
  OfflineTokenConsentEventType,
} from '@/features/offline-auth-management/types';

import type { OfflineTokenConsentRequest } from '@/features/offline-auth-management/auth-manager-client';
import type { OfflineTokenConsentEvent } from '@/features/offline-auth-management/types';

function isOpenBrainInstituteHostname(hostname: string) {
  return hostname === 'openbraininstitute.org' || hostname.endsWith('.openbraininstitute.org');
}

/**
 * auth-manager may return a consent URL pointing at another environment hostname
 * (e.g. dev.openbraininstitute.org) which can trigger:
 * - unnecessary re-login
 * - shared-cookie session clobbering across subdomains
 * - redirect/callback landing on the wrong origin (breaking cross-tab signaling)
 */
function normalizeConsentUrl(rawUrl: string, currentOrigin: string) {
  try {
    const current = new URL(currentOrigin);
    const url = new URL(rawUrl);

    const shouldNormalizeHost =
      isOpenBrainInstituteHostname(current.hostname) &&
      isOpenBrainInstituteHostname(url.hostname) &&
      url.hostname !== current.hostname;

    if (shouldNormalizeHost) {
      url.protocol = current.protocol;
      url.host = current.host;
    }

    // Normalize embedded redirect URIs back to the current origin callback.
    const callbackUrl = new URL('/app/consent-feedback', current.origin).toString();

    const redirectUri = url.searchParams.get('redirect_uri');
    if (redirectUri) {
      try {
        const ru = new URL(redirectUri);
        const normalizeRedirect =
          isOpenBrainInstituteHostname(current.hostname) &&
          isOpenBrainInstituteHostname(ru.hostname) &&
          ru.origin !== current.origin;

        url.searchParams.set('redirect_uri', normalizeRedirect ? callbackUrl : redirectUri);
      } catch {
        // If redirect_uri isn't a valid URL, force our callback when normalizing host.
        if (shouldNormalizeHost) {
          url.searchParams.set('redirect_uri', callbackUrl);
        }
      }
    }

    const postLogoutRedirectUri = url.searchParams.get('post_logout_redirect_uri');
    if (postLogoutRedirectUri) {
      try {
        const plu = new URL(postLogoutRedirectUri);
        const normalizePostLogout =
          isOpenBrainInstituteHostname(current.hostname) &&
          isOpenBrainInstituteHostname(plu.hostname) &&
          plu.origin !== current.origin;
        url.searchParams.set(
          'post_logout_redirect_uri',
          normalizePostLogout ? callbackUrl : postLogoutRedirectUri
        );
      } catch {
        if (shouldNormalizeHost) {
          url.searchParams.set('post_logout_redirect_uri', callbackUrl);
        }
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

type EnsureOptions = {
  timeoutMs?: number;
  // max time we'll accept a previously-emitted event as relevant to this wait.
  // this prevents stale “granted” events from auto-unblocking a new flow.
  maxEventAgeMs?: number;
  // how many times to re-check auth-manager after a grant event.
  recheckAttempts?: number;
};

type EnsureResult =
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

async function waitForDecision({
  timeoutMs,
  maxEventAgeMs,
  minEventAt,
  signal,
}: {
  timeoutMs: number;
  maxEventAgeMs: number;
  minEventAt: number;
  signal: AbortSignal;
}): Promise<OfflineTokenConsentEvent> {
  // Fast-path: accept a very recent event (helps cross-tab “already granted just now”).
  const last = readLastOfflineTokenConsentEvent();
  if (last && last.at >= minEventAt && Date.now() - last.at < maxEventAgeMs) {
    return last;
  }

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
 * - if we have a fresh local state that says “granted”, we allow the task directly
 * - if not granted, we request a `consentUrl` from auth-manager, try to open it in a new tab,
 *   and we show a modal as a fallback (manual link)
 * - we wait for the consent callback page to emit an event (granted/denied) and then we return.
 *
 * @param options - Tuning options (timeouts, event age, etc).
 * @returns helpers for UI + the main `ensure()` function
 */
export function useEnsureOfflineTokenConsent(options?: EnsureOptions) {
  const opts = useMemo(
    () => ({
      timeoutMs: options?.timeoutMs ?? 2 * 60 * 1000,
      maxEventAgeMs: options?.maxEventAgeMs ?? 10 * 60 * 1000,
      recheckAttempts: options?.recheckAttempts ?? 5,
    }),
    [options?.maxEventAgeMs, options?.recheckAttempts, options?.timeoutMs]
  );

  const abortRef = useRef<AbortController | null>(null);
  const [modal, setModal] = useState<OfflineTokenConsentModalState>({ open: false });
  const consentPrefetchRef = useRef<{
    at: number;
    value: OfflineTokenConsentRequest;
  } | null>(null);
  const inflightConsentRequestRef = useRef<Promise<OfflineTokenConsentRequest> | null>(null);

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

  const fetchConsent = useCallback(async (options?: { force?: boolean }) => {
    const cached = consentPrefetchRef.current;
    if (!options?.force && cached && Date.now() - cached.at < PREFETCH_TTL_MS) {
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
  }, []);

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

    // abort any in-flight consent waits.
    abortRef.current?.abort('superseded');
    abortRef.current = new AbortController();

    // show the modal immediately so the user always has a fallback.
    setModal({ open: true, consentUrl: undefined });

    try {
      const cached = readOfflineTokenConsentState();
      if (isOfflineTokenConsentStateFresh(cached) && cached?.decision === 'granted') {
        setModal({ open: false, consentUrl: undefined });
        publishOfflineTokenConsentEvent({
          type: OfflineTokenConsentEventType.Granted,
          at: Date.now(),
          source: OfflineTokenConsentEventSource.Server,
        });
        return { ok: true };
      }

      // if we already prefetched before this click, we can open synchronously.
      const prefetched = consentPrefetchRef.current;

      const consentRes = prefetched?.value ?? (await fetchConsent());
      const consentUrl = consentRes.consentUrl
        ? normalizeConsentUrl(consentRes.consentUrl, window.location.origin)
        : undefined;
      const sessionStateId = consentRes.sessionStateId;

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

      // auto-open consent page as soon as we have the URL.
      // this may be blocked by some browsers if the URL wasn't prefetched before the click;
      // the modal remains as a deterministic fallback.
      openConsentLink(consentUrl);

      const decision = await waitForDecision({
        timeoutMs: opts.timeoutMs,
        maxEventAgeMs: opts.maxEventAgeMs,
        minEventAt: flowStartedAt,
        signal: abortRef.current.signal,
      });

      setModal({ open: false, consentUrl: undefined });

      if (decision.type === OfflineTokenConsentEventType.Denied) {
        const now = Date.now();
        writeOfflineTokenConsentState({
          decision: 'denied',
          updatedAt: now,
          sessionStateId: decision.sessionStateId,
          error: decision.error,
          description: decision.description,
        });
        return {
          ok: false,
          reason: 'denied',
          error: decision.error,
          description: decision.description,
        };
      }

      const now = Date.now();
      writeOfflineTokenConsentState({ decision: 'granted', updatedAt: now, sessionStateId });
      publishOfflineTokenConsentEvent({
        type: OfflineTokenConsentEventType.Granted,
        at: now,
        source: OfflineTokenConsentEventSource.Server,
        sessionStateId,
      });
      // ensure subsequent attempts don't reuse a stale consentUrl from prefetch.
      consentPrefetchRef.current = { at: now, value: { consentUrl: undefined, sessionStateId } };
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
  }, [opts.maxEventAgeMs, opts.timeoutMs, openConsentLink, fetchConsent]);

  return {
    modal,
    ensure,
    cancel,
    openConsentLink,
    prime,
  };
}
