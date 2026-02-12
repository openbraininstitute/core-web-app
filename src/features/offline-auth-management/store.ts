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
