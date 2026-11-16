import * as THREE from 'three/webgpu';

/**
 * The kept list hides little once the view is this far from the one it was made for: a turn, radians; how many times
 * as much a pixel spans; and a move of the orbit's target, in view heights.
 */
const STALE_TURN = (15 * Math.PI) / 180;
const STALE_ZOOM_OUT = 1.5;
const STALE_PAN = 0.25;

/** The view the culling's kept list was last made for; none until `set`. */
export class KeptView {
  private turn = new THREE.Quaternion();
  private target = new THREE.Vector3();
  private span = 0;
  private projected = true;

  /**
   * Whether the view is far from the kept list's: `turn` the camera's, `target` the orbit's, `span` the µm a CSS pixel
   * spans there and `height` the view's, in CSS pixels.
   */
  stale(turn: THREE.Quaternion, target: THREE.Vector3, span: number, height: number): boolean {
    if (this.span === 0) return false;
    return (
      !this.projected ||
      this.turn.angleTo(turn) > STALE_TURN ||
      span > this.span * STALE_ZOOM_OUT ||
      this.target.distanceTo(target) > STALE_PAN * span * height
    );
  }

  set(turn: THREE.Quaternion, target: THREE.Vector3, span: number): void {
    this.turn.copy(turn);
    this.target.copy(target);
    this.span = span;
    this.projected = true;
  }

  /** The kept list was made for the other camera. */
  projectionChanged(): void {
    this.projected = false;
  }
}
