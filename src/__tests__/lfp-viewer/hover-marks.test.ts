import { describe, expect, it } from 'vitest';

import { laneOffView, mapRowBand } from '@/features/lfp-viewer/field-plot';

describe('laneOffView', () => {
  // Lanes of 10 px in a view of 100 px, scrolled 50 px down
  it('is above where the lane ends before the view starts, below where it starts after it ends', () => {
    expect(laneOffView(4, 10, 50, 100)).toBe('above');
    expect(laneOffView(15, 10, 50, 100)).toBe('below');
  });

  it('is below for a contact that is not traced', () => {
    expect(laneOffView(-1, 10, 0, 100)).toBe('below');
  });

  it('is in view where any of it shows', () => {
    expect(laneOffView(5, 10, 50, 100)).toBeNull();
    expect(laneOffView(14, 10, 50, 100)).toBeNull();
    expect(laneOffView(4, 10, 45, 100)).toBeNull();
  });
});

describe('mapRowBand', () => {
  it("is the row's own band where it is high enough", () => {
    expect(mapRowBand(2, 10, 6, 200, 4)).toEqual({ top: 46, height: 20 });
  });

  it('grows a thin row about its middle', () => {
    // 216 rows in 216 px: row 100 is 1 px at 106, grown to 4 px about 106.5
    expect(mapRowBand(100, 216, 6, 216, 4)).toEqual({ top: 104.5, height: 4 });
  });

  it('stays in the plot at its first and last rows', () => {
    expect(mapRowBand(0, 216, 6, 216, 4).top).toBe(6);
    const last = mapRowBand(215, 216, 6, 216, 4);
    expect(last.top + last.height).toBe(222);
  });
});
