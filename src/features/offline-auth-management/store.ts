import type { OfflineTokenConsentState } from './types';

const STORAGE_STATE_KEY = 'auth.offline-token-consent.v1.state';

export const OFFLINE_TOKEN_CONSENT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function readOfflineTokenConsentState(): OfflineTokenConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineTokenConsentState;
  } catch {
    return null;
  }
}

export function writeOfflineTokenConsentState(state: OfflineTokenConsentState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export function isOfflineTokenConsentStateFresh(
  state: OfflineTokenConsentState | null,
  ttlMs = OFFLINE_TOKEN_CONSENT_TTL_MS
) {
  if (!state) return false;
  return Date.now() - state.updatedAt < ttlMs;
}

/**
 * a grant only counts for the Keycloak session it was made in.
 *
 * auth-manager stores the offline token against the session's `session_state_id`, so a
 * grant carried over from a previous session passes a freshness check while the token
 * the launch needs does not exist — the job submission then fails server-side with
 * `token_not_found`. An unknown session id on either side counts as a miss, so the
 * consent flow runs again rather than being skipped on a guess.
 */
export function isOfflineTokenConsentGrantedForSession(
  state: OfflineTokenConsentState | null,
  sessionStateId: string | undefined,
  ttlMs = OFFLINE_TOKEN_CONSENT_TTL_MS
) {
  if (!isOfflineTokenConsentStateFresh(state, ttlMs)) return false;
  if (state?.decision !== 'granted') return false;
  return !!sessionStateId && state.sessionStateId === sessionStateId;
}
