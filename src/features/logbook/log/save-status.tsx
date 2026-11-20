// Offline after ~2 s down; a deploy blip (~1 s) just shows as Saving…
import { WebSocketStatus } from '@hocuspocus/provider';
import { isNil, isNotNil } from 'es-toolkit';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { timeOf } from '@/features/logbook/helpers';
import { useLivePage } from '@/features/logbook/log/context';
import { Icon } from '@/features/logbook/ui/icons';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';

export interface ISaveStatusProps {
  readonly notices: CollaborationNotices;
  readonly copy: LocalCopy;
  readonly iconOnly: boolean;
}

const OFFLINE_AFTER_MS = 2000;

const connected = (provider: HocuspocusProvider): boolean =>
  provider.configuration.websocketProvider.status === WebSocketStatus.Connected;

// Offline only after the socket has been down a while, so a quick reconnect shows nothing.
function useOffline(provider: HocuspocusProvider): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      provider.on('status', onChange);
      return () => provider.off('status', onChange);
    },
    [provider]
  );
  const online = useSyncExternalStore(subscribe, () => connected(provider));
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (online) return;
    const timer = setTimeout(() => setWaited(true), OFFLINE_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setWaited(false);
    };
  }, [online]);
  return !online && waited;
}

// One boolean, so a keystroke that changes nothing here renders nothing.
function useUnsent(provider: HocuspocusProvider, copy: LocalCopy): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      provider.on('unsyncedChanges', listener);
      provider.on('synced', listener);
      return () => {
        provider.off('unsyncedChanges', listener);
        provider.off('synced', listener);
      };
    },
    [provider]
  );
  return useSyncExternalStore(
    subscribe,
    () => provider.hasUnsyncedChanges || (copy.restored && !provider.isSynced)
  );
}

// Local changes only: other tabs and devices get their own `saved` notice, not this one.
// A sync after a reconnect covers the changes made before it: their `own` notice went to the old
// join and cannot come again, and the sync has put them on the server.
function useUnsaved(provider: HocuspocusProvider, notices: CollaborationNotices): boolean {
  const lastLocal = useRef<number | null>(null);
  const syncedAt = useRef<number | null>(null);
  const subscribe = useCallback(
    (listener: () => void) => {
      const onUpdate = (_u: Uint8Array, _o: unknown, _d: Y.Doc, tr: Y.Transaction): void => {
        if (!tr.local) return;
        lastLocal.current = Date.now();
        listener();
      };
      const onSynced = (): void => {
        syncedAt.current = Date.now();
        listener();
      };
      provider.document.on('update', onUpdate);
      provider.on('synced', onSynced);
      const stop = notices.subscribe(listener);
      return () => {
        provider.document.off('update', onUpdate);
        provider.off('synced', onSynced);
        stop();
      };
    },
    [provider, notices]
  );
  return useSyncExternalStore(subscribe, () => {
    const at = lastLocal.current;
    const covered = Math.max(notices.snapshot().savedAt ?? 0, syncedAt.current ?? 0);
    return isNotNil(at) && at > covered;
  });
}

// The server saves within a second and says so; past this wait the notice was lost or came first.
export const OTHERS_SAVE_WAIT_MS = 5000;

// Remote changes after first sync: someone else's text is still on its way to Postgres.
// Limit: `saved` has no clock, so Saved can show ~1 s early. Upgrade: a counter in `saved`.
function useOthersUnsaved(provider: HocuspocusProvider, notices: CollaborationNotices): boolean {
  const lastRemote = useRef<number | null>(null);
  const subscribe = useCallback(
    (listener: () => void) => {
      let giveUp: ReturnType<typeof setTimeout> | undefined;
      const onUpdate = (_u: Uint8Array, origin: unknown, _d: Y.Doc, tr: Y.Transaction): void => {
        if (tr.local || origin !== provider || !provider.isSynced) return;
        lastRemote.current = Date.now();
        clearTimeout(giveUp);
        giveUp = setTimeout(() => {
          lastRemote.current = null;
          listener();
        }, OTHERS_SAVE_WAIT_MS);
        listener();
      };
      provider.document.on('update', onUpdate);
      const stop = notices.subscribe(listener);
      return () => {
        clearTimeout(giveUp);
        provider.document.off('update', onUpdate);
        stop();
      };
    },
    [provider, notices]
  );
  return useSyncExternalStore(subscribe, () => {
    const at = lastRemote.current;
    const saved = notices.snapshot().pageSavedAt;
    return isNotNil(at) && (isNil(saved) || at > saved);
  });
}

export function SaveStatus({ notices, copy, iconOnly }: ISaveStatusProps) {
  const provider = useLivePage();
  const offline = useOffline(provider);
  const unsent = useUnsent(provider, copy);
  const unsaved = useUnsaved(provider, notices);
  const othersUnsaved = useOthersUnsaved(provider, notices);
  const savedAt = useSyncExternalStore(notices.subscribe, () => notices.snapshot().pageSavedAt);
  const saving = unsent || unsaved || othersUnsaved;
  const label = offline ? 'Offline' : saving ? 'Saving…' : 'Saved';
  const title = offline
    ? 'Your changes are kept on this device and sent when the connection is back.'
    : saving
      ? 'Storing the latest changes.'
      : `${isNil(savedAt) ? 'Saved' : `Saved at ${timeOf(savedAt)}`}. Every change is stored on the server within a second. Everyone here already sees it.`;
  return (
    <span
      className="inline-flex flex-none items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-neutral-4 data-[offline=true]:text-red"
      data-offline={offline}
      role="status"
      title={title}
    >
      {offline ? (
        <span className="size-2 rounded-full bg-red" aria-hidden="true" />
      ) : saving ? (
        <span
          className="size-3 animate-spin rounded-full border-[1.5px] border-neutral-2 border-t-blue motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <span className="flex text-saved-fg" aria-hidden="true">
          <Icon name="check" size={13} stroke={2.6} />
        </span>
      )}
      <span className={iconOnly || (!saving && !offline) ? 'sr-only' : undefined}>{label}</span>
    </span>
  );
}
