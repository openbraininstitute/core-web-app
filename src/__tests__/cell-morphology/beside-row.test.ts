import { afterEach, describe, expect, it } from 'vitest';

import { besideRow } from '@/features/entities/cell-morphology/morpho-viewer/help/beside-row';

const WIDTH = window.innerWidth;

function rect(left: number, top: number, right: number, bottom: number): DOMRect {
  return {
    left,
    top,
    right,
    bottom,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  } as DOMRect;
}

/** A 300 px card for a "?" 30 px into a row from `left` to `right`, in a window `windowWidth` wide. */
function place(windowWidth: number, left: number, right: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: windowWidth });
  const row = document.createElement('div');
  row.setAttribute('data-help-anchor', '');
  const button = document.createElement('button');
  row.append(button);
  row.getBoundingClientRect = () => rect(left, 100, right, 130);
  button.getBoundingClientRect = () => rect(left + 30, 108, left + 44, 122);
  return besideRow(button, 300);
}

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: WIDTH });
});

describe('besideRow', () => {
  it('puts the card right of the row, top to top, where the window has room', () => {
    expect(place(1400, 52, 308)).toEqual({ side: 'right', sideOffset: 222, alignOffset: -8 });
  });

  it('puts it left of the row where only that side has room', () => {
    expect(place(700, 400, 656)).toEqual({ side: 'left', sideOffset: 40, alignOffset: -8 });
  });

  it('drops it below the row where neither side has room', () => {
    expect(place(390, 52, 308)).toEqual({ side: 'bottom', sideOffset: 12, alignOffset: -30 });
  });
});
