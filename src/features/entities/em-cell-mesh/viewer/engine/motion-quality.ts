import {
  DEFAULT_MOTION as SCENE_MOTION,
  type MotionOptions as SceneMotionOptions,
} from '@/features/viewer-3d/engine/motion-quality';

import type { ForcedMesh } from './mesh-choice';

export { MOTION_SCALES, MotionQuality } from '@/features/viewer-3d/engine/motion-quality';

/** How the mesh's frames drawn while the view moves are cut down, beside the scene's. */
export interface MotionOptions extends SceneMotionOptions {
  /** The mesh drawn while the view moves. */
  mesh: ForcedMesh;
  /** What a full frame may cost the GPU before the stand-in is drawn while the view moves, ms. */
  standInMs: number;
}

/**
 * Moving frames cut down under 45 a second, and the full mesh in them down to 31 frames a second: a turn somewhat slower
 * than 60 a second is worth the full mesh.
 */
export const DEFAULT_MOTION: MotionOptions = { ...SCENE_MOTION, mesh: 'auto', standInMs: 32 };
