import { expect, test } from 'vitest';

import { CollaborationNotices } from '@/features/logbook/collaboration/notices';

const writer = (clientIds: readonly unknown[], actor: unknown = {}) =>
  JSON.stringify({
    type: 'writer',
    clientIds,
    actor: { userId: 'u-bob', label: 'bob-claude', via: 'agent', ...Object(actor) },
  });

test('a writer notice names its clients, and renders nothing', () => {
  const Notices = new CollaborationNotices();
  let renders = 0;
  Notices.subscribe(() => {
    renders += 1;
  });
  expect(Notices.receive(writer([41, 42]))).not.toBeNull();
  expect(Notices.writerOf(41)).toEqual({ userId: 'u-bob', label: 'bob-claude', via: 'agent' });
  expect(Notices.writerOf(42)?.label).toBe('bob-claude');
  expect(Notices.writerOf(43)).toBeUndefined();
  expect(renders).toBe(0);
});

test('a malformed writer notice is dropped', () => {
  const Notices = new CollaborationNotices();
  expect(Notices.receive(writer(['41']))).toBeNull();
  expect(Notices.receive(writer([1.5]))).toBeNull();
  expect(Notices.receive(writer([7], { label: 3 }))).toBeNull();
  expect(Notices.writerOf(7)).toBeUndefined();
});

test('the oldest writers leave once 1000 are known', () => {
  const Notices = new CollaborationNotices();
  Notices.receive(writer([0]));
  Notices.receive(writer(Array.from({ length: 1000 }, (_, i) => i + 1)));
  expect(Notices.writerOf(0)).toBeUndefined();
  expect(Notices.writerOf(1)).toBeDefined();
  expect(Notices.writerOf(1000)).toBeDefined();
});

test('refused(at) sets rejoinAt and notifies; joined() clears it', () => {
  const Notices = new CollaborationNotices();
  expect(Notices.snapshot().rejoinAt).toBeNull();
  let renders = 0;
  Notices.subscribe(() => {
    renders += 1;
  });
  Notices.refused(1234);
  expect(Notices.snapshot().rejoinAt).toBe(1234);
  Notices.joined();
  expect(Notices.snapshot().rejoinAt).toBeNull();
  Notices.joined(); // nothing to clear: no render
  expect(renders).toBe(2);
});

test('saved: own moves both times, a save of others only the page time, no field counts as own', () => {
  const Notices = new CollaborationNotices();
  Notices.receive(JSON.stringify({ type: 'saved', own: false }), 1000);
  expect(Notices.snapshot()).toMatchObject({ savedAt: null, pageSavedAt: 1000 });
  Notices.receive(JSON.stringify({ type: 'saved', own: true }), 2000);
  expect(Notices.snapshot()).toMatchObject({ savedAt: 2000, pageSavedAt: 2000 });
  // Older servers sent `saved` with no field.
  Notices.receive(JSON.stringify({ type: 'saved' }), 3000);
  expect(Notices.snapshot()).toMatchObject({ savedAt: 3000, pageSavedAt: 3000 });
});
