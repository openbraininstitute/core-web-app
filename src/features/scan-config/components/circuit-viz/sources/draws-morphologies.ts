import {
  CircuitScaleDictionary,
  type ICircuit,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { storedPackOf } from '@/features/circuit-viewer/morphologies/use-circuit-morphologies';
import { circuitMorphologiesFlag, useFlag } from '@/features/feature-flags';

/**
 * Whether a circuit is drawn a morphology per cell, or by
 * `LargeCircuitPreview`: as somas, or as the morphologies of the circuit's
 * stored pack where `packMorphologies` (the `circuit-morphologies` flag) is on.
 * A pair or small circuit is drawn from its pack where it has one, else per cell.
 *
 * The cutoff is cost: the per-cell path reads every point of one morphology
 * per cell, which a microcircuit and everything above it has far too many of.
 * A single cell stays on it whatever the flag: picking a location on its
 * morphology needs the section ids, which the pack does not carry.
 *
 * One predicate rather than a scale list per caller: several places have to
 * agree on which renderer a circuit gets, and they must not drift apart.
 *
 * This answers for the circuit, not for each population. The small-circuit
 * renderer draws only biophysical populations with neurites, so a circuit can
 * pass here and still be mostly somas.
 */
export function circuitDrawsEachCell(
  circuit: Pick<ICircuit, 'scale' | 'assets'>,
  packMorphologies: boolean
): boolean {
  if (circuit.scale === CircuitScaleDictionary.Single) return true;
  return (
    circuitSmallForThePack(circuit.scale) &&
    (!packMorphologies || storedPackOf(circuit.assets) === null)
  );
}

/** {@link circuitDrawsEachCell} with the flag as it is. */
export function useCircuitDrawsEachCell(): (
  circuit: Pick<ICircuit, 'scale' | 'assets'>
) => boolean {
  const packMorphologies = !!useFlag(circuitMorphologiesFlag.key);
  return (circuit) => circuitDrawsEachCell(circuit, packMorphologies);
}

/** Pair and small circuits: on the pack, opened on its morphologies, and per cell where they have none or it cannot be had. */
export function circuitSmallForThePack(scale: TCircuitScaleDictionary): boolean {
  return (
    scale === CircuitScaleDictionary.PairNeuron ||
    scale === CircuitScaleDictionary.SmallMicrocircuit
  );
}
