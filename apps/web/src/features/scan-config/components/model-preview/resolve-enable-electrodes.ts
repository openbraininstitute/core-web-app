import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import {
  EXPLICIT_BLOCK_TYPE,
  PER_NEURON_EXPLICIT_BLOCK_TYPE,
  type TExplicitLocationsBlockType,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';

/**
 * Compose the electrode-overlays kill-switch for {@link CircuitPreview}.
 *
 * Hosts pass `featureEnabled` from the feature flag; this helper also enforces
 * the single-scale off rule unless the domain/host explicitly allows it
 * (ERA build uses single-neuron circuits with electrodes).
 *
 * Why a pure helper: keep flag + scale policy testable without mounting React.
 */
export function resolveEnableElectrodes(options: {
  /** Feature flag for interactive electrode overlays (`electrodeOverlaysFlag`). */
  featureEnabled: boolean;
  /** Circuit scale when known; singles stay off unless `allowSingleScale`. */
  scale?: TCircuitScaleDictionary;
  /** Large-circuit (somas-only) preview — no single-scale restriction. */
  largeCircuit?: boolean;
  /**
   * When true, skip the single-scale kill-switch. Use when domain `viewer`
   * already opted into electrodes (e.g. ERA campaign build).
   */
  allowSingleScale?: boolean;
}): boolean {
  if (!options.featureEnabled) return false;
  if (options.largeCircuit || options.allowSingleScale) return true;
  if (options.scale === CircuitScaleDictionary.Single) return false;
  return true;
}

/**
 * Compose the cell-hover kill-switch for {@link CircuitPreview}.
 *
 * Single-scale circuits are one neuron: highlighting it on hover flashes the
 * entire view and identifies nothing, so hover stays off there in every
 * scan-config host (build and simulate alike). Domain policy still wins — an
 * entity that already set `cellHover: false` is never turned back on.
 *
 * @param options.domainCellHover - Resolved `viewer.cellHover`; undefined → on
 * @param options.scale - Circuit scale when known
 */
export function resolveEnableCellHover(options: {
  domainCellHover?: boolean;
  scale?: TCircuitScaleDictionary;
}): boolean {
  if (options.domainCellHover === false) return false;
  return options.scale !== CircuitScaleDictionary.Single;
}

/** Whether the model is one morphology: an MEModel, or a single-neuron circuit. */
export function resolveSingleMorphology(model: {
  type?: string;
  scale?: TCircuitScaleDictionary;
}): boolean {
  if (model.type === EntityTypeDict.Memodel) return true;
  return model.type === EntityTypeDict.Circuit && model.scale === CircuitScaleDictionary.Single;
}

/**
 * The blocks a 3D pick may fill with morphology locations on this model, the one a new block
 * takes first; empty when none.
 *
 * The model says which blocks a pick can fill: an MEModel has no node ids, so only the plain
 * explicit block; a single-neuron circuit fills either; a circuit drawing several neurons only
 * the per-neuron block, since a bare section id means a different branch on every morphology.
 * The schema says which of those the workflow takes, so a block the backend would reject is
 * never created.
 */
export function resolveExplicitLocationsBlockTypes(
  model: { type?: string; scale?: TCircuitScaleDictionary },
  acceptedBlockTypes: readonly string[]
): TExplicitLocationsBlockType[] {
  const candidates = match(model)
    .returnType<TExplicitLocationsBlockType[]>()
    .with({ type: EntityTypeDict.Memodel }, () => [EXPLICIT_BLOCK_TYPE])
    .with({ type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single }, () => [
      EXPLICIT_BLOCK_TYPE,
      PER_NEURON_EXPLICIT_BLOCK_TYPE,
    ])
    .with(
      {
        type: EntityTypeDict.Circuit,
        scale: P.union(CircuitScaleDictionary.PairNeuron, CircuitScaleDictionary.SmallMicrocircuit),
      },
      () => [PER_NEURON_EXPLICIT_BLOCK_TYPE]
    )
    .otherwise(() => []);
  return candidates.filter((type) => acceptedBlockTypes.includes(type));
}
