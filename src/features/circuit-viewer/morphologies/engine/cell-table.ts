import chroma from 'chroma-js';
import * as THREE from 'three';

import type { CellColors } from '../types';

/** A row holds 2 to this power of cells: 2,048, the widest texture WebGL 2 promises. */
export const ROW_BITS = 11;
const ROW = 1 << ROW_BITS;

const HIDDEN = [0, 0, 0, 0];
const opaque = (color: string) => [...chroma(color).rgb(), 255];
/** How crowded a cell is taken to be until it is known, as the somas view did: halfway. */
const HALF_CROWDED = 128;

/**
 * A texel a cell, which the shaders look up by the cell's number: its colour, and in alpha whether it is drawn.
 * Colouring, hiding and receding cells rewrite this texture and nothing else. How brightly each cell glows is a
 * texture of its own beside it, a byte a cell, which a spike replay rewrites every frame. A third, which only the
 * somas read, holds two bytes a cell: how crowded its neighbourhood is, and 255 where it has no colour of its own.
 */
export class CellTable {
  readonly texture: THREE.DataTexture;
  readonly glowTexture: THREE.DataTexture;
  readonly shadeTexture: THREE.DataTexture;
  private texels: Uint8Array;
  private glowTexels: Uint8Array;
  private shadeTexels: Uint8Array;

  constructor(readonly cells: number) {
    const rows = Math.max(1, Math.ceil(cells / ROW));
    this.texels = new Uint8Array(4 * ROW * rows);
    this.texture = new THREE.DataTexture(this.texels, ROW, rows, THREE.RGBAFormat);
    // The GPU hands the shaders linear colours.
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.glowTexels = new Uint8Array(ROW * rows);
    this.glowTexture = new THREE.DataTexture(this.glowTexels, ROW, rows, THREE.RedFormat);
    this.glowTexture.needsUpdate = true;
    this.shadeTexels = new Uint8Array(2 * ROW * rows);
    this.shadeTexture = new THREE.DataTexture(this.shadeTexels, ROW, rows, THREE.RGFormat);
    this.setCrowding(null);
  }

  /** Whether the cell is drawn. */
  shown(cell: number): boolean {
    return this.texels[4 * cell + 3] > 0;
  }

  /**
   * How brightly each cell glows, from 0 to 1, by its number, kept as the somas view shapes it: held near full, then let
   * go. True where that changed a cell.
   */
  glow(glow: Readonly<Float32Array>): boolean {
    let changed = false;
    for (let cell = 0; cell < this.cells; cell++) {
      const byte = glow[cell] > 0 ? Math.round(255 * glow[cell] ** 0.4) : 0;
      if (byte === this.glowTexels[cell]) continue;
      this.glowTexels[cell] = byte;
      changed = true;
    }
    if (changed) this.glowTexture.needsUpdate = true;
    return changed;
  }

  /** How crowded each cell's neighbourhood is, from 0 to 255 by its number; null takes every cell as half crowded. */
  setCrowding(crowding: Readonly<Uint8Array> | null): void {
    for (let cell = 0; cell < this.cells; cell++) {
      this.shadeTexels[2 * cell] = crowding ? crowding[cell] : HALF_CROWDED;
    }
    this.shadeTexture.needsUpdate = true;
  }

  /** Each cell in its column's colour, or in `own` where it has no column or its column has no colour of its own. */
  paint(colors: CellColors | null, own: string): void {
    const ownRgba = opaque(own);
    const columns = (colors?.palette ?? []).map((color) => {
      if (color === false) return HIDDEN;
      return color !== null && chroma.valid(color) ? opaque(color) : ownRgba;
    });
    const byCell = colors?.columnByCell;
    for (let cell = 0; cell < this.cells; cell++) {
      // Past the end of either, there is no column.
      const rgba = (byCell && columns[byCell[cell]]) ?? ownRgba;
      for (let k = 0; k < 4; k++) this.texels[4 * cell + k] = rgba[k];
      this.shadeTexels[2 * cell + 1] = rgba === ownRgba ? 255 : 0;
    }
    this.texture.needsUpdate = true;
    this.shadeTexture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    this.glowTexture.dispose();
    this.shadeTexture.dispose();
  }
}
