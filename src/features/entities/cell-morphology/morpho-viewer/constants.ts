import { DEFAULT_TUBE_ASPECT, type HybridParams } from './engine/hybrid';
import { MIN_RADIUS_VOXELS } from './engine/mesher';
import { UNTANGLE_VOXELS } from './engine/untangle';

import type { Palette } from './engine/colors';
import type { BumpParams } from './engine/looks';
import type { AxonRadiusMode } from './engine/prepare';

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

/** How the mesh is built, in the Debug menu's units: µm, or voxels where it says so. */
export interface BuildSettings {
  smoothing: number;
  axonRadius: AxonRadiusMode;
  axonStep: number;
  /** × voxel. */
  simplify: number;
  untangle: boolean;
  /** Tubes and voxel patches; off, voxels throughout. */
  tubes: boolean;
  tubeAspect: number;
  voxel: number;
  /** × voxel. */
  minRadius: number;
  /** × radius. */
  blend: number;
  /** × radius. */
  somaBlend: number;
  /** × voxel. */
  simplifyMesh: number;
  /** Where the session has one. */
  gpu: boolean;
}

/** The POC's defaults (engine/README.md, Build parameters). */
export const DEFAULT_BUILD: BuildSettings = {
  smoothing: 1,
  axonRadius: 'heavy',
  axonStep: 5,
  simplify: 0.5,
  untangle: true,
  tubes: true,
  tubeAspect: DEFAULT_TUBE_ASPECT,
  voxel: 10 ** -0.9,
  minRadius: MIN_RADIUS_VOXELS,
  blend: 0.1,
  somaBlend: 1,
  simplifyMesh: 1,
  gpu: true,
};

/** The mesher's parameters for the settings and the types to mesh. */
export function buildParams(b: BuildSettings, includeTypes: number[]): HybridParams {
  return {
    smoothing: b.smoothing,
    axonRadius: b.axonRadius,
    axonStep: b.axonStep,
    simplify: b.simplify * b.voxel,
    voxel: b.voxel,
    blend: b.blend,
    somaBlend: b.somaBlend,
    minRadius: b.minRadius * b.voxel,
    includeTypes,
    simplifyMesh: b.simplifyMesh * b.voxel,
    tubeAspect: b.tubeAspect,
    untangle: b.untangle ? UNTANGLE_VOXELS * b.voxel : 0,
  };
}

export const DEFAULT_BUMPS: BumpParams = { amplitude: 0.08, scale: 2.1, smoothness: 0.8 };

export const MIN_WIDTH = { min: 0, max: 4, step: 0.5, initial: 1 };
