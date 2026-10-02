'use client';

import { useState } from 'react';

import { DEFAULT_MOTION, type MotionOptions } from './engine/motion-quality';
import { STAND_IN_TRIANGLES } from './engine/stand-in';

import type { Look } from '@/features/viewer-3d/engine/looks';
import type { AODepth, Projection } from '@/features/viewer-3d/engine/scene-viewer';
import type { ForcedMesh } from './engine/mesh-choice';

export interface EmViewerSettings {
  dark: boolean;
  look: string;
  ao: boolean;
  wireframe: boolean;
  spin: boolean;
  projection: Projection;
  /** In the orthographic view: a perspective one has no single scale. */
  scalebar: boolean;
  /**
   * The Debug menu's: where the occlusion reads its depth, a mesh drawn whatever the zoom, the most triangles of the
   * stand-in, the chunks' bounds, how moving frames are cut down, and what they cost over the view.
   */
  aoDepth: AODepth;
  mesh: ForcedMesh;
  standInTriangles: number;
  chunkBoxes: boolean;
  motion: MotionOptions;
  frameTimes: boolean;
  /** The occlusion before the look turned it on, to be put back when another is chosen. */
  beforeLook: Pick<EmViewerSettings, 'ao'> | null;
}

const DEFAULT_SETTINGS: EmViewerSettings = {
  dark: false,
  look: 'em',
  ao: true,
  wireframe: false,
  spin: false,
  projection: 'orthographic',
  scalebar: true,
  aoDepth: 'main-pass',
  mesh: 'auto',
  standInTriangles: STAND_IN_TRIANGLES,
  chunkBoxes: false,
  motion: DEFAULT_MOTION,
  frameTimes: false,
  beforeLook: { ao: false },
};

export type UpdateEmSettings = (patch: Partial<EmViewerSettings>) => void;

export function useEmViewerSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const update: UpdateEmSettings = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const chooseLook = (look: Look) =>
    setSettings((s) => {
      const before = s.beforeLook ?? { ao: s.ao };
      return {
        ...s,
        ...before,
        look: look.id,
        ...(look.ao && { ao: true }),
        beforeLook: look.ao ? before : null,
      };
    });
  return { settings, update, chooseLook };
}
