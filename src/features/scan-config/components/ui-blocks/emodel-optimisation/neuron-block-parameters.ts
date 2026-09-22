import { z } from 'zod';

/**
 * Validation + extraction for an ion channel model's `neuron_block`.
 *
 * `global` and `range` are lists of single-key objects mapping a parameter name to its unit (or
 * `null` when unitless). Parameters Selection flattens both lists into one; the other blocks
 * (`useion`, `nonspecific`) are validated loosely — we only read `global`/`range`.
 */

/** One optimizable parameter drawn from `neuron_block.global` / `neuron_block.range`. */
export type TNeuronBlockParameter = {
  /** parameter name, e.g. `gKv3_2bar` */
  name: string;
  /** unit string, e.g. `S/cm2`, or `null` when unitless */
  unit: string | null;
  /** which block the parameter came from */
  source: 'global' | 'range';
};

const parameterEntrySchema = z.record(z.string(), z.string().nullable());

const neuronBlockSchema = z.object({
  global: z.array(parameterEntrySchema),
  range: z.array(parameterEntrySchema),
  useion: z.array(z.unknown()),
  nonspecific: z.array(z.unknown()),
});

/** flattens a list of single-key `{ name: unit }` entries into `{ name, unit, source }` records */
function flattenEntries(
  entries: Array<Record<string, string | null>>,
  source: 'global' | 'range'
): TNeuronBlockParameter[] {
  return entries.flatMap((entry) =>
    Object.entries(entry).map(([name, unit]) => ({ name, unit, source }))
  );
}

/**
 * Validates `model.neuron_block` and, when valid, returns the flat list of its `global` + `range`
 * parameters. Returns `null` when the block is missing or malformed, so callers can show the
 * "parameters not found" message.
 */
export function extractNeuronBlockParameters(neuronBlock: unknown): TNeuronBlockParameter[] | null {
  const result = neuronBlockSchema.safeParse(neuronBlock);
  if (!result.success) return null;

  return [
    ...flattenEntries(result.data.global, 'global'),
    ...flattenEntries(result.data.range, 'range'),
  ];
}
