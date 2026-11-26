import * as THREE from 'three';

import { FRONT } from '@/features/viewer-3d/engine/scene-view';

import type { FramedView } from '@/features/viewer-3d/bare';
import type { FrameBox, ViewFrame } from '@/features/viewer-3d/engine/scene-view';

/** Radians a second, as the 3D views spin: OrbitControls' 0.7 at 60 frames a second. */
const SPIN = ((2 * Math.PI) / 3600) * 0.7 * 60;
/** How far across the view what it is framed on reaches, as the 3D views frame their cells. */
const FILL = 0.92;
const ORIGIN = [0, 0, 0] as const;
/** Radians a CSS pixel of a drag turns it by, round or up and down. */
const TURN_PER_PX = 0.008;
/** How far a drag tilts it up or down, radians, at most. */
const MOST_TILT = 0.6;

/**
 * A view with nothing of its own to draw, for something drawn over it to turn on: its camera goes
 * round the box it is framed on, about the box's way up, from its side, as the 3D views spin; where
 * `turnable`, a drag on its host turns it round and tilts it a little too, the spin held meanwhile.
 */
export class Turntable implements FramedView {
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e7, 1e7);
  private listeners = new Set<(frame: ViewFrame) => void>();
  /** What it is framed on, and the side it is seen from, split into its part along the way up and the part that turns. */
  private framed: {
    centre: THREE.Vector3;
    /** How far the box reaches from the turn's axis, and along it, either way. */
    reach: { round: number; along: number };
    radius: number;
    along: THREE.Vector3;
    flat: THREE.Vector3;
    side: THREE.Vector3;
    up: THREE.Vector3;
  } | null = null;
  private raf = 0;
  /** Round the way up from the side it is framed from, and up or down from level, radians. */
  private angle = 0;
  private tilt = 0;
  private last = performance.now();
  private drag: { id: number; x: number; y: number } | null = null;
  private host: HTMLElement;
  private width: number;
  private height: number;
  private sized: ResizeObserver;

  constructor(host: HTMLElement, { turnable = false }: { turnable?: boolean } = {}) {
    this.host = host;
    if (turnable) {
      host.addEventListener('pointerdown', this.onDown);
      host.addEventListener('pointermove', this.onMove);
      host.addEventListener('pointerup', this.onUp);
      host.addEventListener('pointercancel', this.onUp);
    }
    this.width = host.clientWidth || 1;
    this.height = host.clientHeight || 1;
    this.sized = new ResizeObserver(() => {
      this.width = host.clientWidth || 1;
      this.height = host.clientHeight || 1;
    });
    this.sized.observe(host);
    const loop = () => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  onFrame(listener: (frame: ViewFrame) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setFrameBox(box: FrameBox | null): void {
    if (!box) {
      this.framed = null;
      return;
    }
    const bounds = new THREE.Box3(new THREE.Vector3(...box.min), new THREE.Vector3(...box.max));
    const { from, up } = { ...FRONT, ...box };
    const toward = new THREE.Vector3(...from).normalize();
    const upward = new THREE.Vector3(...up).normalize();
    const along = upward.clone().multiplyScalar(toward.dot(upward));
    const flat = toward.clone().sub(along);
    const centre = bounds.getCenter(new THREE.Vector3());
    // The corners' greatest reach from the axis it turns about, and up and down it.
    const reach = { round: 0, along: 0 };
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const corner = new THREE.Vector3(x, y, z).sub(centre);
          const up = corner.dot(upward);
          reach.along = Math.max(reach.along, Math.abs(up));
          reach.round = Math.max(reach.round, corner.addScaledVector(upward, -up).length());
        }
    this.framed = {
      centre,
      reach,
      radius: bounds.getBoundingSphere(new THREE.Sphere()).radius,
      along,
      flat,
      side: new THREE.Vector3().crossVectors(upward, flat),
      up: upward,
    };
  }

  private onDown = (e: PointerEvent) => {
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    this.host.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    const { drag } = this;
    if (!drag || e.pointerId !== drag.id) return;
    this.angle -= (e.clientX - drag.x) * TURN_PER_PX;
    this.tilt = Math.min(Math.max(this.tilt + (e.clientY - drag.y) * TURN_PER_PX, -MOST_TILT), MOST_TILT);
    drag.x = e.clientX;
    drag.y = e.clientY;
  };

  private onUp = (e: PointerEvent) => {
    if (this.drag?.id === e.pointerId) this.drag = null;
  };

  private draw(): void {
    const { framed, camera, width, height } = this;
    const now = performance.now();
    if (!this.drag) this.angle += (SPIN * (now - this.last)) / 1000;
    this.last = now;
    if (!framed || this.listeners.size === 0) return;
    const { angle, tilt: lift } = this;
    const from = framed.along
      .clone()
      .addScaledVector(framed.flat, Math.cos(angle))
      .addScaledVector(framed.side, Math.sin(angle))
      .multiplyScalar(Math.cos(lift))
      .addScaledVector(framed.up, Math.sin(lift))
      .normalize();
    camera.position.copy(framed.centre).addScaledVector(from, 4 * framed.radius);
    camera.up.copy(framed.up);
    camera.lookAt(framed.centre);
    camera.updateMatrixWorld();
    const aspect = width / height;
    // Seen from the side the turn keeps to, it reaches no further across than `round`, nor up and down than `along`
    // and a little for the view's tilt from level.
    const tilt = Math.abs(from.dot(framed.up));
    const across = framed.reach.round;
    const upDown = framed.reach.along * Math.sqrt(1 - tilt * tilt) + framed.reach.round * tilt;
    const half = Math.max(upDown, across / aspect) / FILL;
    camera.top = half;
    camera.bottom = -half;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.updateProjectionMatrix();
    const frame: ViewFrame = {
      view: camera.matrixWorldInverse,
      projection: camera.projectionMatrix,
      origin: ORIGIN,
      width,
      height,
    };
    for (const listener of this.listeners) listener(frame);
  }

  dispose(): void {
    const { host } = this;
    host.removeEventListener('pointerdown', this.onDown);
    host.removeEventListener('pointermove', this.onMove);
    host.removeEventListener('pointerup', this.onUp);
    host.removeEventListener('pointercancel', this.onUp);
    cancelAnimationFrame(this.raf);
    this.sized.disconnect();
    this.listeners.clear();
  }
}
