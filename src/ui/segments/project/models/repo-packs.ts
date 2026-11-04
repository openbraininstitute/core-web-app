import type { Population } from '@/features/circuit-viewer/morphologies/types';
import type { OwnPack } from '@/features/viewer-3d/bare';

/**
 * A morphology pack in the repo, served by the app, and the population its index numbers its cells through. Until the
 * public pages read models from the platform properly, these are what they draw.
 */
export interface RepoPack extends OwnPack {
  population: Population;
}

/**
 * The microcircuit's pack made lighter: the coarsest level alone, which is all the walkthrough's floating view draws at
 * its size, and dendrites alone, as it hides axons; the morphologies of the outer ring of cells by distance from the
 * column's axis and of a fifth of the rest, the others somas, which looks no different from outside. 20.3 MB against
 * the stored pack's 170.8 MB (build_light_pack.py in the home_page group, from the circuit's morphologies, with
 * obi-one's pack writer).
 */
export const L6_PACK: RepoPack = {
  id: 'l6-outer-dendrites',
  url: '/static/walkthrough/l6-outer-dendrites.mpack',
  size: 20263125,
  sha256: '23cf345c12ed95b401eb368eefbdf37bf543aa8ce6414533889676cbc6570807',
  population: { name: 'S1nonbarrel_neurons', cells: 11032 },
};

/**
 * The whole FlyWire brain's surface, from the whole-brain circuit built on this machine (drosophila_brain, 137,712
 * neurons, not on the platform): every neuron cut to what lies within 20 µm of the brain's surface, at one coarse level
 * (2 µm), its neurites all drawn, numbered along a curve through space into 1,379 cells, each a hundred or so
 * neighbouring neurons that light together, under the name and number of the staging pilot's population, which used to
 * host it (build_fly_surface_pack.py --order space, in the home_page group). 8.8 MB, 1.11M segments.
 */
export const FLY_PACK: RepoPack = {
  id: 'fly-surface',
  url: '/static/walkthrough/fly-surface.mpack',
  size: 8797881,
  sha256: '64facca47840f75a9191b3a3642458b3874aff515c7e8eb8c94bfd75f55be15c',
  population: { name: 'flywire_brain', cells: 1379 },
};

/**
 * MICrONS_v1's pack, as the circuit has none stored and its project is not ours to store one in: its 877 proofread
 * neurons whole, every neurite (all typed dendrite in its skeletons), at one coarse level (1 µm), and its other 50,071
 * neurons as somas (build_microns_pack.py in the home_page group, with obi-one's pack writer, from the circuit's
 * open-data files). 7.0 MB, 1.05M segments.
 */
export const MICRONS_PACK: RepoPack = {
  id: 'microns',
  url: '/static/walkthrough/microns.mpack',
  size: 7046502,
  sha256: '0c919739cdd7f2e799b7c09e4fc8049df6cae2cdeeb3f71da1414aa703787899',
  population: { name: 'microns_intrinsic', cells: 50948 },
};
