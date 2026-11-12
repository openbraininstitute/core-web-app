'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

import { logError } from '@/utils/logger';

import type { FramedView } from '@/features/viewer-3d/bare';
import type { ViewFrame } from '@/features/viewer-3d/engine/scene-view';

/** µm to a voxel of Janelia's Male CNS skeletons. */
const VOXEL_UM = 0.008;
const MAX_PIXEL_RATIO = 2;

/** A skeleton's SWC as the ends of its segments, each point to its parent's, µm. */
function segmentsOf(swc: string): Float32Array {
  const rows = swc
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.trim().split(/\s+/).map(Number));
  const byId = new Map(rows.map((row) => [row[0], row]));
  const ends: number[] = [];
  rows.forEach((row) => {
    const parent = byId.get(row[6]);
    if (parent) ends.push(row[2], row[3], row[4], parent[2], parent[3], parent[4]);
  });
  return Float32Array.from(ends, (v) => v * VOXEL_UM);
}

/**
 * A Male CNS neuron's whole skeleton over a 3D view of the CNS, turning with it: fetched by its body id through
 * the app, and drawn after each of the view's frames with its camera, `width` CSS px wide in `color`, on a
 * canvas of its own laid over the view's.
 */
export function NeuronSkeleton({
  view,
  body,
  color,
  width = 2.4,
}: {
  view: FramedView;
  body: number;
  color: string;
  width?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState<{ draw: (frame: ViewFrame) => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gone = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: LineSegmentsGeometry | null = null;
    const material = new LineMaterial({ color, linewidth: width, depthTest: false, transparent: true });
    fetch(`/api/walkthrough/male-cns-skeleton/${body}`)
      .then((response) => {
        if (!response.ok) throw new Error(`No skeleton for body ${body}: ${response.status}`);
        return response.text();
      })
      .then(
        (swc) => {
          if (gone) return;
          geometry = new LineSegmentsGeometry();
          geometry.setPositions(segmentsOf(swc));
          renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
          renderer.setClearColor(0x000000, 0);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
          const lines = new LineSegments2(geometry, material);
          lines.matrixAutoUpdate = false;
          lines.frustumCulled = false;
          const scene = new THREE.Scene();
          scene.add(lines);
          const camera = new THREE.Camera();
          camera.matrixAutoUpdate = false;
          camera.matrixWorldAutoUpdate = false;
          let size = '';
          const draw = (seen: ViewFrame) => {
            if (!renderer) return;
            const at = `${seen.width}x${seen.height}`;
            if (at !== size) {
              size = at;
              renderer.setSize(seen.width, seen.height, false);
              material.resolution.set(seen.width, seen.height);
            }
            camera.matrixWorldInverse.copy(seen.view);
            camera.matrixWorld.copy(seen.view).invert();
            camera.projectionMatrix.copy(seen.projection);
            camera.projectionMatrixInverse.copy(seen.projection).invert();
            const [x, y, z] = seen.origin;
            lines.matrix.makeTranslation(-x, -y, -z);
            lines.matrixWorldNeedsUpdate = true;
            renderer.render(scene, camera);
          };
          setDrawing({ draw });
        },
        (e: unknown) => logError('Could not draw the neuron picked', e)
      );
    return () => {
      gone = true;
      setDrawing(null);
      geometry?.dispose();
      material.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, [body, color, width]);

  useEffect(() => {
    if (drawing) return view.onFrame(drawing.draw);
  }, [view, drawing]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}
