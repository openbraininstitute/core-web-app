import { useState } from 'react';

import {
  CircuitScaleDictionary,
  type ICircuit,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { useMorphologyPackStatus } from '@/features/circuit-viewer/morphologies/use-morphology-pack-status';
import { circuitMorphologiesFlag, useFlag } from '@/features/feature-flags';

import type { MorphologyPackStatus } from '@/api/small-scale-simulator/circuit/morphology-pack';

/**
 * Whether a circuit is drawn a morphology per cell, or by
 * `LargeCircuitPreview`: as somas, or as the morphologies of the circuit's
 * pack where `packMorphologies` (the `circuit-morphologies` flag) is on.
 * A pair or small circuit is drawn from its pack where Bluenaas has it ready,
 * else per cell; `undefined` while Bluenaas has not answered (`pack`).
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
  circuit: Pick<ICircuit, 'scale'>,
  packMorphologies: boolean,
  pack: MorphologyPackStatus | null | undefined
): boolean | undefined {
  if (circuit.scale === CircuitScaleDictionary.Single) return true;
  if (!circuitSmallForThePack(circuit.scale)) return false;
  if (!packMorphologies) return true;
  return pack === undefined ? undefined : pack?.state !== 'ready';
}

/**
 * {@link circuitDrawsEachCell} with the flag and the pack as they are, kept once answered for as long as the circuit is
 * on show: the renderer is not swapped under the user when the pack turns ready.
 */
export function useCircuitDrawsEachCell(
  circuit: Pick<ICircuit, 'id' | 'scale'> | undefined
): boolean | undefined {
  const packMorphologies = !!useFlag(circuitMorphologiesFlag.key);
  const small = circuit !== undefined && circuitSmallForThePack(circuit.scale);
  const pack = useMorphologyPackStatus(small ? circuit : undefined);
  const answer = circuit && circuitDrawsEachCell(circuit, packMorphologies, small ? pack : null);
  const [kept, setKept] = useState<{ id: string; drawsEachCell: boolean } | null>(null);
  if (circuit && kept?.id === circuit.id) return kept.drawsEachCell;
  if (circuit && answer !== undefined) setKept({ id: circuit.id, drawsEachCell: answer });
  return answer;
}

/** Pair and small circuits: on the pack, opened on its morphologies, and per cell where they have none or it cannot be had. */
export function circuitSmallForThePack(scale: TCircuitScaleDictionary): boolean {
  return (
    scale === CircuitScaleDictionary.PairNeuron ||
    scale === CircuitScaleDictionary.SmallMicrocircuit
  );
}
