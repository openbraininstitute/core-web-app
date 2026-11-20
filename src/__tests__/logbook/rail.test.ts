import { expect, test } from 'vitest';

import {
  DEFAULT_ORDER,
  listParamsOf,
  logsOf,
  nextPageOf,
  noFilterOf,
} from '@/features/logbook/api/research-logs';
import { colourOf } from '@/features/logbook/blocks/colour';
import { membersOf } from '@/features/logbook/board/rail';
import { agoOf } from '@/features/logbook/helpers';
import { LogOrderField, OrderDirection } from '@/features/logbook/types';

import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';
import type { ILogOrder, IProject } from '@/features/logbook/types';

test('the log card says how long ago a log changed, then its date after a week', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  const at = (ms: number) => new Date(now - ms).toISOString();
  expect(agoOf(at(10_000), now)).toBe('just now');
  expect(agoOf(at(5 * 60_000), now)).toContain('5');
  expect(agoOf(at(3 * 3_600_000), now)).toContain('3');
  expect(agoOf(at(10 * 86_400_000), now)).toContain('2026');
  expect(agoOf(new Date(now + 60_000).toISOString(), now)).toBe('just now'); // a clock ahead
});

const log = (id: string, project: string, isPublic: boolean): IResearchLog => ({
  id,
  name: id,
  description: '',
  authorized_public: isPublic,
  authorized_project_id: project,
  creation_date: '2026-11-14T00:00:00Z',
  update_date: '2026-11-14T00:00:00Z',
  created_by: { pref_label: 'Alice' },
});

const PROJECT: IProject = { virtualLabId: 'lab', projectId: 'p1' };

const params = (filter: {
  public: boolean;
  project: boolean;
  search?: string;
  order?: ILogOrder;
}) => Object.fromEntries(listParamsOf(PROJECT, { search: '', order: DEFAULT_ORDER, ...filter }));

test('the scope filters and the search are EntityCore’s list filters, not the browser’s', () => {
  const order = { page_size: '10', order_by: '-update_date' };
  expect(params({ public: true, project: true })).toEqual(order);
  expect(params({ public: true, project: false })).toEqual({ ...order, authorized_public: 'true' });
  expect(params({ public: false, project: true })).toEqual({
    ...order,
    authorized_project_id: 'p1',
  });
  expect(params({ public: true, project: true, search: '  spike  ' })).toEqual({
    ...order,
    ilike_search: '*spike*',
  });
  expect(noFilterOf({ public: false, project: false, search: 'x', order: DEFAULT_ORDER })).toBe(
    true
  );
  const name = { field: LogOrderField.Name, direction: OrderDirection.Ascending };
  expect(params({ public: true, project: true, order: name }).order_by).toBe('name');
  const created = { field: LogOrderField.Created, direction: OrderDirection.Descending };
  expect(params({ public: true, project: true, order: created }).order_by).toBe('-creation_date');
});

const writer = (actorId: number, userId: string, label: string, via: string) => ({
  actorId,
  userId,
  label,
  via,
  lastAt: '2026-11-14T00:00:00Z',
});

test('members: each in the colour of their user id; the creator is not shown twice', () => {
  const created = {
    ...log('l1', 'p1', false),
    created_by: { pref_label: 'Alice Admin', sub_id: 'u-alice' },
  };
  const members = membersOf(created, [
    writer(1, 'u-alice', 'alice', 'ui'), // the creator writing: same person
    writer(2, 'u-alice', 'alice-claude', 'agent'), // her agent: its own avatar
    writer(3, 'u-bob', 'bob', 'ui'),
  ]);
  expect(members.map((m) => [m.name, m.colour])).toEqual([
    ['Alice Admin', colourOf('u-alice')],
    ['alice-claude', colourOf('u-alice')],
    ['bob', colourOf('u-bob')],
  ]);
});

const page = (n: number, total: number, ids: string[]) => ({
  data: ids.map((i) => log(i, 'p1', false)),
  pagination: { page: n, page_size: 10, total_items: total },
});

test('pages of 10: the next page until the total is read, a log shifted into two pages once', () => {
  expect(nextPageOf(page(1, 25, []))).toBe(2);
  expect(nextPageOf(page(2, 25, []))).toBe(3);
  expect(nextPageOf(page(3, 25, []))).toBeUndefined();
  expect(nextPageOf(page(1, 10, []))).toBeUndefined();
  expect(nextPageOf(page(1, 0, []))).toBeUndefined();
  expect(logsOf([page(1, 12, ['a', 'b']), page(2, 12, ['b', 'c'])]).map((l) => l.id)).toEqual([
    'a',
    'b',
    'c',
  ]);
});
