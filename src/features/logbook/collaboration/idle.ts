// Close the socket of a long-hidden tab so the server can unload the page; unsent edits wait first.
import { WebSocketStatus } from '@hocuspocus/provider';
import { isNil } from 'es-toolkit';
import { useEffect } from 'react';

import { settings } from '@/features/logbook/settings';

export const HIDDEN_PAUSE_MS = Number(settings.collaboration.hiddenPauseS) * 1000;

export interface IPausableSocket {
  readonly status: WebSocketStatus;
  connect(): Promise<unknown>;
  disconnect(): void;
}

export interface IPageVisibility {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

// Re-check unacked changes this often; the server acks within its 1 s save.
export const RECHECK_MS = 10_000;

// `afterMs` 0 never pauses.
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
    if (socket.status !== WebSocketStatus.Connected) void socket.connect();
  };
  page.addEventListener('visibilitychange', changed);
  changed(); // a tab opened in the background starts counting now
  return () => {
    clearTimeout(timer);
    page.removeEventListener('visibilitychange', changed);
  };
}

// A page left: calls `cool` after `afterMs`, once nothing is unsent.
export function coolWhenAcked(
  unsent: () => boolean,
  afterMs: number,
  cool: () => void
): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const check = (): void => {
    if (unsent()) timer = setTimeout(check, RECHECK_MS);
    else cool();
  };
  timer = setTimeout(check, afterMs);
  return () => clearTimeout(timer);
}

// `afterMs` null: the page is on screen and is kept.
export const useCoolWhenAcked = (
  unsent: () => boolean,
  afterMs: number | null,
  cool: () => void
): void =>
  useEffect(
    () => (isNil(afterMs) ? undefined : coolWhenAcked(unsent, afterMs, cool)),
    [unsent, afterMs, cool]
  );

export interface IPausableProvider {
  readonly hasUnsyncedChanges: boolean;
  readonly configuration: { readonly websocketProvider: IPausableSocket };
}

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
