// A tab hidden for a while lets go of its collaboration socket, and takes it again when it is shown.
// Problem: the server keeps a page in memory while any socket is open on it (Hocuspocus unloads it
// at the last close). A tab left in the background all day holds its page all day: about
// 250 bytes per Yjs struct, up to tens of MB for a page edited a lot (measured, Metric.PageStructs).
// Solution: after VITE_COLLABORATION_HIDDEN_PAUSE_S hidden, the socket is closed on purpose. Shown again, it
// connects at once; Hocuspocus joins the page again and syncs only what changed (state vectors).
// - A visible tab is never paused, even when nobody types: someone may be watching an agent write.
// - A tab with changes the server has not acknowledged waits until it has them, then pauses.
//   Nothing is at risk meanwhile: the copy on this device keeps every edit (local-copy.ts).
// - A tab paused is not offline: SaveStatus counts 2 s before it says so, and the tab is hidden.
import { WebSocketStatus } from '@hocuspocus/provider';
import { useEffect } from 'react';

import { settings } from '@/features/logbook/settings';

// The pause of this build (VITE_COLLABORATION_HIDDEN_PAUSE_S), in ms.
export const HIDDEN_PAUSE_MS = Number(settings.collaboration.hiddenPauseS) * 1000;

// What pauseWhenHidden uses of a HocuspocusProviderWebsocket (a fake one in the tests).
export interface IPausableSocket {
  readonly status: WebSocketStatus;
  connect(): Promise<unknown>;
  disconnect(): void;
}

// What pauseWhenHidden uses of `document` (a fake one in the tests).
export interface IPageVisibility {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

// A pause that found unacknowledged changes looks again this much later. Short next to the pause
// itself: the server acknowledges a change within its 1 s save (STORE_FLUSH_INTERVAL_MS).
export const RECHECK_MS = 10_000;

// Watches the page's visibility and pauses the socket after `afterMs` hidden. Returns the
// unsubscribe function, which also cancels a pending pause. `afterMs` 0: never pauses.
export function pauseWhenHidden(
  socket: IPausableSocket,
  unsent: () => boolean,
  afterMs: number,
  page: IPageVisibility = document
): () => void {
  if (afterMs <= 0) return () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let paused = false;
  const pause = (): void => {
    timer = undefined;
    if (page.visibilityState !== 'hidden') return;
    if (unsent()) {
      timer = setTimeout(pause, RECHECK_MS);
      return;
    }
    paused = true;
    socket.disconnect();
  };
  const changed = (): void => {
    clearTimeout(timer);
    timer = undefined;
    if (page.visibilityState === 'hidden') {
      timer = setTimeout(pause, afterMs);
      return;
    }
    if (!paused) return;
    paused = false;
    // connect() also cancels the socket's own retry timer; a socket already up returns at once.
    if (socket.status !== WebSocketStatus.Connected) void socket.connect();
  };
  page.addEventListener('visibilitychange', changed);
  changed(); // a tab opened in the background starts counting now
  return () => {
    clearTimeout(timer);
    page.removeEventListener('visibilitychange', changed);
  };
}

// What usePauseWhenHidden reads of a HocuspocusProvider.
export interface IPausableProvider {
  readonly hasUnsyncedChanges: boolean;
  readonly configuration: { readonly websocketProvider: IPausableSocket };
}

// The hook form, for the page shown: one watcher per provider.
export const usePauseWhenHidden = (
  provider: IPausableProvider,
  afterMs: number = HIDDEN_PAUSE_MS
): void =>
  useEffect(
    () =>
      pauseWhenHidden(
        provider.configuration.websocketProvider,
        () => provider.hasUnsyncedChanges,
        afterMs
      ),
    [provider, afterMs]
  );
