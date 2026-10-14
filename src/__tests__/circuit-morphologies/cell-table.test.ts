// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { CellTable } from '@/features/circuit-viewer/morphologies/engine/cell-table';

const OWN = '#102030';
const texels = (table: CellTable) => table.texture.image.data as Uint8Array;
const texel = (table: CellTable, cell: number) => [
  ...texels(table).subarray(4 * cell, 4 * cell + 4),
];

describe('the cell table', () => {
  it('has a texel a cell in rows of 2,048, and a row at least', () => {
    const size = (cells: number) => {
      const { width, height } = new CellTable(cells).texture.image;
      return [width, height];
    };
    expect(size(0)).toEqual([2048, 1]);
    expect(size(2048)).toEqual([2048, 1]);
    expect(size(2049)).toEqual([2048, 2]);
    expect(texels(new CellTable(2049))).toHaveLength(4 * 2048 * 2);
  });

  it('holds sRGB colours, for the GPU to hand over linear', () => {
    expect(new CellTable(1).texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("paints each cell in its column's colour, in the view's own for null, and not at all for false", () => {
    const table = new CellTable(3);
    table.paint({ palette: ['#ff0000', null, false], columnByCell: Uint16Array.of(0, 1, 2) }, OWN);
    expect(texel(table, 0)).toEqual([255, 0, 0, 255]);
    expect(texel(table, 1)).toEqual([16, 32, 48, 255]);
    expect(texel(table, 2)[3]).toBe(0);
  });

  it("paints every cell in the view's own colour without colours", () => {
    const table = new CellTable(2);
    table.paint(null, OWN);
    expect(texel(table, 0)).toEqual([16, 32, 48, 255]);
    expect(texel(table, 1)).toEqual([16, 32, 48, 255]);
  });

  it("falls back on the view's own colour for a cell or a column that is not there, and for no colour at all", () => {
    const table = new CellTable(3);
    table.paint({ palette: ['not a colour'], columnByCell: Uint16Array.of(0, 7) }, OWN);
    for (const cell of [0, 1, 2]) expect(texel(table, cell)).toEqual([16, 32, 48, 255]);
  });

  it('shows a hidden cell again, and has the texture uploaded at every painting', () => {
    const table = new CellTable(1);
    const hidden = { palette: [false as const], columnByCell: Uint16Array.of(0) };
    table.paint(hidden, OWN);
    const version = table.texture.version;
    expect(texel(table, 0)[3]).toBe(0);
    table.paint({ palette: ['rgb(0, 128, 255)'], columnByCell: Uint16Array.of(0) }, OWN);
    expect(texel(table, 0)).toEqual([0, 128, 255, 255]);
    expect(table.texture.version).toBeGreaterThan(version);
  });

  it('has a byte of glow a cell beside the colours, laid out as they are, none, and uploaded', () => {
    const { image, format, colorSpace, version } = new CellTable(2049).glowTexture;
    expect([image.width, image.height]).toEqual([2048, 2]);
    expect(format).toBe(THREE.RedFormat);
    expect(colorSpace).toBe(THREE.NoColorSpace);
    expect((image.data as Uint8Array).every((byte) => byte === 0)).toBe(true);
    expect(version).toBeGreaterThan(0);
  });

  it('glows each cell as the somas view shapes it, and uploads that alone, where it changed', () => {
    const table = new CellTable(3);
    table.paint(null, OWN);
    const colours = table.texture.version;
    const glow = table.glowTexture.version;
    expect(table.glow(Float32Array.of(0, 0.5, 1), [1, 2])).toBe(true);
    // 0.5 to the power of 0.4.
    expect([...(table.glowTexture.image.data as Uint8Array).subarray(0, 3)]).toEqual([0, 193, 255]);
    expect(table.glowTexture.version).toBe(glow + 1);
    expect(table.texture.version).toBe(colours);

    expect(table.glow(Float32Array.of(0, 0.5, 1), [1, 2])).toBe(false);
    expect(table.glowTexture.version).toBe(glow + 1);
  });

  it('darkens the cells that glowed and glow no longer, and looks at no other', () => {
    const table = new CellTable(3);
    table.glow(Float32Array.of(1, 0.5, 0), [0, 1]);
    expect(table.glow(Float32Array.of(0, 0, 1), [2])).toBe(true);
    expect([...(table.glowTexture.image.data as Uint8Array).subarray(0, 3)]).toEqual([0, 0, 255]);
    // A cell that is not said to glow is taken for dark, whatever its number.
    expect(table.glow(Float32Array.of(1, 1, 1), [2])).toBe(false);
  });

  it('has two bytes of shade a cell, laid out as the colours are, every cell half crowded to begin with', () => {
    const { image, format, colorSpace, version } = new CellTable(2049).shadeTexture;
    expect([image.width, image.height]).toEqual([2048, 2]);
    expect(format).toBe(THREE.RGFormat);
    expect(colorSpace).toBe(THREE.NoColorSpace);
    const bytes = image.data as Uint8Array;
    expect([bytes[0], bytes[2 * 2048]]).toEqual([128, 128]);
    expect(version).toBeGreaterThan(0);
  });

  it('marks the cells with no colour of their own, which the somas draw along their ramp', () => {
    const table = new CellTable(5);
    table.paint(
      {
        palette: ['#ff0000', null, false, 'not a colour'],
        columnByCell: Uint16Array.of(0, 1, 2, 3),
      },
      OWN
    );
    const own = (cell: number) => (table.shadeTexture.image.data as Uint8Array)[2 * cell + 1];
    // The last cell has no column.
    expect([0, 1, 2, 3, 4].map(own)).toEqual([0, 255, 0, 255, 255]);
    table.paint(null, OWN);
    expect(own(0)).toBe(255);
  });

  it('uploads the shade again on a painting only where a cell gained or lost a colour of its own', () => {
    const table = new CellTable(2);
    table.paint({ palette: ['#ff0000', null], columnByCell: Uint16Array.of(0, 1) }, OWN);
    const version = table.shadeTexture.version;
    table.paint({ palette: ['#00ff00', null], columnByCell: Uint16Array.of(0, 1) }, OWN);
    expect(table.shadeTexture.version).toBe(version);
    table.paint(null, OWN);
    expect(table.shadeTexture.version).toBeGreaterThan(version);
  });

  it('takes how crowded each cell is, uploads it, and leaves the rest of the shade as it was', () => {
    const table = new CellTable(2);
    table.paint({ palette: ['#ff0000', null], columnByCell: Uint16Array.of(0, 1) }, OWN);
    const version = table.shadeTexture.version;
    table.setCrowding(Uint8Array.of(10, 250));
    expect([...(table.shadeTexture.image.data as Uint8Array).subarray(0, 4)]).toEqual([
      10, 0, 250, 255,
    ]);
    expect(table.shadeTexture.version).toBeGreaterThan(version);
    table.setCrowding(null);
    expect([...(table.shadeTexture.image.data as Uint8Array).subarray(0, 4)]).toEqual([
      128, 0, 128, 255,
    ]);
  });

  it('tells whether a cell is drawn, and whether a painting may have hidden any', () => {
    const table = new CellTable(2);
    expect(table.hides).toBe(false);
    table.paint({ palette: ['#ff0000', false], columnByCell: Uint16Array.of(0, 1) }, OWN);
    expect([table.shown(0), table.shown(1)]).toEqual([true, false]);
    expect(table.hides).toBe(true);
    table.paint(null, OWN);
    expect(table.hides).toBe(false);
  });

  it('frees its three textures', () => {
    const table = new CellTable(1);
    const freed: string[] = [];
    table.texture.addEventListener('dispose', () => freed.push('colours'));
    table.glowTexture.addEventListener('dispose', () => freed.push('glow'));
    table.shadeTexture.addEventListener('dispose', () => freed.push('shade'));
    table.dispose();
    expect(freed).toEqual(['colours', 'glow', 'shade']);
  });
});
