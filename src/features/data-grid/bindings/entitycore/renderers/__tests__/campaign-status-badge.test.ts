import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import { formatScanValue, toScanCardData } from '../campaign-scan-cards';
import { aggregateCampaignStatus, getCampaignStatusBadgeSpec } from '../campaign-status-badge';

describe('getCampaignStatusBadgeSpec (status → badge variant)', () => {
  it('maps DONE to a success/outline green badge', () => {
    const spec = getCampaignStatusBadgeSpec(ActivityStatus.DONE);
    expect(spec.tone).toBe('success');
    expect(spec.variant).toBe('outline');
    expect(spec.label).toBe('Done');
    expect(spec.className).toContain('green');
  });

  it('maps ERROR to the destructive variant', () => {
    const spec = getCampaignStatusBadgeSpec(ActivityStatus.ERROR);
    expect(spec.tone).toBe('destructive');
    expect(spec.variant).toBe('destructive');
    expect(spec.label).toBe('Error');
  });

  it('maps RUNNING to the primary/default variant', () => {
    const spec = getCampaignStatusBadgeSpec(ActivityStatus.RUNNING);
    expect(spec.tone).toBe('primary');
    expect(spec.variant).toBe('default');
    expect(spec.label).toBe('Running');
  });

  it('maps PENDING to a neutral outline badge', () => {
    const spec = getCampaignStatusBadgeSpec(ActivityStatus.PENDING);
    expect(spec.tone).toBe('neutral');
    expect(spec.variant).toBe('outline');
    expect(spec.label).toBe('Pending');
  });

  it('maps CANCELLED / CREATED to neutral outline badges', () => {
    expect(getCampaignStatusBadgeSpec(ActivityStatus.CANCELLED).variant).toBe('outline');
    expect(getCampaignStatusBadgeSpec(ActivityStatus.CREATED).label).toBe('Generated');
  });

  it('degrades unknown/undefined status to a neutral fallback', () => {
    const spec = getCampaignStatusBadgeSpec(undefined);
    expect(spec.tone).toBe('neutral');
    expect(spec.variant).toBe('outline');
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
