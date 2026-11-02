import { CANVAS_WHITE } from '@/features/scan-config/components/color-by/contrast';
import { CIRCUIT_EXAMPLES, HOME_VIEWER, MESH_EXAMPLES } from '@/ui/segments/project/start/items';

import type { ViewerConfig } from '@/features/scan-config/components/color-by/types';
import type { ICircuitExample, IMeshExample } from '@/ui/segments/project/start/items';

function example<T extends { key: string }>(examples: readonly T[], key: string): T {
  const found = examples.find((e) => e.key === key);
  if (!found) throw new Error(`No home example "${key}"`);
  return found;
}

/**
 * MICrONS as a circuit, public, without a stored pack: the brains walkthrough serves its own. Its virtual
 * populations, the inputs from inside and outside the volume, are 1.3M cells more.
 */
const MICRONS_CIRCUIT: ICircuitExample & { key: string } = {
  key: 'microns-v1',
  title: 'MICrONS visual cortex',
  circuitId: '0b6e40fc-9f77-49a2-b21b-b1f02ed7fb87',
  viewerDefaults: { ...HOME_VIEWER, colorByProperty: { microns_intrinsic: 'layer' } },
  population: 'microns_intrinsic',
};

/** The circuits the homes show, the first home's own examples, and MICrONS. */
export const MODEL_CIRCUITS = {
  l6: example(CIRCUIT_EXAMPLES, 'nbs1-hex0-l6'),
  fly: example(CIRCUIT_EXAMPLES, 'flywire-1pct'),
  cns: example(CIRCUIT_EXAMPLES, 'male-cns'),
  microns: MICRONS_CIRCUIT,
} satisfies Record<string, ICircuitExample & { key: string }>;

export const MODEL_MESHES = {
  human: example(MESH_EXAMPLES, 'human-pyramidal'),
  mouse: example(MESH_EXAMPLES, 'microns'),
} satisfies Record<string, IMeshExample & { key: string }>;

/** A rat's layer 5 tufted pyramidal cell, as an ME-model: public on staging. */
export const MODEL_CELL = {
  id: '4846377e-b403-4fa8-bfd3-9b95506f9dc3',
  name: 'Layer 5 tufted pyramidal cell',
};

/** The cell on white, turning, its axon drawn; laid flat as a dendrogram, it stops turning. */
export const CELL_VIEWER: Partial<ViewerConfig> = {
  backgroundColor: CANVAS_WHITE,
  showScalebar: false,
  showAxons: true,
  spin: true,
};
export const FLAT_VIEWER: Partial<ViewerConfig> = { ...CELL_VIEWER, spin: false };

export type TModelCircuit = keyof typeof MODEL_CIRCUITS;
export type TModelMesh = keyof typeof MODEL_MESHES;
/** One of the platform's models the homes show in 3D. */
export type TModel = TModelCircuit | TModelMesh | 'cell';

export const isModelCircuit = (model: string): model is TModelCircuit => model in MODEL_CIRCUITS;
export const isModelMesh = (model: string): model is TModelMesh => model in MODEL_MESHES;

/** What a model is called under its mini and over its view. */
export function modelTitle(model: TModel): string {
  if (isModelCircuit(model)) return MODEL_CIRCUITS[model].title;
  if (isModelMesh(model)) return MODEL_MESHES[model].title;
  return MODEL_CELL.name;
}

/** The models along the new home's foot, in order, each a turntable clip of its 3D view. */
export const MODEL_MINIS: Array<{ model: TModel; label: string; clip: string }> = [
  { model: 'l6', label: 'Cortical microcircuit', clip: '/images/start/minis/l6.mp4' },
  { model: 'cell', label: 'Pyramidal cell model', clip: '/images/start/minis/cell.mp4' },
  { model: 'human', label: 'Human neuron', clip: '/images/start/minis/human.mp4' },
  { model: 'mouse', label: 'Mouse neuron', clip: '/images/start/minis/mouse.mp4' },
  { model: 'fly', label: 'Fly brain', clip: '/images/start/minis/fly.mp4?v=2' },
  { model: 'cns', label: 'Fly nervous system', clip: '/images/start/minis/cns.mp4' },
];
