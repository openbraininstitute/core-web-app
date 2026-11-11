import { describe, expect, it } from 'vitest';

import {
  clampZoom,
  formatZoom,
  ZOOM_MAX,
  ZOOM_MIN,
} from '@/features/scan-config/components/zoom-slider/scale';

describe('zoom scale', () => {
  it('keeps a zoom inside the range the viewer allows', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(0)).toBe(ZOOM_MIN);
    expect(clampZoom(1000)).toBe(ZOOM_MAX);
  });

  it('falls back to the minimum for a value that is not a number', () => {
    // A camera that has not framed anything yet reports NaN; zooming to NaN blanks the canvas.
    expect(clampZoom(Number.NaN)).toBe(ZOOM_MIN);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(ZOOM_MIN);
  });

  it('reads a zoom the way the ruler labels it', () => {
    expect(formatZoom(0.25)).toBe('0.25x');
    expect(formatZoom(1)).toBe('1x');
    expect(formatZoom(2.44)).toBe('2.4x');
    expect(formatZoom(16)).toBe('16x');
    expect(formatZoom(99.6)).toBe('100x');
  });

  it('labels every power of two the ruler steps through', () => {
    // The ruler walks in quarter-doublings, so each labelled tick is a power of two.
    expect([0.25, 0.5, 1, 2, 4, 8, 16, 32, 64].map(formatZoom)).toEqual([
      '0.25x',
      '0.5x',
      '1x',
      '2x',
      '4x',
      '8x',
      '16x',
      '32x',
      '64x',
    ]);
  });
});
