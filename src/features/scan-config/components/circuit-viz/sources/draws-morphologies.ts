import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';

/**
 * Whether a circuit is drawn as neurites, or as a cloud of soma spheres.
 *
 * The cutoff is cost: `MorphoViewerSmallCircuit` fetches and tessellates one
 * morphology per cell, which a microcircuit and everything above it has far too
 * many of. Those go to `LargeCircuitPreview`, which draws each cell as a point.
 *
 * One predicate rather than a scale list per caller: several places have to
 * agree on which renderer a circuit gets, and they must not drift apart.
 */
export function circuitDrawsMorphologies(scale: TCircuitScaleDictionary): boolean {
  return (
    scale === CircuitScaleDictionary.Single ||
    scale === CircuitScaleDictionary.PairNeuron ||
    scale === CircuitScaleDictionary.SmallMicrocircuit
  );
}
