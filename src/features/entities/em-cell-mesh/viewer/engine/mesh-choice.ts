/**
 * Which mesh to draw, chosen every frame: the stand-in wherever its error is under about a device pixel, and, on a GPU
 * too slow for the full mesh, while the view moves.
 */

/** Past this error in device pixels the full mesh comes in, and under the other it goes: no flicker in between. */
export const FULL_ABOVE_PX = 1.2;
export const STAND_IN_BELOW_PX = 0.8;
/** A full frame slower than this, ms, draws the stand-in while the view moves. */
export const SLOW_FRAME_MS = 20;
/** The full frames measured, the median of which is the frame cost. */
const SAMPLES = 5;
/** The full frames left unmeasured after an upload or a resize, which pay for it. */
export const SKIP_FRAMES = 2;

export type MeshKind = 'stand-in' | 'full';
export type ForcedMesh = MeshKind | 'auto';

/** Why the mesh on show is on show. */
export type Reason = 'whole' | 'loading' | 'wireframe' | 'forced' | 'moving' | 'error';

export interface Choice {
  mesh: MeshKind;
  reason: Reason;
}

export interface ChoiceInput {
  /** The full mesh is uploaded and can be drawn. */
  fullReady: boolean;
  /** The stand-in is the whole mesh: it had no more triangles than a stand-in has. */
  whole: boolean;
  forced: ForcedMesh;
  wireframe: boolean;
  /** The stand-in's error on screen, in device pixels. */
  errorPx: number;
  moving: boolean;
  /** The full mesh is too slow to draw while the view moves. */
  slow: boolean;
}

/** The stand-in's error in device pixels, where a CSS pixel spans `cssPixelUm` µm. */
export function errorPixels(errorUm: number, cssPixelUm: number, pixelRatio: number): number {
  return (errorUm * pixelRatio) / cssPixelUm;
}

/** Chooses the mesh frame after frame, keeping the side of the threshold the error was last on. */
export class MeshChooser {
  private byError: MeshKind = 'stand-in';

  choose(input: ChoiceInput): Choice {
    if (this.byError === 'stand-in' && input.errorPx > FULL_ABOVE_PX) this.byError = 'full';
    else if (this.byError === 'full' && input.errorPx < STAND_IN_BELOW_PX)
      this.byError = 'stand-in';
    if (input.whole) return { mesh: 'stand-in', reason: 'whole' };
    if (!input.fullReady) return { mesh: 'stand-in', reason: 'loading' };
    if (input.wireframe) return { mesh: 'stand-in', reason: 'wireframe' };
    if (input.forced !== 'auto') return { mesh: input.forced, reason: 'forced' };
    if (input.moving && input.slow) return { mesh: 'stand-in', reason: 'moving' };
    return { mesh: this.byError, reason: 'error' };
  }

  reset(): void {
    this.byError = 'stand-in';
  }
}

/** The full mesh's frame cost: the median of the last few frames measured, skipping those that pay for a change. */
export class FrameCost {
  private samples: number[] = [];
  private skip = SKIP_FRAMES;
  private asked = 0;
  /** Whether the frames measured before the last reset were slow, which stands until one is measured after it. */
  private wasSlow = false;

  /**
   * Forget the frames measured, as what a frame costs has changed: its size, the occlusion, the look. Whether they were
   * slow stands meanwhile, so that the first frames after going fullscreen, say, don't draw in full on a slow GPU.
   */
  reset(): void {
    this.wasSlow = this.slow;
    this.samples = [];
    this.skip = SKIP_FRAMES;
    this.asked = 0;
  }

  /** Whether to draw another full frame, though nothing changed, to measure one: the frames stop when the view does. */
  wantsFrame(): boolean {
    return this.samples.length === 0 && this.asked++ < SKIP_FRAMES;
  }

  /** Whether to measure a full frame about to be drawn; the first after a reset are skipped. */
  measure(): boolean {
    if (this.skip === 0) return true;
    this.skip--;
    return false;
  }

  add(ms: number): void {
    this.samples.push(ms);
    if (this.samples.length > SAMPLES) this.samples.shift();
  }

  get ms(): number | null {
    if (this.samples.length === 0) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  }

  get slow(): boolean {
    const ms = this.ms;
    return ms === null ? this.wasSlow : ms > SLOW_FRAME_MS;
  }
}
