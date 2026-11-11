import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';

/**
 * Whether to read a circuit's edge files and draw its afferent synapses.
 *
 * Single-scale circuits only, and the limit is cost rather than taste: putting a
 * synapse where the viewer draws it means one signed distance field per distinct
 * target cell and one query per synapse, all on the main thread. That is
 * affordable for a cell or two and nothing like affordable for the hundreds a
 * small microcircuit carries.
 *
 * A budget, so scale is a stand-in rather than the real question — the entity
 * states the budget directly in `number_neurons` / `number_synapses`, and a pair
 * circuit is excluded here only by the name of its scale.
 *
 * Everything else about the viewer is scale-independent — placement comes from
 * the SONATA file and morphologies from OBI-One at every scale that draws
 * neurites — so this is the only fork left.
 */
export function circuitDrawsSynapses(scale: TCircuitScaleDictionary): boolean {
  return scale === CircuitScaleDictionary.Single;
}
