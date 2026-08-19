import { beforeEach, describe, expect, it } from 'vitest';

import {
  isOfflineTokenConsentGrantedForSession,
  OFFLINE_TOKEN_CONSENT_TTL_MS,
  readOfflineTokenConsentState,
  writeOfflineTokenConsentState,
} from './store';

import type { OfflineTokenConsentState } from './types';

const SESSION = 'mMFQaLMROg0P37gICaF_PTdM';
const OTHER_SESSION = 'UVEcyuOGjWtZ4Xk2pQ1rLmNo';

function granted(overrides: Partial<OfflineTokenConsentState> = {}): OfflineTokenConsentState {
  return {
    decision: 'granted',
    updatedAt: Date.now(),
    sessionStateId: SESSION,
    ...overrides,
  };
}

describe('isOfflineTokenConsentGrantedForSession', () => {
  it('accepts a fresh grant made in the session we are in', () => {
    expect(isOfflineTokenConsentGrantedForSession(granted(), SESSION)).toBe(true);
  });

  it('rejects a grant made in a previous session', () => {
    // The offline token is stored per session, so carrying this grant over is what
    // made the launch fail with `token_not_found` while the client thought it was fine.
    expect(isOfflineTokenConsentGrantedForSession(granted(), OTHER_SESSION)).toBe(false);
  });

  it('rejects a grant that never recorded which session it belonged to', () => {
    expect(
      isOfflineTokenConsentGrantedForSession(granted({ sessionStateId: undefined }), SESSION)
    ).toBe(false);
  });

  it('rejects when the current session is unknown', () => {
    expect(isOfflineTokenConsentGrantedForSession(granted(), undefined)).toBe(false);
  });

  it('rejects a grant that has aged past the ttl', () => {
    const stale = granted({ updatedAt: Date.now() - OFFLINE_TOKEN_CONSENT_TTL_MS - 1 });
    expect(isOfflineTokenConsentGrantedForSession(stale, SESSION)).toBe(false);
  });

  it('rejects a denial from this session', () => {
    expect(isOfflineTokenConsentGrantedForSession(granted({ decision: 'denied' }), SESSION)).toBe(
      false
    );
  });

  it('rejects a missing state', () => {
    expect(isOfflineTokenConsentGrantedForSession(null, SESSION)).toBe(false);
  });
});

describe('offline token consent state round trip', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reads back a grant it wrote, and it counts for that session only', () => {
    writeOfflineTokenConsentState(granted());

    const state = readOfflineTokenConsentState();

    expect(state).toMatchObject({ decision: 'granted', sessionStateId: SESSION });
    expect(isOfflineTokenConsentGrantedForSession(state, SESSION)).toBe(true);
    expect(isOfflineTokenConsentGrantedForSession(state, OTHER_SESSION)).toBe(false);
  });

  it('treats unreadable storage as no state at all', () => {
    window.localStorage.setItem('auth.offline-token-consent.v1.state', '{not json');

    expect(readOfflineTokenConsentState()).toBeNull();
  });
});
