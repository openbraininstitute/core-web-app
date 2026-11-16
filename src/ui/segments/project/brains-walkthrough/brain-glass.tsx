'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { loadMesh } from '@/features/learn/components/heuristics/real3d/data';
import { surface } from '@/features/learn/components/heuristics/real3d/glass';
import { logError } from '@/utils/logger';

import type { FramedView } from '@/features/viewer-3d/bare';
import type { ViewFrame } from '@/features/viewer-3d/engine/scene-view';
import type { TBrainMesh } from './brains';


/** The course's glass on white, the mitral cell's blue. */
export const TINT = new THREE.Color(72 / 255, 100 / 255, 150 / 255);
/** How strongly the glass is laid over, as the course's row of brains has it. */
export const STRENGTH = 0.75;
/** How long the glass takes to come up once its mesh is in, ms. */
const FADE_MS = 900;
/** The most device pixels a CSS pixel is drawn with, as the views under it. */
const MAX_PIXEL_RATIO = 2;

export const VERTEX = /* glsl */ `
varying vec3 seen;
void main() {
  seen = normalMatrix * normal;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // Laid over the view whatever its depth, as the course lays its glass: the view's clip range is for its cells.
  gl_Position = vec4(clip.xy, 0.0, clip.w);
}`;

// The course's glass on white: a faint tint across its face, deepening where it turns edge-on.
export const FRAGMENT = /* glsl */ `
uniform vec3 tint;
uniform float strength;
varying vec3 seen;
void main() {
  vec3 n = normalize(seen);
  float a = (0.025 + 0.5 * pow(1.0 - abs(n.z), 1.6)) * strength;
  gl_FragColor = vec4(tint * a, a);
}`;

/**
 * One of the course's brains as glass over a 3D view, turning with it: drawn after each of the
 * view's frames with its camera, on a canvas of its own laid over the view's, and through it the
 * cells on show. `place` carries the mesh's frame, µm along (AP, DV, ML), into the view's own. A
 * point of the brain's own frame, `mark`, is marked by a dot, and where it is drawn told to `onMark`.
 */
export function BrainGlass({
  view,
  brain,
  place,
  strength = STRENGTH,
  mark,
  onMark,
  onLoaded,
}: {
  view: FramedView;
  brain: TBrainMesh;
  place: THREE.Matrix4;
  strength?: number;
  mark?: readonly [number, number, number];
  /** Where `mark` is drawn after each frame, CSS px from the view's top left corner. */
  onMark?: (x: number, y: number) => void;
  /** Told once its mesh is in, and drawn from the next frame. */
  onLoaded?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const marked = useRef(onMark);
  const loaded = useRef(onLoaded);
  useEffect(() => {
    marked.current = onMark;
    loaded.current = onLoaded;
  });
  const [drawing, setDrawing] = useState<{
    draw: (frame: ViewFrame) => void;
    fade: (strength: number) => void;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gone = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let fading = 0;
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { tint: { value: TINT }, strength: { value: 0 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      // Premultiplied, laid over as a tint.
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    loadMesh(brain).then(
      (mesh) => {
        if (gone) return;
        const smooth = surface(mesh, true);
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(smooth.v, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(smooth.n, 3));
        geometry.setIndex(new THREE.BufferAttribute(smooth.f, 1));
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          premultipliedAlpha: true,
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
        const shell = new THREE.Mesh(geometry, material);
        shell.matrixAutoUpdate = false;
        shell.frustumCulled = false;
        const scene = new THREE.Scene();
        scene.add(shell);
        const camera = new THREE.Camera();
        camera.matrixAutoUpdate = false;
        camera.matrixWorldAutoUpdate = false;
        const origin = new THREE.Matrix4();
        const point = new THREE.Vector3();
        let last: ViewFrame | null = null;
        let size = '';
        const draw = (seen: ViewFrame) => {
          if (!renderer) return;
          last = seen;
          const at = `${seen.width}x${seen.height}`;
          if (at !== size) {
            size = at;
            renderer.setSize(seen.width, seen.height, false);
          }
          camera.matrixWorldInverse.copy(seen.view);
          camera.matrixWorld.copy(seen.view).invert();
          camera.projectionMatrix.copy(seen.projection);
          camera.projectionMatrixInverse.copy(seen.projection).invert();
          const [x, y, z] = seen.origin;
          shell.matrix.multiplyMatrices(origin.makeTranslation(-x, -y, -z), place);
          shell.matrixWorldNeedsUpdate = true;
          renderer.render(scene, camera);
          const dot = markRef.current;
          if (mark && dot) {
            point.set(...mark).applyMatrix4(shell.matrix).applyMatrix4(seen.view);
            point.applyMatrix4(seen.projection);
            const left = ((point.x + 1) / 2) * seen.width;
            const top = ((1 - point.y) / 2) * seen.height;
            dot.style.transform = `translate(${left}px, ${top}px)`;
            marked.current?.(left, top);
          }
        };
        // The glass comes up, and goes to a new strength, over frames of its own: a still view draws none.
        const fade = (to: number) => {
          cancelAnimationFrame(fading);
          const from = material.uniforms.strength.value as number;
          const start = performance.now();
          const step = () => {
            const k = Math.min(1, (performance.now() - start) / FADE_MS);
            material.uniforms.strength.value = from + (to - from) * k * k * (3 - 2 * k);
            if (last) draw(last);
            if (k < 1) fading = requestAnimationFrame(step);
          };
          fading = requestAnimationFrame(step);
        };
        setDrawing({ draw, fade });
        loaded.current?.();
      },
      (e: unknown) => logError('Could not load the brain to draw round the view', e)
    );
    return () => {
      gone = true;
      cancelAnimationFrame(fading);
      setDrawing(null);
      geometry?.dispose();
      material.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, [view, brain, place, mark]);

  useEffect(() => {
    if (drawing) return view.onFrame(drawing.draw);
  }, [view, drawing]);
  useEffect(() => drawing?.fade(strength), [drawing, strength]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 block h-full w-full"
      />
      {mark && (
        <span
          ref={markRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 -mt-[5px] -ml-[5px] size-[10px] rounded-full bg-[#d6336c] shadow-[0_0_0_5px_rgba(214,51,108,0.22)]"
          style={{ transform: 'translate(-100px, -100px)' }}
        />
      )}
    </>
  );
}
