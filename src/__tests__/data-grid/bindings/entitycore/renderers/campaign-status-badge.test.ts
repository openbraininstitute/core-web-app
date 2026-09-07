import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  formatScanValue,
  scanValueEntityId,
  toScanCardData,
} from '@/features/data-grid/bindings/entitycore/renderers/campaign-scan-cards';
import {
  aggregateCampaignStatus,
  describeCampaignStatusBreakdown,
  getCampaignStatusBadgeSpec,
  getCampaignStatusBreakdown,
  splitCampaignStatusSegments,
} from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-badge';

describe('getCampaignStatusBadgeSpec (status → badge colours)', () => {
  it('every status is a LIGHT bg + full-colour border/text/chip (Done-green template)', () => {
    const done = getCampaignStatusBadgeSpec(ActivityStatus.DONE);
    expect(done.tone).toBe('success');
    expect(done.label).toBe('Done');
    expect(done.bg).toContain('green-50');
    expect(done.border).toContain('green-500');
    expect(done.text).toContain('green-700');
    expect(done.chip).toContain('green-500');
    // ERROR is NOT a solid red fill — it follows the same light-bg shape
    const err = getCampaignStatusBadgeSpec(ActivityStatus.ERROR);
    expect(err.tone).toBe('destructive');
    expect(err.bg).toContain('red-50');
    expect(err.border).toContain('red-500');
    expect(err.text).toContain('red-700');
  });

  it('maps RUNNING / PENDING to their hues', () => {
    expect(getCampaignStatusBadgeSpec(ActivityStatus.RUNNING).label).toBe('Running');
    expect(getCampaignStatusBadgeSpec(ActivityStatus.RUNNING).bg).toContain('blue-50');
    expect(getCampaignStatusBadgeSpec(ActivityStatus.PENDING).label).toBe('Pending');
    expect(getCampaignStatusBadgeSpec(ActivityStatus.PENDING).bg).toContain('amber-50');
  });

  it('maps CREATED to "Generated"', () => {
    expect(getCampaignStatusBadgeSpec(ActivityStatus.CREATED).label).toBe('Generated');
  });

  it('keeps the two neutral statuses visually apart', () => {
    // the two neutrals appear unlabelled side by side in the counts pill
    const created = getCampaignStatusBadgeSpec(ActivityStatus.CREATED);
    const cancelled = getCampaignStatusBadgeSpec(ActivityStatus.CANCELLED);
    expect(created.chip).not.toBe(cancelled.chip);
    expect(created.text).not.toBe(cancelled.text);
    expect(cancelled.chip).toContain('zinc-600');
    expect(cancelled.text).toContain('zinc-700');
  });

  it('degrades unknown/undefined status to a neutral fallback', () => {
    const spec = getCampaignStatusBadgeSpec(undefined);
    expect(spec.tone).toBe('neutral');
    expect(spec.label).toBe('Unknown');
  });
});

describe('aggregateCampaignStatus (count map → headline status)', () => {
  const map = (entries: Array<[ActivityStatus, number]>) => new Map(entries);

  it('returns undefined for an empty campaign', () => {
    expect(aggregateCampaignStatus(map([]))).toBeUndefined();
    expect(aggregateCampaignStatus(undefined)).toBeUndefined();
  });

  it('prefers RUNNING over DONE while work is in flight', () => {
    expect(
      aggregateCampaignStatus(
        map([
          [ActivityStatus.DONE, 5],
          [ActivityStatus.RUNNING, 1],
        ])
      )
    ).toBe(ActivityStatus.RUNNING);
  });

  it('surfaces ERROR over DONE once no members are active', () => {
    expect(
      aggregateCampaignStatus(
        map([
          [ActivityStatus.DONE, 3],
          [ActivityStatus.ERROR, 1],
        ])
      )
    ).toBe(ActivityStatus.ERROR);
  });

  it('reports DONE only when every member is done', () => {
    expect(aggregateCampaignStatus(map([[ActivityStatus.DONE, 4]]))).toBe(ActivityStatus.DONE);
  });

  it('ignores zero-count buckets', () => {
    expect(
      aggregateCampaignStatus(
        map([
          [ActivityStatus.RUNNING, 0],
          [ActivityStatus.DONE, 2],
        ])
      )
    ).toBe(ActivityStatus.DONE);
  });
});

describe('getCampaignStatusBreakdown (count map → per-status buckets)', () => {
  const map = (entries: Array<[ActivityStatus, number]>) => new Map(entries);

  it('returns [] for an empty / missing campaign', () => {
    expect(getCampaignStatusBreakdown(map([]))).toEqual([]);
    expect(getCampaignStatusBreakdown(undefined)).toEqual([]);
  });

  it('keeps every non-empty bucket', () => {
    expect(
      getCampaignStatusBreakdown(
        map([
          [ActivityStatus.DONE, 2],
          [ActivityStatus.CREATED, 4],
        ])
      )
    ).toEqual([
      { status: ActivityStatus.CREATED, count: 4 },
      { status: ActivityStatus.DONE, count: 2 },
    ]);
  });

  it('orders buckets by lifecycle, not by map insertion', () => {
    const breakdown = getCampaignStatusBreakdown(
      map([
        [ActivityStatus.ERROR, 1],
        [ActivityStatus.DONE, 2],
        [ActivityStatus.RUNNING, 3],
        [ActivityStatus.CREATED, 4],
      ])
    );
    expect(breakdown.map((bucket) => bucket.status)).toEqual([
      ActivityStatus.CREATED,
      ActivityStatus.RUNNING,
      ActivityStatus.DONE,
      ActivityStatus.ERROR,
    ]);
  });

  it('drops zero-count buckets', () => {
    expect(
      getCampaignStatusBreakdown(
        map([
          [ActivityStatus.RUNNING, 0],
          [ActivityStatus.DONE, 6],
        ])
      )
    ).toEqual([{ status: ActivityStatus.DONE, count: 6 }]);
  });

  it('formats a breakdown as counted labels', () => {
    expect(
      describeCampaignStatusBreakdown([
        { status: ActivityStatus.CREATED, count: 4 },
        { status: ActivityStatus.DONE, count: 2 },
      ])
    ).toBe('4 Generated, 2 Done');
  });
});

describe('splitCampaignStatusSegments (keeping the pill inside its cell)', () => {
  const buckets = (entries: Array<[ActivityStatus, number]>) =>
    getCampaignStatusBreakdown(new Map(entries));

  it('draws every bucket when they fit', () => {
    const breakdown = buckets([
      [ActivityStatus.CREATED, 3],
      [ActivityStatus.RUNNING, 1],
      [ActivityStatus.DONE, 2],
      [ActivityStatus.ERROR, 1],
    ]);
    expect(splitCampaignStatusSegments(breakdown)).toEqual({ visible: breakdown, hidden: [] });
  });

  it('caps the pill at 3 buckets plus the overflow marker', () => {
    const breakdown = buckets([
      [ActivityStatus.CREATED, 2],
      [ActivityStatus.PENDING, 1],
      [ActivityStatus.RUNNING, 1],
      [ActivityStatus.DONE, 4],
      [ActivityStatus.ERROR, 1],
      [ActivityStatus.CANCELLED, 1],
    ]);
    const { visible, hidden } = splitCampaignStatusSegments(breakdown);
    expect(visible).toHaveLength(3);
    expect(visible.length + hidden.length).toBe(breakdown.length);
  });

  it('never hides a failure', () => {
    const { visible } = splitCampaignStatusSegments(
      buckets([
        [ActivityStatus.CREATED, 20],
        [ActivityStatus.PENDING, 15],
        [ActivityStatus.RUNNING, 12],
        [ActivityStatus.DONE, 40],
        [ActivityStatus.ERROR, 1],
      ])
    );
    expect(visible.map((bucket) => bucket.status)).toContain(ActivityStatus.ERROR);
  });

  it('fills remaining slots with the largest buckets', () => {
    const { visible, hidden } = splitCampaignStatusSegments(
      buckets([
        [ActivityStatus.CREATED, 2],
        [ActivityStatus.PENDING, 1],
        [ActivityStatus.RUNNING, 1],
        [ActivityStatus.DONE, 4],
        [ActivityStatus.ERROR, 1],
      ])
    );
    expect(visible.map((bucket) => bucket.status)).toEqual([
      ActivityStatus.CREATED,
      ActivityStatus.DONE,
      ActivityStatus.ERROR,
    ]);
    expect(hidden.map((bucket) => bucket.status)).toEqual([
      ActivityStatus.PENDING,
      ActivityStatus.RUNNING,
    ]);
  });

  it('keeps hidden buckets in the described breakdown', () => {
    const breakdown = buckets([
      [ActivityStatus.CREATED, 2],
      [ActivityStatus.PENDING, 1],
      [ActivityStatus.RUNNING, 1],
      [ActivityStatus.DONE, 4],
      [ActivityStatus.ERROR, 1],
    ]);
    expect(describeCampaignStatusBreakdown(breakdown)).toBe(
      '2 Generated, 1 Pending, 1 Running, 4 Done, 1 Error'
    );
  });
});

describe('formatScanValue', () => {
  it('formats primitives, nullish, arrays and objects', () => {
    expect(formatScanValue(42)).toBe('42');
    expect(formatScanValue(true)).toBe('true');
    expect(formatScanValue('seed')).toBe('seed');
    expect(formatScanValue(null)).toBe('—');
    expect(formatScanValue(undefined)).toBe('—');
    expect(formatScanValue([1, 2, 3])).toBe('1, 2, 3');
    expect(formatScanValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe('toScanCardData (records → cards)', () => {
  it('shapes simulation rows into card view-models', () => {
    const cards = toScanCardData([
      {
        id: 'sim-1',
        name: 'Sim One',
        status: ActivityStatus.DONE,
        scan_parameters: { 'initialize.random_seed': 7, amplitude: 0.5 },
      },
    ]);
    expect(cards).toHaveLength(1);
    const [card] = cards;
    expect(card.id).toBe('sim-1');
    expect(card.title).toBe('Sim One');
    expect(card.status).toBe(ActivityStatus.DONE);
    expect(card.params).toEqual([
      { name: 'initialize.random_seed', label: 'Random seed', value: '7' },
      { name: 'amplitude', label: 'Amplitude', value: '0.5' },
    ]);
  });

  it('falls back to id / positional title and empty params', () => {
    const cards = toScanCardData([{ id: 'only-id' }, {}]);
    expect(cards[0].title).toBe('only-id');
    expect(cards[0].params).toEqual([]);
    expect(cards[1].id).toBe('scan-1');
    expect(cards[1].title).toBe('Simulation 2');
  });

  it('returns [] for non-array / nullish payloads', () => {
    expect(toScanCardData(undefined)).toEqual([]);
    expect(toScanCardData(null)).toEqual([]);
    expect(toScanCardData('nope')).toEqual([]);
  });
});

describe('scanValueEntityId (entity references in scan parameters)', () => {
  const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('reads the id out of an obi-one FromID ref', () => {
    expect(scanValueEntityId({ type: 'EMCellMeshFromID', id_str: UUID })).toBe(UUID);
  });

  it('reads a bare { id_str } or { id }', () => {
    expect(scanValueEntityId({ id_str: UUID })).toBe(UUID);
    expect(scanValueEntityId({ id: UUID })).toBe(UUID);
  });

  it('is undefined for values that are not references', () => {
    expect(scanValueEntityId(42)).toBeUndefined();
    expect(scanValueEntityId(null)).toBeUndefined();
    expect(scanValueEntityId('plain string')).toBeUndefined();
    expect(scanValueEntityId([{ id: UUID }])).toBeUndefined();
    expect(scanValueEntityId({ type: 'Something', value: 3 })).toBeUndefined();
    expect(scanValueEntityId({ id: '  ' })).toBeUndefined();
  });
});

describe('formatScanValue with entity references', () => {
  const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('shows the id instead of the raw JSON', () => {
    expect(formatScanValue({ type: 'EMCellMeshFromID', id_str: UUID })).toBe(UUID);
  });

  it('still stringifies an object that carries no id', () => {
    expect(formatScanValue({ a: 1 })).toBe('{"a":1}');
  });

  it('marks a referencing parameter as copyable, and a plain one not', () => {
    const [card] = toScanCardData([
      {
        id: 'sim-1',
        name: 'Skeletonization 0',
        scan_parameters: {
          'initialize.cell_mesh': { type: 'EMCellMeshFromID', id_str: UUID },
          'initialize.random_seed': 7,
        },
      },
    ]);

    const byLabel = Object.fromEntries((card?.params ?? []).map((p) => [p.label, p]));
    expect(byLabel['Cell mesh']?.value).toBe(UUID);
    expect(byLabel['Cell mesh']?.entityId).toBe(UUID);
    expect(byLabel['Random seed']?.entityId).toBeUndefined();
  });
});
