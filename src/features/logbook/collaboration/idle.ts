import { WebSocketStatus } from '@hocuspocus/provider';
import { isNil } from 'es-toolkit';
import { useEffect } from 'react';

import { HIDDEN_PAUSE_MS, RECHECK_MS } from '@/features/logbook/constants';

import type { IPageVisibility, IPausableProvider, IPausableSocket } from '@/features/logbook/types';

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
  changed();
  return () => {
    clearTimeout(timer);
    page.removeEventListener('visibilitychange', changed);
  };
}

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

export const useCoolWhenAcked = (
  unsent: () => boolean,
  afterMs: number | null,
  cool: () => void
): void =>
  useEffect(
    () => (isNil(afterMs) ? undefined : coolWhenAcked(unsent, afterMs, cool)),
    [unsent, afterMs, cool]
  );

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
