import type { OfflineTokenConsentEvent } from '@/features/offline-auth-management/types';

const CHANNEL_NAME = 'auth:offline-token-consent:v1';
const STORAGE_EVENT_KEY = 'auth.offline-token-consent.v1.last-event';

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function readLastOfflineTokenConsentEvent(): OfflineTokenConsentEvent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_EVENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineTokenConsentEvent;
  } catch {
    return null;
  }
}

export function publishOfflineTokenConsentEvent(event: OfflineTokenConsentEvent) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(event));
  } catch {}

  try {
    getChannel()?.postMessage(event);
  } catch {}
}

export function subscribeOfflineTokenConsentEvents(
  handler: (event: OfflineTokenConsentEvent) => void
) {
  if (typeof window === 'undefined') return () => {};

  const bc = getChannel();
  const onBroadcast = (msg: MessageEvent) => {
    const event = msg.data as OfflineTokenConsentEvent;
    if (!event || !event.type || !event.at) return;
    handler(event);
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_EVENT_KEY) return;
    if (!e.newValue) return;
    try {
      const event = JSON.parse(e.newValue) as OfflineTokenConsentEvent;
      if (!event || !event.type || !event.at) return;
      handler(event);
    } catch {
      // ignore
    }
  };

  bc?.addEventListener('message', onBroadcast);
  window.addEventListener('storage', onStorage);

  return () => {
    bc?.removeEventListener('message', onBroadcast);
    window.removeEventListener('storage', onStorage);
  };
}
