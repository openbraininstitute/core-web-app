import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEnsureOfflineTokenConsent } from '@/features/offline-auth-management/ensure-consent';
import {
  readOfflineTokenConsentState,
  writeOfflineTokenConsentState,
} from '@/features/offline-auth-management/store';

import { installLocalStorage } from './install-local-storage';

import type { OfflineTokenConsentEvent } from '@/features/offline-auth-management/types';

const { requestOfflineTokenConsentMock } = vi.hoisted(() => ({
  requestOfflineTokenConsentMock: vi.fn(),
}));

vi.mock('@/features/offline-auth-management/auth-manager-client', () => ({
  requestOfflineTokenConsent: requestOfflineTokenConsentMock,
}));

const SESSION = 'mMFQaLMROg0P37gICaF_PTdM';
const OTHER_SESSION = 'UVEcyuOGjWtZ4Xk2pQ1rLmNo';
const CONSENT_URL = 'https://auth.example.test/consent?x=1';
const EVENT_KEY = 'auth.offline-token-consent.v1.last-event';

const openMock = vi.fn(() => ({}) as Window);

/** deliver a consent event the way another tab does: a same-origin storage event. */
function emitFromConsentTab(event: OfflineTokenConsentEvent) {
  window.dispatchEvent(
    new StorageEvent('storage', { key: EVENT_KEY, newValue: JSON.stringify(event) })
  );
}

/** let ensure()'s macrotask yield and the mocked auth-manager request settle. */
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}

beforeEach(() => {
  installLocalStorage();
  requestOfflineTokenConsentMock.mockReset();
  requestOfflineTokenConsentMock.mockResolvedValue({
    consentUrl: CONSENT_URL,
    sessionStateId: SESSION,
  });
  openMock.mockClear();
  vi.stubGlobal('open', openMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useEnsureOfflineTokenConsent — the cached grant is read against the live session', () => {
  it('asks auth-manager which session we are in before honouring a cached grant', async () => {
    // This is the regression the fix is about: reading the cache first is what let
    // yesterday's grant satisfy the gate while auth-manager held no token for today's
    // session. A short-circuit ahead of the request would leave this mock uncalled.
    writeOfflineTokenConsentState({
      decision: 'granted',
      updatedAt: Date.now(),
      sessionStateId: SESSION,
    });

    const { result } = renderHook(() => useEnsureOfflineTokenConsent({ useCache: true }));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.ensure();
    });

    expect(requestOfflineTokenConsentMock).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ ok: true });
    expect(openMock).not.toHaveBeenCalled();
  });

  it('runs the consent flow when the cached grant belongs to another session', async () => {
    writeOfflineTokenConsentState({
      decision: 'granted',
      updatedAt: Date.now(),
      sessionStateId: OTHER_SESSION,
    });

    const { result } = renderHook(() => useEnsureOfflineTokenConsent({ useCache: true }));

    let settled: unknown;
    act(() => {
      void result.current.ensure().then((r) => {
        settled = r;
      });
    });
    await settle();

    expect(openMock).toHaveBeenCalledWith(CONSENT_URL, '_blank', 'noopener,noreferrer');
    expect(settled).toBeUndefined();

    await act(async () => {
      emitFromConsentTab({
        type: 'granted',
        at: Date.now(),
        source: 'callback',
        sessionStateId: SESSION,
      });
    });
    await settle();

    expect(settled).toEqual({ ok: true });
    // the grant is re-stamped with the session the consent tab reported, so the next
    // launch in this session can reuse it.
    expect(readOfflineTokenConsentState()).toMatchObject({
      decision: 'granted',
      sessionStateId: SESSION,
    });
  });

  it('ignores a grant event emitted for a different session', async () => {
    const { result } = renderHook(() => useEnsureOfflineTokenConsent({ useCache: true }));

    let settled: unknown;
    act(() => {
      void result.current.ensure().then((r) => {
        settled = r;
      });
    });
    await settle();

    // a stale consent tab from an earlier session reloading and re-emitting its grant.
    await act(async () => {
      emitFromConsentTab({
        type: 'granted',
        at: Date.now(),
        source: 'callback',
        sessionStateId: OTHER_SESSION,
      });
    });
    await settle();

    expect(settled).toBeUndefined();

    await act(async () => {
      emitFromConsentTab({
        type: 'granted',
        at: Date.now(),
        source: 'callback',
        sessionStateId: SESSION,
      });
    });
    await settle();

    expect(settled).toEqual({ ok: true });
  });

  it('keeps the consent modal shut while it checks a grant it can reuse', async () => {
    // the modal says "consent required, a new tab should open" — wrong copy for a silent
    // revalidation, and it used to flash on every cached launch.
    writeOfflineTokenConsentState({
      decision: 'granted',
      updatedAt: Date.now(),
      sessionStateId: SESSION,
    });

    const { result } = renderHook(() => useEnsureOfflineTokenConsent({ useCache: true }));

    const seen: boolean[] = [];
    act(() => {
      void result.current.ensure();
    });
    seen.push(result.current.modal.open);
    await settle();
    seen.push(result.current.modal.open);

    expect(seen).toEqual([false, false]);
  });
});
