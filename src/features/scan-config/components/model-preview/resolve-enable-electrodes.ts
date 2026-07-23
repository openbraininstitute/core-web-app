import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';

/**
 * Compose the electrode-overlays kill-switch for {@link CircuitPreview}.
 *
 * Hosts pass `featureEnabled` from the feature flag; this helper also enforces
 * the single-scale off rule (SONATA path not electrode-ready yet).
 *
 * Why a pure helper: keep flag + scale policy testable without mounting React.
 */
export function resolveEnableElectrodes(options: {
  /** Feature flag for interactive electrode overlays (`electrodeOverlaysFlag`). */
  featureEnabled: boolean;
  /** Circuit scale when known; singles stay off even if the flag is on. */
  scale?: TCircuitScaleDictionary;
  /** Large-circuit (somas-only) preview — no single-scale restriction. */
  largeCircuit?: boolean;
}): boolean {
  if (!options.featureEnabled) return false;
  if (options.largeCircuit) return true;
  if (options.scale === CircuitScaleDictionary.Single) return false;
  return true;
}
