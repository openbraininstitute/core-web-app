import { WebSocketStatus } from '@hocuspocus/provider';
import { isNil, isNotNil } from 'es-toolkit';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { match } from 'ts-pattern';

import { OFFLINE_AFTER_MS, OTHERS_SAVE_WAIT_MS } from '@/features/logbook/constants';
import { timeOf } from '@/features/logbook/helpers';
import { useLivePage } from '@/features/logbook/log/context';
import { Icon } from '@/ui/molecules/icon';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import type { ISaveStatusProps } from '@/features/logbook/types';

const connected = (provider: HocuspocusProvider): boolean =>
  provider.configuration.websocketProvider.status === WebSocketStatus.Connected;

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
  const state = { offline, saving };
  const label = match(state)
    .with({ offline: true }, () => 'Offline')
    .with({ saving: true }, () => 'Saving…')
    .otherwise(() => 'Saved');
  const title = match(state)
    .with(
      { offline: true },
      () => 'Your changes are kept on this device and sent when the connection is back.'
    )
    .with({ saving: true }, () => 'Storing the latest changes.')
    .otherwise(
      () =>
        `${isNil(savedAt) ? 'Saved' : `Saved at ${timeOf(savedAt)}`}. Every change is stored on the server within a second. Everyone here already sees it.`
    );
  return (
    <span
      className="inline-flex flex-none items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-neutral-4 data-[offline=true]:text-destructive"
      data-offline={offline}
      role="status"
      title={title}
    >
      {match(state)
        .with({ offline: true }, () => (
          <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
        ))
        .with({ saving: true }, () => (
          <span
            className="size-3 animate-spin rounded-full border-[1.5px] border-neutral-2 border-t-blue motion-reduce:animate-none"
            aria-hidden="true"
          />
        ))
        .otherwise(() => (
          <span className="flex text-saved-fg" aria-hidden="true">
            <Icon name="check" size={13} stroke={2.6} />
          </span>
        ))}
      <span className={iconOnly || (!saving && !offline) ? 'sr-only' : undefined}>{label}</span>
    </span>
  );
}
