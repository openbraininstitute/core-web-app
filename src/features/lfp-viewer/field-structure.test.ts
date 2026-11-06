import { describe, expect, it } from 'vitest';

import {
  buildRows,
  coordinatesAlong,
  describeField,
  fieldDirection,
  fieldRows,
  openingOrder,
  tracedContacts,
  traceLabels,
  withoutShared,
} from './field-structure';
import { fieldValue } from './summary';

import type { LfpField } from './summary';

const BINS = 400;

function fieldOf(contacts: number, valueAt: (contact: number, bin: number) => number): LfpField {
  const data = new Int16Array(contacts * BINS);
  for (let c = 0; c < contacts; c++) {
    for (let b = 0; b < BINS; b++) data[c * BINS + b] = Math.round(valueAt(c, b) * 100);
  }
  return { contacts, bins: BINS, binMs: 1, start: 0, kind: 'value', data, scale: 0.01 };
}

const sine = (b: number) => Math.sin(b / 7);

/** A line of contacts along `axis`, 20 µm apart, off the origin. */
function lineAlong(axis: 0 | 1 | 2, contacts: number): Float32Array {
  const positions = new Float32Array(contacts * 3).fill(500);
  for (let c = 0; c < contacts; c++) positions[c * 3 + axis] = 100 + c * 20;
  return positions;
}

/** A cube of `side`³ contacts, 100 µm apart. */
function volumeOf(side: number): Float32Array {
  const positions: number[] = [];
  for (let x = 0; x < side; x++) {
    for (let y = 0; y < side; y++) {
      for (let z = 0; z < side; z++) positions.push(x * 100, y * 100, z * 100);
    }
  }
  return Float32Array.from(positions);
}

describe('describeField', () => {
  it('finds a signal every contact shares', () => {
    expect(describeField(fieldOf(8, (_, b) => 50 * sine(b))).sharedShare).toBeCloseTo(1, 3);
  });

  it('finds a dipole, which shares nothing, and its pattern across the contacts', () => {
    const { sharedShare, mode } = describeField(fieldOf(8, (c, b) => (c < 4 ? 50 : -50) * sine(b)));
    expect(sharedShare).toBeCloseTo(0, 3);
    for (let c = 0; c < 4; c++) {
      expect(Math.sign(mode[c])).toBe(-Math.sign(mode[c + 4]));
      expect(Math.abs(mode[c])).toBeCloseTo(Math.abs(mode[0]), 3);
    }
  });

  it('gives a mode whose sign does not depend on the field’s', () => {
    const up = describeField(fieldOf(8, (c, b) => (c - 3.5) * 10 * sine(b))).mode;
    const down = describeField(fieldOf(8, (c, b) => (3.5 - c) * 10 * sine(b))).mode;
    for (let c = 0; c < 8; c++) expect(down[c]).toBeCloseTo(up[c], 5);
  });

  it('counts a silent field as all shared, with no pattern to follow', () => {
    const { sharedShare, mode } = describeField(fieldOf(4, () => 0));
    expect(sharedShare).toBe(1);
    expect(mode).toHaveLength(4);
  });

  it('reads the midpoints of min/max bins', () => {
    const field: LfpField = {
      contacts: 2,
      bins: 2,
      binMs: 1,
      start: 0,
      kind: 'min_max',
      // Their swings differ; their midpoints, 0 then 1, do not.
      data: Int16Array.of(-10, 10, -9, 11, -2, 2, -1, 3),
      scale: 1,
    };
    expect(describeField(field).sharedShare).toBeCloseTo(1, 6);
  });
});

describe('fieldDirection', () => {
  it('finds the axis a gradient runs along, on a volume of contacts', () => {
    const positions: number[] = [];
    const mode: number[] = [];
    for (const x of [0, 100, 200]) {
      for (const y of [0, 100, 200]) {
        for (const z of [0, 100, 200]) {
          positions.push(x, y, z);
          mode.push(y - 100);
        }
      }
    }
    const direction = fieldDirection(Float32Array.from(mode), Float32Array.from(positions));
    expect(direction?.axis[0]).toBeCloseTo(0, 5);
    expect(direction?.axis[1]).toBeCloseTo(1, 5);
    expect(direction?.axis[2]).toBeCloseTo(0, 5);
  });

  it('stays on the line of an array that is a line', () => {
    const mode = Float32Array.from({ length: 16 }, (_, c) => c - 7.5);
    const direction = fieldDirection(mode, lineAlong(1, 16));
    expect(direction?.axis[0]).toBeCloseTo(0, 5);
    expect(direction?.axis[1]).toBeCloseTo(1, 5);
    expect(direction?.axis[2]).toBeCloseTo(0, 5);
  });

  it('points its largest component up, whichever way the weights run', () => {
    const mode = Float32Array.from({ length: 16 }, (_, c) => 7.5 - c);
    expect(fieldDirection(mode, lineAlong(1, 16))?.axis[1]).toBeCloseTo(1, 5);
  });

  it('says how much of the weights the line explains', () => {
    const mode = Float32Array.from({ length: 16 }, (_, c) => c - 7.5);
    expect(fieldDirection(mode, lineAlong(1, 16))?.explained).toBeCloseTo(1, 3);
  });

  it('gives none where the contacts share one place', () => {
    expect(fieldDirection(Float32Array.of(1, -1), new Float32Array(6).fill(5))).toBeNull();
  });

  it('gives none where the weights do not change with position', () => {
    expect(fieldDirection(new Float32Array(16), lineAlong(1, 16))).toBeNull();
  });

  it('gives none for a source in the middle of a line, which no straight line follows', () => {
    const mode = Float32Array.from({ length: 16 }, (_, c) => Math.abs(c - 7.5) - 4 + c * 1e-3);
    expect(fieldDirection(mode, lineAlong(1, 16))).toBeNull();
  });

  it('gives none for a pattern a straight line fits no better than chance', () => {
    const mode = Float32Array.from({ length: 27 }, (_, c) => (Math.sin(c * 12.9898) * 43758) % 1);
    expect(fieldDirection(mode, volumeOf(3))).toBeNull();
  });

  it('keeps a weak trend that many contacts show to be real', () => {
    const contacts = 512;
    const positions = volumeOf(8);
    const mode = Float32Array.from(
      { length: contacts },
      (_, c) => positions[c * 3 + 1] / 700 + ((Math.sin(c * 12.9898) * 43758) % 1)
    );
    expect(fieldDirection(mode, positions)?.axis[1]).toBeGreaterThan(0.9);
  });

  it('gives none for a field every contact shares, spread over a volume', () => {
    const { mode } = describeField(fieldOf(27, (_, b) => 50 * sine(b)));
    expect(mode.every((weight) => weight === 0)).toBe(true);
    expect(fieldDirection(mode, volumeOf(3))).toBeNull();
  });
});

describe('coordinatesAlong', () => {
  it('measures from the array’s centre', () => {
    expect(Array.from(coordinatesAlong(lineAlong(1, 3), [0, 1, 0]))).toEqual([-20, 0, 20]);
  });
});

describe('buildRows', () => {
  const noSwing = () => 0;

  it('keeps the contacts’ order without a coordinate', () => {
    const rows = buildRows(3, null, 'place', noSwing);
    expect(rows.map((r) => r.contacts)).toEqual([[0], [1], [2]]);
    expect(rows.map((r) => r.label)).toEqual(['e0', 'e1', 'e2']);
  });

  it('puts the highest coordinate on top', () => {
    const rows = buildRows(3, Float32Array.of(-20, 20, 0), 'microns', noSwing);
    expect(rows.map((r) => r.lead)).toEqual([1, 2, 0]);
  });

  it('bins a dense array into rows that leave no contact out and none empty', () => {
    const contacts = 683;
    const coordinate = Float32Array.from({ length: contacts }, (_, c) => c);
    const rows = buildRows(contacts, coordinate, 'microns', noSwing);
    expect(rows).toHaveLength(64);
    expect(rows.every((r) => r.contacts.length >= 10 && r.contacts.length <= 11)).toBe(true);
    expect(rows.flatMap((r) => r.contacts).sort((a, b) => a - b)).toEqual(
      Array.from({ length: contacts }, (_, c) => c)
    );
    expect(rows[0].contacts[0]).toBe(contacts - 1);
  });

  it.each([
    [64, 64],
    [65, 64],
    [1024, 64],
    [5000, 71],
  ])('gives %i contacts %i rows, with no drop past the first bins', (contacts, rows) => {
    expect(buildRows(contacts, null, 'place', noSwing)).toHaveLength(rows);
  });

  it('names rows by position, or by place where they have none, once they are bins', () => {
    const coordinate = Float32Array.from({ length: 100 }, (_, c) => c - 50);
    const rows = buildRows(100, coordinate, 'microns', noSwing);
    expect(rows[0].contacts).toHaveLength(1);
    expect(rows[0].label).toBe('+49 µm');
    expect(rows[63].contacts).toHaveLength(2);
    expect(rows[63].label).toBe('−50 µm');
    expect(buildRows(100, coordinate, 'place', noSwing)[0].label).toBe('#1');
  });

  it('leads a row with the contact the field swings most at', () => {
    const coordinate = Float32Array.from({ length: 100 }, (_, c) => c);
    const rows = buildRows(100, coordinate, 'microns', (c) => (c === 94 ? 9 : 1));
    expect(rows[3].contacts).toEqual([95, 94]);
    expect(rows[3].lead).toBe(94);
  });
});

describe('openingOrder', () => {
  const direction = (explained: number) => ({
    axis: [0, 1, 0] as [number, number, number],
    explained,
  });
  const structure = (contacts: number, weight = 1) => ({
    sharedShare: 0,
    mode: new Float32Array(contacts).fill(weight),
  });

  it('follows the field where a straight line explains most of it', () => {
    expect(openingOrder(structure(16), direction(0.91))).toBe('along');
    expect(openingOrder(structure(683), direction(0.5))).toBe('along');
  });

  it('groups similar contacts where many have only a weak line, or none', () => {
    expect(openingOrder(structure(683), direction(0.19))).toBe('similar');
    expect(openingOrder(structure(683), null)).toBe('similar');
  });

  it('keeps the contacts’ own order where they are few and no line explains them', () => {
    expect(openingOrder(structure(64), direction(0.3))).toBe('contacts');
    expect(openingOrder(structure(16), null)).toBe('contacts');
  });

  it('has nothing to group by where the field leaves no pattern', () => {
    expect(openingOrder(structure(683, 0), null)).toBe('contacts');
  });
});

describe('fieldRows', () => {
  const noSwing = () => 0;
  const structure = { sharedShare: 0, mode: Float32Array.of(-1, 1, 0) };
  const positions = lineAlong(1, 3);
  const ALONG_Y = { axis: [0, 1, 0] as [number, number, number], explained: 1 };
  const leads = (rows: { lead: number }[]) => rows.map((r) => r.lead);

  it('follows the direction, the weights or the contacts’ own order', () => {
    expect(leads(fieldRows('along', structure, positions, ALONG_Y, noSwing))).toEqual([2, 1, 0]);
    expect(leads(fieldRows('similar', structure, positions, ALONG_Y, noSwing))).toEqual([1, 2, 0]);
    expect(leads(fieldRows('contacts', structure, positions, ALONG_Y, noSwing))).toEqual([0, 1, 2]);
  });

  it('falls back on the contacts’ order without a direction to follow', () => {
    expect(leads(fieldRows('along', structure, positions, null, noSwing))).toEqual([0, 1, 2]);
  });
});

describe('tracedContacts', () => {
  const rows = (order: number[]) => order.map((c) => ({ contacts: [c], lead: c, label: `e${c}` }));

  it('keeps the rows’ order for ticked contacts', () => {
    expect(tracedContacts(rows([3, 1, 2, 0]), [0, 3])).toEqual([3, 0]);
  });

  it('traces every contact while none are ticked and they are few', () => {
    expect(tracedContacts(rows([3, 1, 2, 0]), [])).toEqual([3, 1, 2, 0]);
  });

  it('spreads the default traces over many, from the first row to the last', () => {
    const traced = tracedContacts(rows(Array.from({ length: 100 }, (_, c) => c)), []);
    expect(traced).toHaveLength(32);
    expect(traced[0]).toBe(0);
    expect(traced[31]).toBe(99);
  });
});

describe('traceLabels', () => {
  it('names each trace by where it lies along the field', () => {
    expect(traceLabels([2, 0], Float32Array.of(-40, 0, 40.4))).toEqual(['+40 µm', '−40 µm']);
  });

  it('names them by contact where two lie alike, or the field has no line', () => {
    expect(traceLabels([0, 1], Float32Array.of(10, 10))).toEqual(['e0', 'e1']);
    expect(traceLabels([3], null)).toEqual(['e3']);
  });
});

describe('withoutShared', () => {
  it('takes one value a bin off a field of means', () => {
    const removed = withoutShared({
      contacts: 2,
      bins: 2,
      binMs: 1,
      start: 0,
      kind: 'mean',
      scale: 1,
      data: Int16Array.from([300, 100, 100, 300]),
    });
    expect(removed.kind).toBe('mean');
    expect(fieldValue(removed, 0, 0) + fieldValue(removed, 1, 0)).toBeCloseTo(0);
    expect(fieldValue(removed, 0, 0)).toBeCloseTo(100, 3);
    expect(fieldValue(removed, 0, 1)).toBeCloseTo(-100, 3);
  });

  it('leaves nothing of a signal every contact shares', () => {
    const removed = withoutShared(fieldOf(4, (_, b) => 50 * sine(b)));
    expect(removed.data.every((v) => v === 0)).toBe(true);
  });

  it('leaves no rounding noise where the contacts do not divide evenly', () => {
    const removed = withoutShared(fieldOf(7, (_, b) => 50 * sine(b)));
    expect(removed.data.every((v) => v === 0)).toBe(true);
  });

  it('does not stretch differences of a stored step, which are rounding, to the full scale', () => {
    const field = fieldOf(2, (c, b) => 50 * sine(b) + (c === 0 && b % 2 === 0 ? 0.01 : 0));
    const removed = withoutShared(field);
    expect(removed.data.every((v) => v === 0)).toBe(true);
    expect(removed.scale).toBe(field.scale);
  });

  it('keeps what differs, at a scale of its own', () => {
    const removed = withoutShared(fieldOf(2, (c, b) => 3000 * sine(b) + (c === 0 ? 0.5 : -0.5)));
    const at = (c: number, b: number) => removed.data[c * BINS + b] * removed.scale;
    expect(removed.scale).toBeLessThan(0.01);
    for (const b of [0, 100, 399]) {
      expect(at(0, b)).toBeCloseTo(0.5, 2);
      expect(at(1, b)).toBeCloseTo(-0.5, 2);
    }
  });

  it('keeps min/max bins in order, and clears a spike every contact has', () => {
    const field: LfpField = {
      contacts: 2,
      bins: 1,
      binMs: 1,
      start: 0,
      kind: 'min_max',
      data: Int16Array.of(-100, 100, -100, 100),
      scale: 1,
    };
    expect(Array.from(withoutShared(field).data)).toEqual([0, 0, 0, 0]);
    const crossing: LfpField = { ...field, data: Int16Array.of(-1, 0, -9, 20) };
    const { data } = withoutShared(crossing);
    expect(data[0]).toBeLessThanOrEqual(data[1]);
    expect(data[2]).toBeLessThanOrEqual(data[3]);
  });
});
