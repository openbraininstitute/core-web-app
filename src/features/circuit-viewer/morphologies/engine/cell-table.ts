import chroma from 'chroma-js';
import * as THREE from 'three';

import type { CellColors, SectionColors } from '../types';

/** A row holds 2 to this power of cells: 2,048, the widest texture WebGL 2 promises. */
export const ROW_BITS = 11;
const ROW = 1 << ROW_BITS;

const HIDDEN = [0, 0, 0, 0];
const opaque = (color: string) => [...chroma(color).rgb(), 255];
/** The alpha of a cell drawn in its sections' colours, whose own colour is its soma's. */
export const BY_SECTION = 254;
/** How crowded a cell is taken to be until it is known, as the somas view did: halfway. */
const HALF_CROWDED = 128;
/** The glow kept is the glow to this power: held near full, then let go. */
export const GLOW_POWER = 0.4;

/**
 * Writes rows of `texture`, a byte a cell, from `texels` straight to the GPU where it can, in place of three uploading
 * the whole: false where it cannot.
 */
export type GlowRowsWriter = (
  texture: THREE.DataTexture,
  texels: Uint8Array,
  rows: readonly number[]
) => boolean;

/** Each cell's soma (`CircuitMorphologyData.somas`) laid out as the cell table: x, y and z, and w 1 where it has a place. */
export function somaTexture(somas: Float32Array): THREE.DataTexture {
  const cells = Math.floor(somas.length / 4);
  const rows = Math.max(1, Math.ceil(cells / ROW));
  const texels = new Float32Array(4 * ROW * rows);
  texels.set(somas.subarray(0, 4 * cells));
  for (let cell = 0; cell < cells; cell++)
    texels[4 * cell + 3] = Number.isNaN(somas[4 * cell]) ? 0 : 1;
  const texture = new THREE.DataTexture(texels, ROW, rows, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  return texture;
}

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
  /** The cells that glow in `glowTexels`. */
  private lit: readonly number[] = [];
  private hiding = false;
  /** What the cells in section colours were last painted in; null where none is. */
  sectionColors: SectionColors | null = null;

  constructor(
    readonly cells: number,
    private readonly writeGlowRows?: GlowRowsWriter
  ) {
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

  /** Whether the last paint may have hidden cells. */
  get hides(): boolean {
    return this.hiding;
  }

  /**
   * How brightly each cell glows, from 0 to 1, by its number, kept as the somas view shapes it: held near full, then let
   * go. Only the cells of `lit` glow, so only they and those that glowed before are looked at, and only the rows they
   * are in uploaded. True where that changed a cell.
   */
  glow(glow: Readonly<Float32Array>, lit: readonly number[]): boolean {
    const rows = new Set<number>();
    for (const cell of this.lit) {
      if (glow[cell] > 0 || this.glowTexels[cell] === 0) continue;
      this.glowTexels[cell] = 0;
      rows.add(cell >> ROW_BITS);
    }
    for (const cell of lit) {
      const byte = Math.round(255 * glow[cell] ** GLOW_POWER);
      if (byte === this.glowTexels[cell]) continue;
      this.glowTexels[cell] = byte;
      rows.add(cell >> ROW_BITS);
    }
    this.lit = lit;
    if (rows.size === 0) return false;
    const changed = [...rows];
    if (!this.writeGlowRows?.(this.glowTexture, this.glowTexels, changed)) {
      // three counts a range in four components a texel, whatever the texture's format.
      for (const row of changed) this.glowTexture.addUpdateRange(4 * row * ROW, 4 * ROW);
      this.glowTexture.needsUpdate = true;
    }
    return true;
  }

  /** How crowded each cell's neighbourhood is, from 0 to 255 by its number; null takes every cell as half crowded. */
  setCrowding(crowding: Readonly<Uint8Array> | null): void {
    for (let cell = 0; cell < this.cells; cell++) {
      this.shadeTexels[2 * cell] = crowding ? crowding[cell] : HALF_CROWDED;
    }
    this.shadeTexture.needsUpdate = true;
  }

  /**
   * Each cell in its column's colour, or in `own` where it has no column or its column has no colour of its own. A cell
   * in section colours is in the soma's, and `sectionColors` are the last of the palette.
   */
  paint(colors: CellColors | null, own: string): void {
    const ownRgba = opaque(own);
    const readable = (color: string) => (chroma.valid(color) ? opaque(color) : ownRgba);
    this.sectionColors = null;
    const columns = (colors?.palette ?? []).map((color) => {
      if (color === false) return HIDDEN;
      if (color === null) return ownRgba;
      if (typeof color === 'string') return readable(color);
      this.sectionColors = color;
      return [...readable(color.soma).slice(0, 3), BY_SECTION];
    });
    this.hiding = columns.includes(HIDDEN);
    const byCell = colors?.columnByCell;
    let ownChanged = false;
    for (let cell = 0; cell < this.cells; cell++) {
      // Past the end of either, there is no column.
      const rgba = (byCell && columns[byCell[cell]]) ?? ownRgba;
      for (let k = 0; k < 4; k++) this.texels[4 * cell + k] = rgba[k];
      const own = rgba === ownRgba ? 255 : 0;
      if (own === this.shadeTexels[2 * cell + 1]) continue;
      this.shadeTexels[2 * cell + 1] = own;
      ownChanged = true;
    }
    this.texture.needsUpdate = true;
    if (ownChanged) this.shadeTexture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    this.glowTexture.dispose();
    this.shadeTexture.dispose();
  }
}
