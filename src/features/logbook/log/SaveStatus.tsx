// The save status, in the page's tab (EditorTabs), from the provider and the server:
// - Offline: the socket has not been connected for about 2 s (a deploy or a crash is a gap of
//   about 1 s, which shows as "Saving…"). The edits are kept on this device (local-copy.ts).
// - Saving…: changes the server has not acknowledged, a change of this tab after its last
//   `saved` notice, a change from someone else (another tab, a colleague, an agent) after the
//   page's last save, or text restored from this device that the provider has not synced yet.
// - Saved: a check; its title gives the time of the last `saved` notice.
// On a phone only the icon shows (the words stay for screen readers).
import { WebSocketStatus } from '@hocuspocus/provider';
import { useHocuspocusProvider } from '@hocuspocus/provider-react';
import { isNil, isNotNil } from 'es-toolkit';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

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

const timeOf = (at: number): string =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const connected = (provider: HocuspocusProvider): boolean =>
  provider.configuration.websocketProvider.status === WebSocketStatus.Connected;

// True once the socket has been down for OFFLINE_AFTER_MS; false as soon as it is back.
function useOffline(provider: HocuspocusProvider): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const update = (): void => {
      if (connected(provider)) {
        if (isNotNil(timer)) clearTimeout(timer);
        timer = null;
        setOffline(false);
      } else
        timer ??= setTimeout(() => {
          setOffline(true);
        }, OFFLINE_AFTER_MS);
    };
    update();
    provider.on('status', update);
    return () => {
      provider.off('status', update);
      if (isNotNil(timer)) clearTimeout(timer);
    };
  }, [provider]);
  return offline;
}

// Unacknowledged changes, or restored text not synced yet: one boolean, so a keystroke that
// changes nothing here renders nothing.
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

// A change of this tab newer than the last `saved` notice. Only local transactions count (the
// same test as local-copy.ts): another tab, device or agent of the same person gets its own
// `saved` notice, never this one, so counting its changes left this tab on "Saving…" for good.
// One boolean: a keystroke re-renders nothing unless it turns "saving" on.
function useUnsaved(provider: HocuspocusProvider, notices: CollaborationNotices): boolean {
  const lastLocal = useRef<number | null>(null);
  const subscribe = useCallback(
    (listener: () => void) => {
      const onUpdate = (_u: Uint8Array, _o: unknown, _d: Y.Doc, tr: Y.Transaction): void => {
        if (!tr.local) return;
        lastLocal.current = Date.now();
        listener();
      };
      provider.document.on('update', onUpdate);
      const stop = notices.subscribe(listener);
      return () => {
        provider.document.off('update', onUpdate);
        stop();
      };
    },
    [provider, notices]
  );
  return useSyncExternalStore(subscribe, () => {
    const at = lastLocal.current;
    const saved = notices.snapshot().savedAt;
    return isNotNil(at) && (isNil(saved) || at > saved);
  });
}

// A change from another connection newer than the page's last save: someone else's text is on its
// way to Postgres. The server sends `saved` to everyone on the page after each save (`own` false
// here). Only the provider's changes after its first sync count: the page's text as loaded on
// join (or on a rejoin) is already stored.
// Limit: the notice carries no clock, so a save that began just before such a change arrived
// can show "Saved" up to one flush early (STORE_FLUSH_INTERVAL_MS, 1 s). Upgrade: a change
// counter in `saved`.
function useOthersUnsaved(provider: HocuspocusProvider, notices: CollaborationNotices): boolean {
  const lastRemote = useRef<number | null>(null);
  const subscribe = useCallback(
    (listener: () => void) => {
      const onUpdate = (_u: Uint8Array, origin: unknown, _d: Y.Doc, tr: Y.Transaction): void => {
        if (tr.local || origin !== provider || !provider.isSynced) return;
        lastRemote.current = Date.now();
        listener();
      };
      provider.document.on('update', onUpdate);
      const stop = notices.subscribe(listener);
      return () => {
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
  const provider = useHocuspocusProvider();
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
