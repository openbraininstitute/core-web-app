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
 * One predicate rather than a scale list per caller, because more than the
 * choice of renderer follows from it — a spike replay can only light up cells
 * the viewer draws individually, so it is offered on exactly these scales too.
 */
export function circuitDrawsMorphologies(scale: TCircuitScaleDictionary): boolean {
  return (
    scale === CircuitScaleDictionary.Single ||
    scale === CircuitScaleDictionary.PairNeuron ||
    scale === CircuitScaleDictionary.SmallMicrocircuit
  );
}
