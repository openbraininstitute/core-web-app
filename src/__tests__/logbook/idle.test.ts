import { WebSocketStatus } from '@hocuspocus/provider';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { coolWhenAcked, pauseWhenHidden } from '@/features/logbook/collaboration/idle';
import { RECHECK_MS } from '@/features/logbook/constants';

import type { IPausableSocket } from '@/features/logbook/types';

const MINUTE = 60_000;

class FakePage {
  visibilityState: DocumentVisibilityState = 'visible';
  #listeners = new Set<() => void>();
  addEventListener(_type: 'visibilitychange', listener: () => void): void {
    this.#listeners.add(listener);
  }
  removeEventListener(_type: 'visibilitychange', listener: () => void): void {
    this.#listeners.delete(listener);
  }
  show(state: DocumentVisibilityState): void {
    this.visibilityState = state;
    for (const listener of this.#listeners) listener();
  }
  get listeners(): number {
    return this.#listeners.size;
  }
}

class FakeSocket implements IPausableSocket {
  status: WebSocketStatus = WebSocketStatus.Connected;
  calls: string[] = [];
  connect(): Promise<void> {
    this.calls.push('connect');
    this.status = WebSocketStatus.Connected;
    return Promise.resolve();
  }
  disconnect(): void {
    this.calls.push('disconnect');
    this.status = WebSocketStatus.Disconnected;
  }
}

let page: FakePage;
let socket: FakeSocket;
let unsent = false;
beforeEach(() => {
  vi.useFakeTimers();
  page = new FakePage();
  socket = new FakeSocket();
  unsent = false;
});
afterEach(() => vi.useRealTimers());

test('a hidden tab lets go of its socket after the pause, and takes it again when shown', () => {
  pauseWhenHidden(socket, () => unsent, 5 * MINUTE, page);
  page.show('hidden');
  vi.advanceTimersByTime(5 * MINUTE - 1);
  expect(socket.calls).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(socket.calls).toEqual(['disconnect']);
  page.show('visible');
  expect(socket.calls).toEqual(['disconnect', 'connect']);
});

test('shown again before the pause: the socket is never touched', () => {
  pauseWhenHidden(socket, () => unsent, 5 * MINUTE, page);
  page.show('hidden');
  vi.advanceTimersByTime(4 * MINUTE);
  page.show('visible');
  vi.advanceTimersByTime(10 * MINUTE);
  expect(socket.calls).toEqual([]);
});

test('a visible tab is never paused, however long nobody types', () => {
  pauseWhenHidden(socket, () => unsent, 5 * MINUTE, page);
  vi.advanceTimersByTime(60 * MINUTE);
  expect(socket.calls).toEqual([]);
});

test('unacknowledged changes hold the pause until the server has them', () => {
  unsent = true;
  pauseWhenHidden(socket, () => unsent, 5 * MINUTE, page);
  page.show('hidden');
  vi.advanceTimersByTime(5 * MINUTE + RECHECK_MS);
  expect(socket.calls).toEqual([]);
  unsent = false;
  vi.advanceTimersByTime(RECHECK_MS);
  expect(socket.calls).toEqual(['disconnect']);
});

test('a tab opened in the background counts from the start; 0 never pauses; stop cancels', () => {
  page.visibilityState = 'hidden';
  const stop = pauseWhenHidden(socket, () => unsent, 5 * MINUTE, page);
  stop();
  vi.advanceTimersByTime(10 * MINUTE);
  expect(socket.calls).toEqual([]);
  expect(page.listeners).toBe(0);
  pauseWhenHidden(socket, () => unsent, 0, page);
  expect(page.listeners).toBe(0);
  pauseWhenHidden(socket, () => unsent, 5 * MINUTE, page);
  vi.advanceTimersByTime(5 * MINUTE);
  expect(socket.calls).toEqual(['disconnect']);
});

test('a page left lets go after its keep time, once', () => {
  const cool = vi.fn();
  coolWhenAcked(() => unsent, MINUTE, cool);
  vi.advanceTimersByTime(MINUTE - 1);
  expect(cool).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(cool).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(10 * MINUTE);
  expect(cool).toHaveBeenCalledTimes(1);
});

test('a page left with unacknowledged changes is held until the server has them', () => {
  const cool = vi.fn();
  unsent = true;
  coolWhenAcked(() => unsent, 0, cool);
  vi.advanceTimersByTime(RECHECK_MS);
  expect(cool).not.toHaveBeenCalled();
  unsent = false;
  vi.advanceTimersByTime(RECHECK_MS);
  expect(cool).toHaveBeenCalledTimes(1);
});

test('a page shown again before its keep time is not let go', () => {
  const cool = vi.fn();
  const stop = coolWhenAcked(() => unsent, MINUTE, cool);
  vi.advanceTimersByTime(MINUTE / 2);
  stop();
  vi.advanceTimersByTime(10 * MINUTE);
  expect(cool).not.toHaveBeenCalled();
});
