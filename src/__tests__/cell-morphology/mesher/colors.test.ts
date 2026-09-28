// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  type Palette,
  paintColors,
  typeBytes,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/colors';

const PALETTE: Palette = {
  soma: '#000',
  axon: '#00f',
  basalDendrite: '#f00',
  apicalDendrite: '#fff',
};
const rgb = (bytes: Uint8Array, i: number) => Array.from(bytes.subarray(3 * i, 3 * i + 3));

describe('neurite colours', () => {
  it('gives each SWC type its palette colour, and the other types colours of their own', () => {
    const table = typeBytes(PALETTE);
    expect(rgb(table, 1)).toEqual([0, 0, 0]);
    expect(rgb(table, 2)).toEqual([0, 0, 255]);
    expect(rgb(table, 3)).toEqual([255, 0, 0]);
    expect(rgb(table, 4)).toEqual([255, 255, 255]);
    expect(rgb(table, 7)).not.toEqual(rgb(table, 3));
  });

  it('keeps the bytes linear, as the vertex colours are', () => {
    // sRGB 0x44 is 5.8 % linear.
    expect(rgb(typeBytes({ ...PALETTE, soma: '#444' }), 1)).toEqual([15, 15, 15]);
  });

  it('paints items by type', () => {
    const out = new Uint8Array(9);
    paintColors(out, [3, 2, 1], typeBytes(PALETTE));
    expect(Array.from(out)).toEqual([255, 0, 0, 0, 0, 255, 0, 0, 0]);
  });

  it('paints items along the distance ramp: green at the soma, yellow half way, red at the farthest', () => {
    const out = new Uint8Array(12);
    paintColors(out, [1, 3, 3, 2], typeBytes(PALETTE), new Float32Array([0, 50, 100, 400]), 100);
    expect(rgb(out, 0)).toEqual([0, 255, 0]);
    expect(rgb(out, 1)).toEqual([255, 255, 0]);
    expect(rgb(out, 2)).toEqual([255, 0, 0]);
    // Past the end of the ramp stays at its end.
    expect(rgb(out, 3)).toEqual([255, 0, 0]);
  });

  it('falls back to the types when the distances belong to something else', () => {
    const out = new Uint8Array(6);
    paintColors(out, [3, 2], typeBytes(PALETTE), new Float32Array([1, 2, 3]), 10);
    expect(Array.from(out)).toEqual([255, 0, 0, 0, 0, 255]);
  });
});
