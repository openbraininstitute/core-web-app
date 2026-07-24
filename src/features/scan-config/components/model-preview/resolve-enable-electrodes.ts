import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';

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
