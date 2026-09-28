import { DEFAULT_TUBE_ASPECT, type HybridParams } from './engine/hybrid';
import { UNTANGLE_VOXELS } from './engine/untangle';

import type { Palette } from './engine/colors';
import type { BumpParams } from './engine/looks';

// Six-digit hex: a colour input takes no other form.
export const LIGHT_PALETTE: Palette = {
  soma: '#444444',
  basalDendrite: '#ff0000',
  apicalDendrite: '#ff00ff',
  axon: '#0033aa',
};

export const DARK_PALETTE: Palette = {
  soma: '#aaaaaa',
  basalDendrite: '#ff0000',
  apicalDendrite: '#ff00ff',
  axon: '#1166ff',
};

const VOXEL = 10 ** -0.9;

/** The POC's defaults (engine/README.md, Build parameters). The types to mesh are the build's. */
export const BUILD_PARAMS: Omit<HybridParams, 'includeTypes'> = {
  smoothing: 1,
  axonRadius: 'heavy',
  axonStep: 5,
  simplify: 0.5 * VOXEL,
  voxel: VOXEL,
  blend: 0.1,
  somaBlend: 1,
  minRadius: VOXEL,
  simplifyMesh: VOXEL,
  tubeAspect: DEFAULT_TUBE_ASPECT,
  untangle: UNTANGLE_VOXELS * VOXEL,
};

/** What the bumps take when they are turned on by hand. */
export const DEFAULT_BUMPS: BumpParams = { amplitude: 0.06, scale: 1.5, smoothness: 0.5 };

export const MIN_WIDTH = { min: 0, max: 4, step: 0.5, initial: 1 };
