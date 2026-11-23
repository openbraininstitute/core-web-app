import { WebSocketStatus } from '@hocuspocus/provider';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as Y from 'yjs';

import { CollaborationNotice } from '@/api/logbook/types';
import { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import { OTHERS_SAVE_WAIT_MS } from '@/features/logbook/constants';
import { SaveStatus } from '@/features/logbook/log/save-status';

import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';

class FakeProvider {
  readonly document = new Y.Doc();
  isSynced = true;
  hasUnsyncedChanges = false;
  readonly configuration = { websocketProvider: { status: WebSocketStatus.Connected } };
  readonly #listeners = new Map<string, Set<() => void>>();
  on(event: string, listener: () => void): void {
    const set = this.#listeners.get(event) ?? new Set();
    this.#listeners.set(event, set.add(listener));
  }
  off(event: string, listener: () => void): void {
    this.#listeners.get(event)?.delete(listener);
  }
  emit(event: string): void {
    for (const listener of this.#listeners.get(event) ?? []) listener();
  }
}

const state = vi.hoisted(() => ({ provider: null as unknown }));
vi.mock('@hocuspocus/provider-react', () => ({ useHocuspocusProvider: () => state.provider }));

let provider: FakeProvider;
let notices: CollaborationNotices;
const copy = { restored: true } as LocalCopy;

const label = (): string | null => screen.getByRole('status').textContent;
const saved = (own: boolean): void =>
  act(() => void notices.receive(JSON.stringify({ type: CollaborationNotice.Saved, own })));
const typeHere = (text: string): void =>
  act(() => provider.document.transact(() => provider.document.getText('t').insert(0, text)));
const typeElsewhere = (text: string): void => {
  const elsewhere = new Y.Doc();
  elsewhere.getText('t').insert(0, text);
  act(() => Y.applyUpdate(provider.document, Y.encodeStateAsUpdate(elsewhere), provider));
};
const wait = (ms: number): void => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  provider = new FakeProvider();
  state.provider = provider;
  notices = new CollaborationNotices();
  render(<SaveStatus notices={notices} copy={copy} iconOnly={false} />);
});
afterEach(() => vi.useRealTimers());

test('my change shows Saving… until my own saved notice, not until someone else’s', () => {
  expect(label()).toBe('Saved');
  typeHere('mine');
  expect(label()).toBe('Saving…');
  wait(10);
  saved(false);
  expect(label()).toBe('Saving…');
  saved(true);
  expect(label()).toBe('Saved');
});

test('someone else’s change shows Saving… until the next saved notice', () => {
  typeElsewhere('theirs');
  expect(label()).toBe('Saving…');
  wait(10);
  saved(false);
  expect(label()).toBe('Saved');
});

test('a change that arrives after its saved notice stops spinning by itself', () => {
  saved(false);
  wait(10);
  typeElsewhere('late');
  expect(label()).toBe('Saving…');
  wait(OTHERS_SAVE_WAIT_MS - 1);
  expect(label()).toBe('Saving…');
  wait(1);
  expect(label()).toBe('Saved');
});

test('after a reconnect, a change sent before it shows Saved once the page has synced again', () => {
  typeHere('typed, then the socket dropped before the notice');
  expect(label()).toBe('Saving…');
  wait(10);
  provider.isSynced = false;
  act(() => provider.emit('unsyncedChanges'));
  expect(label()).toBe('Saving…');
  provider.isSynced = true;
  act(() => provider.emit('synced'));
  expect(label()).toBe('Saved');
});

test('a change typed after the sync still waits for its own saved notice', () => {
  act(() => provider.emit('synced'));
  wait(10);
  typeHere('mine');
  expect(label()).toBe('Saving…');
  wait(OTHERS_SAVE_WAIT_MS * 2);
  expect(label()).toBe('Saving…');
});
