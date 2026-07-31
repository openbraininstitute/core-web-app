import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import { formatScanValue, toScanCardData } from '../campaign-scan-cards';
import { aggregateCampaignStatus, getCampaignStatusBadgeSpec } from '../campaign-status-badge';

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
