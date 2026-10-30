import { describe, expect, it } from 'vitest';

import { SHUT_BAR_SIZE } from '@/features/circuit-viewer/pane-resize-handle';
import { columnsAt, columnsTemplate } from '@/features/scan-config/template/collapsing-columns';

const WIDTH = 1600;
const LEFT = WIDTH / 4;

describe('columnsAt', () => {
  it('drags no further right than the middle of the width, where the edge begins', () => {
    expect(columnsAt(WIDTH / 2, WIDTH, LEFT)).toEqual({ left: LEFT, middle: 400, shut: 'none' });
    expect(columnsAt(WIDTH * 0.9, WIDTH, LEFT)).toEqual({ left: LEFT, middle: 400, shut: 'none' });
  });

  it('narrows the middle column to its floor, then shuts it alone into the bar', () => {
    expect(columnsAt(LEFT + 300, WIDTH, LEFT)).toEqual({ left: LEFT, middle: 300, shut: 'none' });
    expect(columnsAt(LEFT + 200, WIDTH, LEFT)).toEqual({ left: LEFT, middle: 280, shut: 'none' });
    expect(columnsAt(LEFT + 100, WIDTH, LEFT)).toEqual({ left: LEFT, middle: 0, shut: 'middle' });
  });

  it('then narrows the left column to its floor, and shuts both into the bar', () => {
    expect(columnsAt(300, WIDTH, LEFT)).toEqual({
      left: 300 - SHUT_BAR_SIZE,
      middle: 0,
      shut: 'middle',
    });
    expect(columnsAt(SHUT_BAR_SIZE + 150, WIDTH, LEFT)).toEqual({
      left: 220,
      middle: 0,
      shut: 'middle',
    });
    expect(columnsAt(SHUT_BAR_SIZE + 100, WIDTH, LEFT)).toEqual({
      left: 0,
      middle: 0,
      shut: 'both',
    });
    expect(columnsAt(0, WIDTH, LEFT)).toEqual({ left: 0, middle: 0, shut: 'both' });
  });
});

describe('columnsTemplate', () => {
  it('gives the open columns their widths, the bar for those shut, and the preview the rest', () => {
    const bar = `${SHUT_BAR_SIZE}px`;
    expect(columnsTemplate({ left: 400, middle: 300, shut: 'none' })).toBe(
      '400px 300px minmax(0,1fr)'
    );
    expect(columnsTemplate({ left: 400, middle: 0, shut: 'middle' })).toBe(
      `400px ${bar} minmax(0,1fr)`
    );
    expect(columnsTemplate({ left: 0, middle: 0, shut: 'both' })).toBe(`${bar} minmax(0,1fr)`);
  });
});
