/**
 * Which mesh to draw, chosen every frame: the stand-in wherever its error is far under a device pixel, and, on a GPU
 * too slow for the full mesh, while the view moves.
 */

/**
 * Past this error in device pixels the full mesh comes in, and under the other it goes: no flicker in between. Far
 * under a pixel: what is thinner than the stand-in's cubes, spines and the thinnest axons, is lost in it, not moved. At
 * a pixel ratio of 1 the dendrites of every stand-in size looked thinner than the full mesh's at overview zoom, 0.12 to
 * 0.54 px; on the largest cell, the 3M stand-in's still at 0.13 px, and the same at 0.09 px.
 */
export const FULL_ABOVE_PX = 0.1;
export const STAND_IN_BELOW_PX = 0.06;
/** The full frames measured, the median of which is the frame cost. */
const SAMPLES = 3;
/**
 * How much more a cold frame costs: the first after a pause, after frames of the stand-in, or after a change. An M4 Pro
 * drew the largest cell in 13 to 31 ms so, and in 8 ms from the third frame on.
 */
export const COLD = 2;
/** The frames after the loop starts left unmeasured while the view moves, as the GPU wakes up over them. */
export const WAKE_FRAMES = 2;
/** The full frames left unmeasured after an upload or a resize, which pay for it. */
export const SKIP_FRAMES = 2;

export type MeshKind = 'stand-in' | 'full';
export type ForcedMesh = MeshKind | 'auto';

/** Why the mesh on show is on show. */
export type Reason = 'whole' | 'loading' | 'forced' | 'moving' | 'error';

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
    if (input.forced !== 'auto') return { mesh: input.forced, reason: 'forced' };
    if (input.moving && input.slow) return { mesh: 'stand-in', reason: 'moving' };
    return { mesh: this.byError, reason: 'error' };
  }

  reset(): void {
    this.byError = 'stand-in';
  }
}

export const median = (values: readonly number[]) =>
  [...values].sort((a, b) => a - b)[values.length >> 1];

/**
 * The full mesh's frame cost: the median of the last few frames measured, skipping those that pay for a change, and
 * each cold one counted at what it would have cost warm.
 */
export class FrameCost {
  private samples: number[] = [];
  private skip = SKIP_FRAMES;
  private asked = 0;
  /** The cost measured before the last reset, which stands until a frame is measured after it. */
  private was: number | null = null;

  /**
   * Forget the frames measured, as what a frame costs has changed: its size, the occlusion, the look. What they cost
   * stands meanwhile, so that the first frames after going fullscreen, say, don't draw in full on a slow GPU.
   */
  reset(): void {
    this.was = this.ms ?? this.was;
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

  /** A frame measured, `cold` or not; the first after a change pays for some of it still. */
  add(ms: number, cold = false): void {
    this.samples.push(cold || this.samples.length === 0 ? ms / COLD : ms);
    if (this.samples.length > SAMPLES) this.samples.shift();
  }

  get ms(): number | null {
    return this.samples.length === 0 ? null : median(this.samples);
  }

  /** Past `limitMs` the full mesh is too slow to draw while the view moves. */
  slow(limitMs: number): boolean {
    const ms = this.ms ?? this.was;
    return ms !== null && ms > limitMs;
  }
}

/**
 * Whether the full mesh, drawn while the view moves, has turned too slow since the view set off. The frame cost is
 * measured where the view was: zoomed in, most chunks are culled, and zooming out makes each frame dearer. Two moving
 * frames of the full mesh in a row past the limit draw the stand-in until the view stops: one alone may be a hitch.
 */
export class MovingCost {
  private dear = 0;
  slow = false;

  add(ms: number, limitMs: number): void {
    this.dear = ms > limitMs ? this.dear + 1 : 0;
    if (this.dear >= 2) this.slow = true;
  }

  /** The view stopped. */
  stop(): void {
    this.dear = 0;
    this.slow = false;
  }
}
