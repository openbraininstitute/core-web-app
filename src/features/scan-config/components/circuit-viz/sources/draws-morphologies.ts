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
 *
 * This answers for the circuit, not for each population. The small-circuit
 * renderer draws only biophysical populations with neurites, so a circuit can
 * pass here and still be mostly somas.
 */
export function circuitDrawsMorphologies(scale: TCircuitScaleDictionary): boolean {
  return (
    scale === CircuitScaleDictionary.Single ||
    scale === CircuitScaleDictionary.PairNeuron ||
    scale === CircuitScaleDictionary.SmallMicrocircuit
  );
}

/**
 * Whether a circuit drawn as a cloud of somas can be switched to its
 * morphologies, which another engine draws from a pack OBI-One builds.
 *
 * Only where that engine draws everything on show. It has neither spikes nor
 * electrodes yet, so with either in the scene the cells stay somas. Whether
 * OBI-One will build the pack is known only once it is asked for.
 */
export function circuitOffersMorphologies(scene: {
  enabled: boolean;
  /** Not a scale {@link circuitDrawsMorphologies} holds for. */
  largeCircuit: boolean;
  spikes: boolean;
  electrodes: boolean;
}): boolean {
  return scene.enabled && scene.largeCircuit && !scene.spikes && !scene.electrodes;
}
