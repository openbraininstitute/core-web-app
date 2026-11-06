import { describe, expect, it } from 'vitest';

import { planColumnWidths } from '@/features/data-grid/renderers/aggrid/fit-columns';

const plan = (args: Partial<Parameters<typeof planColumnWidths>[0]>) =>
  Object.fromEntries(
    planColumnWidths({ columns: [], fixedWidth: 0, available: 1000, floor: 160, ...args })
  );

describe('planColumnWidths', () => {
  it('gives each column what its content needs, within its caps', () => {
    expect(
      plan({
        columns: [
          { id: 'type', natural: 120 },
          { id: 'name', natural: 600, maxWidth: 480 },
          { id: 'status', natural: 80, minWidth: 100 },
        ],
      })
    ).toEqual({ type: 120, name: 480, status: 100 });
  });

  it('takes an overrun out of the capped columns, widest first', () => {
    expect(
      plan({
        columns: [
          { id: 'type', natural: 200 },
          { id: 'name', natural: 400, maxWidth: 480 },
          { id: 'notes', natural: 300, maxWidth: 480 },
        ],
        fixedWidth: 200,
        available: 1000,
      })
    ).toEqual({ type: 200, name: 300, notes: 300 });
  });

  it('never shrinks a column past the floor, nor one without a cap', () => {
    expect(
      plan({
        columns: [
          { id: 'type', natural: 500 },
          { id: 'name', natural: 400, maxWidth: 480 },
        ],
        available: 600,
      })
    ).toEqual({ type: 500, name: 160 });
  });

  it('does not grow a short capped column up to the floor', () => {
    expect(plan({ columns: [{ id: 'name', natural: 90, maxWidth: 480 }], available: 50 })).toEqual({
      name: 90,
    });
  });
});
