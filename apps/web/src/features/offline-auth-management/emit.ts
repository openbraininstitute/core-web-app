import { publishOfflineTokenConsentEvent } from '@/features/offline-auth-management/bus';
import { writeOfflineTokenConsentState } from '@/features/offline-auth-management/store';
import {
  OfflineTokenConsentEventSource,
  OfflineTokenConsentEventType,
} from '@/features/offline-auth-management/types';

export function emitOfflineTokenConsentGranted(sessionStateId?: string) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  writeOfflineTokenConsentState({
    decision: 'granted',
    updatedAt: now,
    sessionStateId,
  });
  publishOfflineTokenConsentEvent({
    type: OfflineTokenConsentEventType.Granted,
    at: now,
    source: OfflineTokenConsentEventSource.Callback,
    sessionStateId,
  });

  // backward compatibility: some flows may still wait for an opener postMessage.
  // use explicit origin (no wildcard).
  try {
    window.opener?.postMessage({ messageType: 'consent_granted' }, window.location.origin);
  } catch {}
}

export function emitOfflineTokenConsentDenied(params?: {
  sessionStateId?: string;
  error?: string | null;
  description?: string | null;
}) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  writeOfflineTokenConsentState({
    decision: 'denied',
    updatedAt: now,
    sessionStateId: params?.sessionStateId,
    error: params?.error ?? undefined,
    description: params?.description ?? undefined,
  });
  publishOfflineTokenConsentEvent({
    type: OfflineTokenConsentEventType.Denied,
    at: now,
    source: OfflineTokenConsentEventSource.Callback,
    sessionStateId: params?.sessionStateId,
    error: params?.error ?? undefined,
    description: params?.description ?? undefined,
  });
}
