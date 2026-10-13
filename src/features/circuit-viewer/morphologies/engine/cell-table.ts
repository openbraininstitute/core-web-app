import chroma from 'chroma-js';
import * as THREE from 'three';

import type { CellColors } from '../types';

/** A row holds 2 to this power of cells: 2,048, the widest texture WebGL 2 promises. */
export const ROW_BITS = 11;
const ROW = 1 << ROW_BITS;

const HIDDEN = [0, 0, 0, 0];
const opaque = (color: string) => [...chroma(color).rgb(), 255];

/**
 * A texel a cell, which the shaders look up by the cell's number: its colour, and in alpha whether it is drawn.
 * Colouring, hiding and receding cells rewrite this texture and nothing else.
 */
export class CellTable {
  readonly texture: THREE.DataTexture;
  private texels: Uint8Array;

  constructor(readonly cells: number) {
    const rows = Math.max(1, Math.ceil(cells / ROW));
    this.texels = new Uint8Array(4 * ROW * rows);
    this.texture = new THREE.DataTexture(this.texels, ROW, rows, THREE.RGBAFormat);
    // The GPU hands the shaders linear colours.
    this.texture.colorSpace = THREE.SRGBColorSpace;
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
    }
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
