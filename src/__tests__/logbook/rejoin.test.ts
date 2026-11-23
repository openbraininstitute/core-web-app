import { WebSocketStatus } from '@hocuspocus/provider';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { ProblemType } from '@/api/logbook/types';
import { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import { rejoinDelayMs, watchRefusals } from '@/features/logbook/collaboration/rejoin';

import type { IRejoinProvider } from '@/features/logbook/types';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('the wait: full jitter under a cap that doubles from 2 s to 30 s, never under 1 s', () => {
  expect(rejoinDelayMs(0, () => 1)).toBe(10_000);
  expect(rejoinDelayMs(1, () => 1)).toBe(20_000);
  expect(rejoinDelayMs(3, () => 1)).toBe(30_000);
  expect(rejoinDelayMs(10, () => 1)).toBe(30_000);
  expect(rejoinDelayMs(5, () => 0)).toBe(5000);
  for (let attempt = 0; attempt < 20; attempt++) {
    const wait = rejoinDelayMs(attempt);
    expect(wait).toBeGreaterThanOrEqual(5000);
    expect(wait).toBeLessThanOrEqual(30_000);
  }
});

function fakeProvider(status = WebSocketStatus.Connected) {
  const listeners = new Map<string, Set<(data: never) => void>>();
  const calls: string[] = [];
  const provider: IRejoinProvider & { status: WebSocketStatus } = {
    status,
    on: (event, listener) =>
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener)),
    off: (event, listener) => listeners.get(event)?.delete(listener),
    sendToken: () => {
      calls.push('sendToken');
      return Promise.resolve();
    },
    startSync: () => void calls.push('startSync'),
    get configuration() {
      return { websocketProvider: { status: provider.status } };
    },
  };
  const emit = (event: string, data: unknown = {}): void => {
    for (const listener of listeners.get(event) ?? []) listener(data as never);
  };
  return { provider, emit, calls, listeners };
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

test('an overloaded refusal joins again once, after the wait, and shows when', async () => {
  const { provider, emit, calls } = fakeProvider();
  const Notices = new CollaborationNotices();
  watchRefusals(
    provider,
    Notices,
    () => 1,
    () => 0
  );
  emit('authenticationFailed', { reason: ProblemType.Overloaded });
  expect(Notices.snapshot().rejoinAt).toBe(10_000);
  vi.advanceTimersByTime(9999);
  expect(calls).toEqual([]);
  vi.advanceTimersByTime(1);
  await settle();
  expect(calls).toEqual(['sendToken', 'startSync']);
  emit('authenticationFailed', { reason: ProblemType.Overloaded });
  expect(Notices.snapshot().rejoinAt).toBe(20_000);
  emit('authenticated', { scope: 'read-write' });
  expect(Notices.snapshot().rejoinAt).toBeNull();
  emit('authenticationFailed', { reason: ProblemType.Unavailable });
  expect(Notices.snapshot().rejoinAt).toBe(10_000);
});

test("a refusal for the client's own reason is not tried again", () => {
  const { provider, emit, calls } = fakeProvider();
  const Notices = new CollaborationNotices();
  watchRefusals(provider, Notices, () => 1);
  for (const reason of [ProblemType.Forbidden, ProblemType.NotFound, ProblemType.Unauthenticated])
    emit('authenticationFailed', { reason });
  vi.advanceTimersByTime(60_000);
  expect(calls).toEqual([]);
  expect(Notices.snapshot().rejoinAt).toBeNull();
});

test('the socket is down when the wait ends: nothing is sent, its open joins by itself', async () => {
  const { provider, emit, calls } = fakeProvider(WebSocketStatus.Disconnected);
  watchRefusals(provider, new CollaborationNotices(), () => 1);
  emit('authenticationFailed', { reason: ProblemType.Overloaded });
  vi.advanceTimersByTime(30_000);
  await settle();
  expect(calls).toEqual([]);
});

test('a socket that opens again cancels the wait; unsubscribing clears the timer and the listeners', async () => {
  const { provider, emit, calls, listeners } = fakeProvider();
  const stop = watchRefusals(provider, new CollaborationNotices(), () => 1);
  emit('authenticationFailed', { reason: ProblemType.Overloaded });
  emit('open');
  vi.advanceTimersByTime(30_000);
  await settle();
  expect(calls).toEqual([]);
  emit('authenticationFailed', { reason: ProblemType.Overloaded });
  stop();
  vi.advanceTimersByTime(30_000);
  await settle();
  expect(calls).toEqual([]);
  expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
});
