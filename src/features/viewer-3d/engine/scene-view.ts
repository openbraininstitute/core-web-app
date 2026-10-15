import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { distanceFor, fitHalfHeight, halfHeightAt, orthoClip, orthoPixelScale } from './camera';
import { boxCorners, clipRange, fitDistance, orbitRadius } from './framing';
import { type Axis, axisView, type Sign } from './gizmo';
import { followScreenUp, glideLeft, stopGlide, turnCamera } from './rotation';

/** Fraction of the way from the centre to the edge of the view that the farthest-reaching side of a cell comes to on reset. */
const FIT_FILL = 0.92;
/** Vertical field of view of the perspective camera, degrees. */
const FOV = 45;
/** How long the camera takes to turn to an axis the gizmo was clicked on, ms. */
const TURN_MS = 300;
/** The most device pixels a CSS pixel is drawn with: a 3× phone draws at 2×. */
export const MAX_PIXEL_RATIO = 2;
/**
 * How long the view still counts as moving once a gesture moved it, ms. A wheel notch moves it at once, in OrbitControls'
 * own handler: without the wait, a content that draws less while the view moves would draw in full between two notches.
 */
const MOVING_FOR_MS = 200;
/**
 * How fast OrbitControls' glide after a gesture dies away, ms: as three's damping of 0.05 a frame does at 120 Hz. Three
 * damps by the frame, which drew the glide out over seconds where frames are slow. Its handlers damp between frames by
 * the factor the last frame set, so a drag keeps the lag it has at 120 Hz, as browsers send a pointer move a frame.
 */
const GLIDE_MS = 160;
/** What is left of a glide when it ends, in CSS pixels at the cell's far side: too little to see. */
const GLIDE_STOP_PX = 2;
/** The frame times the glide's easing is worked out for, ms: past a stall, or with a clock that stands still. */
const FRAME_MS = { min: 1000 / 240, max: 250 };
const sphere = new THREE.Sphere();

export type Projection = 'orthographic' | 'perspective';

/** What the chrome over a view drives and listens to: the axes gizmo and the scale bar. */
export interface ViewControls {
  /** µm per CSS pixel in the orthographic view, null in perspective. */
  readonly currentPixelScale: number | null;
  onPixelScaleChange(listener: (scale: number | null) => void): () => void;
  onViewChange(listener: (orientation: Readonly<THREE.Quaternion>) => void): () => void;
  viewAlong(axis: Axis, sign: Sign): void;
}

/** How a frame drawn while the camera moves is cut down, or was drawn. */
export interface MovingFrame {
  /** With the ambient occlusion, where it is on. */
  ao: boolean;
  /** At this fraction of the resolution, scaled up onto the canvas. */
  scale: number;
  /** Multisampled, as still frames are. */
  antialias: boolean;
}

/**
 * A view of a scene on a canvas, whatever draws it: both cameras, OrbitControls, the render-on-demand loop, and the
 * framing. The content sits around the origin, which the camera orbits, and frames the view with `bounds` and
 * `fitPoints`. The renderer is the subclass's: it draws a frame (`draw`), sizes itself (`sizeStage`) and turns the loop
 * (`animate`). Its constructor makes the renderer on `canvas` and then fits the canvas (`fitCanvas`) and asks for the
 * first frame (`invalidate`): nothing here calls a method a subclass overrides.
 */
export abstract class SceneView implements ViewControls {
  protected scene = new THREE.Scene();
  private perspective = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100000);
  private orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  protected projection: Projection = 'orthographic';
  protected controls: OrbitControls;
  protected bounds = new THREE.Box3(
    new THREE.Vector3(-50, -50, -50),
    new THREE.Vector3(50, 50, 50)
  );
  /** Points (x, y, z after one another) that `resetView` fits into the view instead of the corners of `bounds`. */
  protected fitPoints: Float32Array | null = null;
  /** The canvas's size in CSS pixels, as `resize` left it. */
  protected width = 1;
  protected height = 1;
  /** Set whenever something other than the camera changed; the loop only renders when needed. */
  private dirty = true;
  /** The animation loop stops once nothing moves and nothing has changed; `invalidate` starts it again. */
  private looping = false;
  /**
   * When a gesture last moved the camera, which counts as moving for `MOVING_FOR_MS`, and whether the last frame was
   * drawn as moving: a still one is owed after it.
   */
  private movedAt = Number.NEGATIVE_INFINITY;
  protected drawnMoving = false;
  /** Frames drawn since the loop last started, or the page was hidden: the GPU wakes up over the first few. */
  protected framesDrawn = 0;
  /** A gesture is under way, between OrbitControls' start and end: a drag, a wheel turned, a pinch. */
  private gesture = false;
  /** When the loop last turned, null while it is stopped, and how long its last turn took, for the glide's easing. */
  private lastFrameAt: number | null = null;
  private frameMs = 1000 / 120;
  protected disposed = false;
  private resizeObserver: ResizeObserver;
  /** Off screen, nothing is drawn, and the loop doesn't turn: a spinning view scrolled past costs nothing. */
  private onScreen = true;
  private intersection: IntersectionObserver | null = null;
  /** The view has been on screen in a page on show (`seen`). */
  private seenOnce = false;
  private seenListeners = new Set<() => void>();
  private pixelScale: number | null = null;
  private pixelScaleListeners = new Set<(scale: number | null) => void>();
  private wheelListeners = new Set<() => void>();
  private viewListeners = new Set<(orientation: Readonly<THREE.Quaternion>) => void>();
  /** The camera's orientation as the view listeners last heard it. */
  private heardOrientation = new THREE.Quaternion();
  /** The camera turning to view along an axis: its orientation at either end, and when it set off. */
  private turn: { from: THREE.Quaternion; to: THREE.Quaternion; start: number } | null = null;

  constructor(
    protected container: HTMLElement,
    protected canvas: HTMLCanvasElement
  ) {
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    this.perspective.position.set(0, 0, 500);
    this.orthographic.position.set(0, 0, 500);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 0.7;
    // Wheel and pointer handlers apply their change inside OrbitControls itself, so the per-frame
    // update() alone would miss them; the change event catches every path.
    this.controls.addEventListener('change', this.onControlsChange);
    this.controls.addEventListener('start', this.onControlsStart);
    this.controls.addEventListener('end', this.onControlsEnd);
    // Before OrbitControls sees it: outside fullscreen a plain wheel scrolls the page.
    container.addEventListener('wheel', this.onWheel, { capture: true });
    this.scene.add(this.perspective, this.orthographic);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersection = new IntersectionObserver((entries) => {
        const entry = entries.at(-1);
        if (entry) this.screenChanged(entry.isIntersecting);
      });
      this.intersection.observe(container);
    } else this.checkSeen();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  protected get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.projection === 'perspective' ? this.perspective : this.orthographic;
  }

  dispose(): void {
    this.disposed = true;
    this.animate(null);
    this.resizeObserver.disconnect();
    this.intersection?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.seenListeners.clear();
    this.container.removeEventListener('wheel', this.onWheel, { capture: true });
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.removeEventListener('end', this.onControlsEnd);
    this.controls.dispose();
    this.disposeContent();
    this.disposeStage();
    this.canvas.remove();
    this.pixelScaleListeners.clear();
    this.wheelListeners.clear();
    this.viewListeners.clear();
  }

  /** Free what the content put in the scene, as the viewer is disposed of, before the renderer goes. */
  protected disposeContent(): void {}

  /** Free the renderer and what it drew with. */
  protected abstract disposeStage(): void;

  // ---------------------------------------------------------------------------
  // Rendering

  /** A frame: how it was cut down while the camera moves, through the composer, or null. */
  protected abstract draw(moving: boolean): MovingFrame | null;

  /** Call `loop` on every frame the display draws, or none with null. */
  protected abstract animate(loop: (() => void) | null): void;

  /** Size the renderer and its passes to the canvas, `width` × `height` CSS pixels. */
  protected abstract sizeStage(width: number, height: number): void;

  /**
   * Render only when the camera moved (including damping and spin) or the scene changed, and stop when neither did,
   * once a frame has been drawn still after the camera stopped, and the content has no work left (`work`).
   */
  private frame(): void {
    const turning = this.turn !== null;
    this.stepTurn();
    const now = performance.now();
    const eased = this.easing(now);
    // Let go of, a glide stops short of the little left; held, that is turned at once, as a slow drag adds a pixel or
    // two a move, all of which must be turned.
    // The spin adds to the glide every frame, but not while a pointer holds the view.
    const creeping = !(this.controls.autoRotate && !this.gesture) && this.creeping();
    if (creeping && !this.gesture) stopGlide(this.controls);
    this.controls.dampingFactor = creeping && this.gesture ? 1 : eased;
    const moved = this.controls.update();
    this.controls.dampingFactor = eased;
    // Zoomed in close, three reports a glide's last frames only every few, as each moves the camera too little; it
    // ends all the same, once what is left creeps.
    const left = glideLeft(this.controls);
    const gliding = left !== null && (left.angle > 0 || left.pan > 0);
    const moving = moved || turning || gliding || now - this.movedAt < MOVING_FOR_MS;
    if (this.drawnMoving && !moving) this.dirty = true;
    const working = this.work(moving);
    if (!moved && !this.dirty) {
      if (moving || working) return;
      this.stopLoop();
      return;
    }
    // Before the hooks, which may ask for another frame.
    this.dirty = false;
    this.updateCameraTied();
    this.beforeDraw(moving);
    const drawn = this.draw(moving);
    this.drawnMoving = moving;
    this.afterDraw(moving ? drawn : null);
    this.framesDrawn++;
    const orientation = this.camera.quaternion;
    if (!orientation.equals(this.heardOrientation)) {
      this.heardOrientation.copy(orientation);
      for (const listener of this.viewListeners) listener(orientation);
    }
  }

  private stopLoop(): void {
    this.animate(null);
    this.looping = false;
    this.lastFrameAt = null;
    this.framesDrawn = 0;
  }

  /** OrbitControls' damping for the time since the last turn of the loop: the glide lasts as long at any frame rate. */
  private easing(now: number): number {
    if (this.lastFrameAt !== null) {
      this.frameMs = Math.min(Math.max(now - this.lastFrameAt, FRAME_MS.min), FRAME_MS.max);
    }
    this.lastFrameAt = now;
    return 1 - Math.exp(-this.frameMs / GLIDE_MS);
  }

  /**
   * Whether what is left of OrbitControls' glide would move the view by under `GLIDE_STOP_PX`. Three glides on until
   * the camera moves by a nanometre a frame: a second or more of creep too small to see, which holds back the frames
   * drawn still.
   */
  private creeping(): boolean {
    const left = glideLeft(this.controls);
    if (!left || (left.angle === 0 && left.pan === 0)) return false;
    if (this.bounds.isEmpty()) return true;
    const { center, radius } = this.bounds.getBoundingSphere(sphere);
    let reach = center.distanceTo(this.controls.target) + radius;
    let pixel = this.cssPixelNear(this.bounds);
    if (this.projection === 'perspective') {
      // The camera can be inside the bounds, where the nearest point is at the near plane. Taken a quarter of the way
      // to the target, within 1.25 times that way of it: what is nearer still, so close to the eye, may move a few
      // pixels more as the glide ends.
      const d = this.controls.getDistance();
      reach = Math.min(reach, 1.25 * d);
      pixel = this.cssPixelNear(this.bounds, Math.max(0.25 * d, this.perspective.near));
    }
    return !((left.angle * reach + left.pan) / pixel >= GLIDE_STOP_PX);
  }

  private stepTurn(): void {
    const turn = this.turn;
    if (!turn) return;
    const t = Math.min(1, (performance.now() - turn.start) / TURN_MS);
    turnCamera(this.controls, turn.from, turn.to, t);
    if (t === 1) this.turn = null;
    this.dirty = true;
  }

  /**
   * Work the content does a little of on each turn of the loop, drawn or not, and less of while the camera moves; true
   * while some is left, which keeps the loop turning. What it changes on show it asks a frame for (`invalidate`).
   */
  protected work(_moving: boolean): boolean {
    return false;
  }

  /** Before a frame is drawn, with whether the camera is moving: what the content draws may depend on it. */
  protected beforeDraw(_moving: boolean): void {}

  /** After a frame is drawn: how, through the composer, where the camera moved; null where it was still. */
  protected afterDraw(_moved: MovingFrame | null): void {}

  /** After what a frame costs changed: the view's size, the look, or the passes. */
  protected frameChanged(): void {}

  /** Per frame, after the clip range: what else follows the orbit distance and the view's `reach` (`reach`). */
  protected cameraTied(_distance: number, _reach: number): void {}

  /** After the camera in use changed (`setProjection`). */
  protected projectionChanged(): void {}

  protected invalidate(): void {
    this.dirty = true;
    if (this.looping || this.disposed || !this.onScreen) return;
    this.looping = true;
    this.animate(() => this.frame());
  }

  private screenChanged(on: boolean): void {
    this.onScreen = on;
    this.checkSeen();
    if (on) this.invalidate();
    else this.stopLoop();
  }

  // Hidden, a page draws nothing though its loop stays on: the GPU idles, and wakes up over the first frames again.
  private onVisibility = (): void => {
    if (document.hidden) this.framesDrawn = 0;
    this.checkSeen();
  };

  private checkSeen = (): void => {
    if (this.seenOnce || !this.onScreen || document.hidden) return;
    this.seenOnce = true;
    for (const listener of this.seenListeners) listener();
    this.seenListeners.clear();
  };

  /**
   * Resolves once the view has been on screen in a page on show, at once from then on: a tab opened in the background,
   * or a view scrolled past unseen, waits.
   */
  seen(): Promise<void> {
    if (this.seenOnce) return Promise.resolve();
    return new Promise((resolve) => this.seenListeners.add(resolve));
  }

  private onControlsChange = (): void => {
    // A wheel or a pinch zooms inside OrbitControls' own handler, which leaves the next frame's update nothing to do.
    if (this.gesture) this.movedAt = performance.now();
    followScreenUp(this.controls);
    this.invalidate();
    this.updatePixelScale();
  };

  /** Drop what is left of a turn to an axis and of OrbitControls' easing, so that a view set now stays put. */
  private stopCamera(): void {
    this.turn = null;
    stopGlide(this.controls);
  }

  // A gesture takes the camera over from a turn to an axis, keeping OrbitControls' easing.
  private onControlsStart = (): void => {
    this.turn = null;
    this.gesture = true;
  };

  // A spin held off by a still pointer can have let the loop stop by the time the pointer is let go.
  private onControlsEnd = (): void => {
    this.gesture = false;
    this.invalidate();
  };

  private onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || document.fullscreenElement?.contains(this.container)) return;
    e.stopPropagation();
    for (const listener of this.wheelListeners) listener();
  };

  /** How close the view is: the orbit distance, or for the orthographic camera the perspective distance with its view. */
  private reach(distance: number): number {
    if (this.projection === 'perspective') return distance;
    const o = this.orthographic;
    return distanceFor(o.top / o.zoom, FOV);
  }

  /** Per-frame state that follows the camera: the clip range tied to the orbit distance, and `cameraTied`. */
  private updateCameraTied(): void {
    const camera = this.camera;
    const target = this.controls.target;
    const d = camera.position.distanceTo(target);
    const radius = orbitRadius(this.bounds) || 50;
    // A near plane fixed at the framing distance would cut fibres tens of µm away on a mm-scale cell.
    const { near, far } =
      this.projection === 'perspective'
        ? clipRange(d, camera.position.length(), radius)
        : orthoClip(d, radius + target.length());
    if (near !== camera.near || far !== camera.far) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
    this.cameraTied(d, this.reach(d));
  }

  private resize(): void {
    if (this.fitCanvas()) this.frameChanged();
  }

  /** Size the canvas, the cameras and the stage to the container; false where it is hidden. */
  protected fitCanvas(): boolean {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    // Hidden (display: none): keep the last size rather than draw into a point.
    if (w === 0 || h === 0) return false;
    this.width = w;
    this.height = h;
    this.perspective.aspect = w / h;
    this.perspective.updateProjectionMatrix();
    const o = this.orthographic;
    o.left = -o.top * (w / h);
    o.right = o.top * (w / h);
    o.updateProjectionMatrix();
    this.sizeStage(w, h);
    this.invalidate();
    this.updatePixelScale();
    return true;
  }

  private updatePixelScale(): void {
    const o = this.orthographic;
    const scale =
      this.projection === 'orthographic'
        ? orthoPixelScale(o.top, o.bottom, o.zoom, this.height)
        : null;
    if (scale === this.pixelScale) return;
    this.pixelScale = scale;
    for (const listener of this.pixelScaleListeners) listener(scale);
  }

  // ---------------------------------------------------------------------------
  // View options

  setSpin(on: boolean): void {
    this.controls.autoRotate = on;
    this.invalidate();
  }

  /** µm per CSS pixel in the orthographic view, null in perspective. */
  get currentPixelScale(): number | null {
    return this.pixelScale;
  }

  /** The orthographic view's zoom: 1 as `resetView` frames it, 2 twice as near. */
  get zoom(): number {
    return this.orthographic.zoom;
  }

  /** Zoom the orthographic view about its target, which its pixel scale's listeners hear of. */
  setZoom(zoom: number): void {
    const o = this.orthographic;
    if (zoom === o.zoom) return;
    this.stopCamera();
    o.zoom = zoom;
    o.updateProjectionMatrix();
    this.invalidate();
    this.updatePixelScale();
  }

  /**
   * µm per CSS pixel at the point of `box` nearest the camera, or at `nearest` from it if that is farther: the same
   * everywhere in the orthographic view.
   */
  protected cssPixelNear(box: THREE.Box3, nearest = this.perspective.near): number {
    if (this.projection === 'orthographic') {
      const o = this.orthographic;
      return orthoPixelScale(o.top, o.bottom, o.zoom, this.height);
    }
    const camera = this.perspective;
    const d = Math.max(box.distanceToPoint(camera.position), nearest);
    return (2 * halfHeightAt(d, FOV)) / this.height;
  }

  /**
   * Switch between the orthographic and the perspective camera, keeping the target, the direction and how large the
   * cell is at the target. What rides on the camera, the looks' lights, goes over with it.
   */
  setProjection(projection: Projection): void {
    if (projection === this.projection) return;
    const from = this.camera;
    const target = this.controls.target;
    const offset = from.position.clone().sub(target);
    const d = offset.length();
    const o = this.orthographic;
    this.projection = projection;
    const to = this.camera;
    if (projection === 'orthographic') {
      const half = halfHeightAt(d, FOV);
      o.top = half;
      o.bottom = -half;
      o.left = -half * (this.width / this.height);
      o.right = half * (this.width / this.height);
      o.zoom = 1;
      to.position.copy(from.position);
    } else {
      to.position
        .copy(target)
        .addScaledVector(offset.normalize(), distanceFor(o.top / o.zoom, FOV));
    }
    to.up.copy(from.up);
    to.quaternion.copy(from.quaternion);
    to.updateProjectionMatrix();
    for (const rider of [...from.children]) to.add(rider);
    this.controls.object = to;
    this.projectionChanged();
    this.controls.update();
    this.invalidate();
    this.updatePixelScale();
  }

  resetView(): void {
    // Orbit the origin (a morphology's soma, an EM mesh's centre), as close as lets the whole cell in: the side that
    // reaches farthest on screen comes to within a margin of the edge.
    const aspect = this.width / this.height;
    const tanY = Math.tan((FOV * Math.PI) / 360);
    const points = this.fitPoints ?? boxCorners(this.bounds);
    const r = orbitRadius(this.bounds) || 50;
    const camera = this.camera;
    if (this.projection === 'perspective') {
      const dist = fitDistance(points, tanY * aspect, tanY, FIT_FILL, r * 0.02) || r / tanY;
      camera.position.set(0, 0, dist);
    } else {
      const o = this.orthographic;
      const half = fitHalfHeight(points, aspect, FIT_FILL) || r;
      o.top = half;
      o.bottom = -half;
      o.left = -half * aspect;
      o.right = half * aspect;
      o.zoom = 1;
      o.updateProjectionMatrix();
      // Where the perspective camera would stand for this view, outside the cell.
      camera.position.set(0, 0, Math.max(distanceFor(half, FOV), r * 1.05));
    }
    camera.up.set(0, 1, 0);
    this.stopCamera();
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.invalidate();
    this.updatePixelScale();
  }

  /** Turn the camera about the target to view the cell from the tip of an axis, or from the opposite tip when it already does. */
  viewAlong(axis: Axis, sign: Sign): void {
    this.stopCamera();
    const from = this.camera.quaternion.clone();
    this.turn = { from, to: axisView(axis, sign, from), start: performance.now() };
    this.invalidate();
  }

  /** The camera's orientation now and whenever it turns. */
  onViewChange(listener: (orientation: Readonly<THREE.Quaternion>) => void): () => void {
    this.viewListeners.add(listener);
    listener(this.camera.quaternion);
    return () => this.viewListeners.delete(listener);
  }

  onPixelScaleChange(listener: (scale: number | null) => void): () => void {
    this.pixelScaleListeners.add(listener);
    return () => this.pixelScaleListeners.delete(listener);
  }

  /** A wheel turned outside fullscreen without Ctrl, which scrolls the page instead of zooming. */
  onWheelWithoutCtrl(listener: () => void): () => void {
    this.wheelListeners.add(listener);
    return () => this.wheelListeners.delete(listener);
  }
}
