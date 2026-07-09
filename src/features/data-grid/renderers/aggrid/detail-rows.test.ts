import { describe, expect, it } from 'vitest';

import { detailRowId, interleaveDetailRows, isDetailRow } from './detail-rows';

type Row = { id: string; name: string };

const rows: Row[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const getRowId = (r: Row) => r.id;

describe('interleaveDetailRows', () => {
  it('returns the same reference when nothing is expanded', () => {
    expect(interleaveDetailRows(rows, [], getRowId)).toBe(rows);
  });

  it('inserts a synthetic detail row directly after each expanded row', () => {
    const out = interleaveDetailRows(rows, ['b'], getRowId);
    expect(out).toHaveLength(4);
    expect(out[0]).toBe(rows[0]);
    expect(out[1]).toBe(rows[1]);
    expect(isDetailRow(out[2])).toBe(true);
    expect(out[3]).toBe(rows[2]);
    const detail = out[2];
    if (isDetailRow<Row>(detail)) {
      expect(detail.forRow).toBe(rows[1]);
      expect(detail.forRowId).toBe('b');
    }
  });

  it('supports multiple expanded rows and ignores ids not on the page', () => {
    const out = interleaveDetailRows(rows, ['a', 'c', 'missing'], getRowId);
    expect(out).toHaveLength(5);
    expect(isDetailRow(out[1])).toBe(true);
    expect(isDetailRow(out[4])).toBe(true);
  });

  it('detail row ids are namespaced and stable', () => {
    expect(detailRowId('b')).toBe('data-grid-detail:b');
  });

  it('isDetailRow rejects plain rows and nullish values', () => {
    expect(isDetailRow(rows[0])).toBe(false);
    expect(isDetailRow(null)).toBe(false);
    expect(isDetailRow(undefined)).toBe(false);
  });
});
