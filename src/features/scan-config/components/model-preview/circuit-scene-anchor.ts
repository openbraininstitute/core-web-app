import { atom } from 'jotai';

/**
 * World-space point the circuit viewer is framed on (bbox / soma average).
 *
 * Written by CircuitViz / LargeCircuitPreview when geometry loads; read by
 * BlockDictionary via {@link seedElectrodeInitialOrigin} so new electrodes
 * appear in the current view instead of at schema default `(0,0,0)`.
 */
export type CircuitSceneAnchor = readonly [number, number, number];

/**
 * Shared circuit centre for seeding new electrode origins.
 *
 * Why jotai: ModelPreview / BlockDictionary sit outside the viewer subtree, so
 * a prop drill would be noisy; an atom lets any viewer publish the anchor once.
 */
export const circuitSceneAnchorAtom = atom<CircuitSceneAnchor | null>(null);
