// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Viewer } from '@/features/entities/cell-morphology/morpho-viewer/engine/viewer';

import type * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const { FakeRenderer } = vi.hoisted(() => {
  /** Draws nothing; the tests run its animation loop a frame at a time. */
  class FakeRenderer {
    domElement = Object.assign(document.createElement('canvas'), {
      setPointerCapture() {},
      releasePointerCapture() {},
    });
    toneMapping = 0;
    toneMappingExposure = 1;
    loop: (() => void) | null = null;

    constructor() {
      Object.defineProperties(this.domElement, {
        clientWidth: { value: 400 },
        clientHeight: { value: 400 },
      });
    }

    setAnimationLoop(loop: (() => void) | null): void {
      this.loop = loop;
    }

    getPixelRatio(): number {
      return 1;
    }

    setPixelRatio(): void {}
    setClearColor(): void {}
    setSize(): void {}
    render(): void {}
    dispose(): void {}
    forceContextLoss(): void {}
  }
  return { FakeRenderer };
});

vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three')>()),
  WebGLRenderer: FakeRenderer,
}));

let viewer: Viewer;
let renderer: InstanceType<typeof FakeRenderer>;
let controls: OrbitControls;
let camera: THREE.Camera;

/** Run the animation loop until it stops, or for `max` frames. */
function run(max = 2000): void {
  for (let i = 0; i < max && renderer.loop; i++) renderer.loop();
}

function pointer(type: string): void {
  renderer.domElement.dispatchEvent(
    new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true })
  );
}

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  // The matcaps are drawn on a 2D canvas, which jsdom lacks; a stub is enough to build them.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
  } as unknown as CanvasRenderingContext2D);
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // In the page: OrbitControls follows a drag's pointer on the document.
  viewer = new Viewer(document.body.appendChild(document.createElement('div')));
  const internals = viewer as unknown as {
    renderer: InstanceType<typeof FakeRenderer>;
    controls: OrbitControls;
    camera: THREE.Camera;
  };
  ({ renderer, controls, camera } = internals);
  run();
});

afterEach(() => {
  viewer.dispose();
  document.body.replaceChildren();
});

describe('viewer controls', () => {
  it('spins again once a pointer held still is let go', () => {
    viewer.setSpin(true);
    run(50);
    expect(renderer.loop).not.toBeNull();
    pointer('pointerdown');
    // The spin waits for the pointer; once its easing is out, nothing moves and the loop stops.
    run();
    expect(renderer.loop).toBeNull();
    const held = camera.position.clone();
    pointer('pointerup');
    run(30);
    expect(camera.position.distanceTo(held)).toBeGreaterThan(1);
  });

  it('resets to the fitted, upright view while a drag and a pan are still easing out', () => {
    viewer.resetView();
    run();
    const position = camera.position.clone(),
      quaternion = camera.quaternion.clone();
    controls.rotateLeft(0.4);
    controls.rotateUp(0.3);
    controls.pan(30, 10);
    run(3);
    viewer.resetView();
    run();
    expect(camera.position.distanceTo(position)).toBeLessThan(1e-6);
    expect(camera.quaternion.angleTo(quaternion)).toBeLessThan(1e-6);
    expect(controls.target.length()).toBeLessThan(1e-9);
    expect(camera.up.y).toBeCloseTo(1, 9);
  });
});
