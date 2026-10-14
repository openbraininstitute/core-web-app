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
    expect(table.glow(Float32Array.of(0, 0.5, 1))).toBe(true);
    // 0.5 to the power of 0.4.
    expect([...(table.glowTexture.image.data as Uint8Array).subarray(0, 3)]).toEqual([0, 193, 255]);
    expect(table.glowTexture.version).toBe(glow + 1);
    expect(table.texture.version).toBe(colours);

    expect(table.glow(Float32Array.of(0, 0.5, 1))).toBe(false);
    expect(table.glowTexture.version).toBe(glow + 1);
  });

  it('frees both textures', () => {
    const table = new CellTable(1);
    const freed: string[] = [];
    table.texture.addEventListener('dispose', () => freed.push('colours'));
    table.glowTexture.addEventListener('dispose', () => freed.push('glow'));
    table.dispose();
    expect(freed).toEqual(['colours', 'glow']);
  });
});
