'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { loadMesh } from '@/features/learn/components/heuristics/real3d/data';
import { surface } from '@/features/learn/components/heuristics/real3d/glass';
import { logError } from '@/utils/logger';

import { FRAGMENT, STRENGTH, TINT, VERTEX } from './brain-glass';

import type { TBrainMesh } from './brains';

/** The brains, in turn, each as tall or as long as the others: a mouse's, a fly's, a rat's, a human's. */
const SPECIES: TBrainMesh[] = ['root', 'fly', 'rat', 'human'];
/** The brains turned over to stand upright, dorsal side up: all four, as the user saw them. */
const FLIPPED = new Set<TBrainMesh>(['root', 'fly', 'rat', 'human']);
/** How many there are at each step, each twice the last. */
const COUNTS = [1, 2, 4, 8, 16, 32, 64];
/** How long each step lasts, ms, the last held longer before it starts again from one. */
const STEP_MS = 1400;
const HOLD_MS = 2600;
/** How long a split takes, the two halves going to their places and down to their size, ms. */
const SPLIT_MS = 900;
/** How much of its place in the grid a brain takes, across. */
const FILL = 0.8;
/** How fast each turns, radians a second, and how far it is tipped towards the eye. */
const SPIN = 0.5;
const TIP = 0.35;
/** The most device pixels a CSS pixel is drawn with. */
const MAX_PIXEL_RATIO = 2;

/** Where each of `count` brains sits, and how large, in the grid of the room that gives each the most of it. */
function grid(count: number, width: number, height: number) {
  let columns = 1;
  let cell = 0;
  for (let c = 1; c <= count; c++) {
    const fits = Math.min(width / c, height / Math.ceil(count / c));
    if (fits > cell) {
      cell = fits;
      columns = c;
    }
  }
  const rows = Math.ceil(count / columns);
  const places = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / columns);
    // The last row centred where it is short.
    const inRow = row === rows - 1 ? count - row * columns : columns;
    const column = i - row * columns;
    return new THREE.Vector2(
      (column - (inRow - 1) / 2) * cell,
      ((rows - 1) / 2 - row) * cell
    );
  });
  return { places, size: cell * FILL };
}

const ease = (k: number) => k * k * (3 - 2 * k);

/**
 * Brains multiplying: one, then each splitting in two, again and again, the halves moving apart to their
 * places in a grid as they shrink to fit it, up to 64, then from one again; the course's glass brains, a
 * mouse's, a fly's, a rat's and a human's in turn, each turning. One canvas draws them all.
 */
export function MultiplyingBrains() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gone = false;
    let raf = 0;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    const scene = new THREE.Scene();
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { tint: { value: TINT }, strength: { value: STRENGTH } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const geometries: THREE.BufferGeometry[] = [];
    let size = { width: 1, height: 1 };
    const sized = new ResizeObserver(() => {
      size = { width: canvas.clientWidth || 1, height: canvas.clientHeight || 1 };
      renderer.setSize(size.width, size.height, false);
      camera.left = -size.width / 2;
      camera.right = size.width / 2;
      camera.top = size.height / 2;
      camera.bottom = -size.height / 2;
      camera.updateProjectionMatrix();
    });
    sized.observe(canvas);

    Promise.all(SPECIES.map((brain) => loadMesh(brain))).then(
      (meshes) => {
        if (gone) return;
        for (const mesh of meshes) {
          const smooth = surface(mesh, false);
          const geometry = new THREE.BufferGeometry();
          // Copies: the surfaces are cached and shared, and a geometry's moves change its arrays in place,
          // which turned the brains over again each time the screen came back.
          geometry.setAttribute('position', new THREE.BufferAttribute(smooth.v.slice(), 3));
          geometry.setAttribute('normal', new THREE.BufferAttribute(smooth.n.slice(), 3));
          geometry.setIndex(new THREE.BufferAttribute(smooth.f, 1));
          // About its middle, its longest side 1, dorsal side up on a view whose up is +y.
          geometry.computeBoundingBox();
          const box = geometry.boundingBox ?? new THREE.Box3();
          const middle = box.getCenter(new THREE.Vector3());
          const extent = box.getSize(new THREE.Vector3());
          geometry.translate(-middle.x, -middle.y, -middle.z);
          const unit = 1 / Math.max(extent.x, extent.y, extent.z);
          geometry.scale(unit, unit, unit);
          if (FLIPPED.has(SPECIES[geometries.length])) geometry.rotateX(Math.PI);
          geometries.push(geometry);
        }
        const most = COUNTS[COUNTS.length - 1];
        const brains = Array.from({ length: most }, (_, i) => {
          const brain = new THREE.Mesh(geometries[i % geometries.length], material);
          brain.visible = false;
          scene.add(brain);
          return brain;
        });
        const cycle = COUNTS.length * STEP_MS + HOLD_MS;
        const start = performance.now();
        const frame = () => {
          raf = requestAnimationFrame(frame);
          const now = performance.now() - start;
          const t = now % cycle;
          const step = Math.min(Math.floor(t / STEP_MS), COUNTS.length - 1);
          const count = COUNTS[step];
          const before = COUNTS[Math.max(step - 1, 0)];
          const k = step === 0 ? 1 : ease(Math.min((t - step * STEP_MS) / SPLIT_MS, 1));
          const from = grid(before, size.width, size.height);
          const to = grid(count, size.width, size.height);
          brains.forEach((brain, i) => {
            if (i >= count) {
              brain.visible = false;
              return;
            }
            // A new one comes out of the one it split from, which moves on too.
            const parent = i < before ? i : i - before;
            const at = from.places[parent].clone().lerp(to.places[i], k);
            const scale = from.size + (to.size - from.size) * k;
            brain.visible = true;
            brain.position.set(at.x, at.y, 0);
            brain.scale.setScalar(scale);
            brain.rotation.set(TIP, (now / 1000) * SPIN + i * 0.7, 0, 'XYZ');
          });
          renderer.render(scene, camera);
        };
        frame();
      },
      (e: unknown) => logError('Could not load the brains to multiply', e)
    );
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      sized.disconnect();
      for (const geometry of geometries) geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);
  return (
    <div className="absolute inset-x-[clamp(16px,4vw,72px)] top-[10vh] bottom-[10vh] stacked:top-[60px] stacked:bottom-auto stacked:h-[max(110px,calc(var(--chapter-h)-505px))]">
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
