import { z } from 'zod';

/**
 * Validation + extraction for an ion channel model's `neuron_block`.
 *
 * `global` and `range` are lists of single-key objects mapping a parameter name to its unit (or
 * `null` when unitless). Only `range` is listed: GLOBAL variables can't be set per region.
 */

/** One optimizable parameter drawn from `neuron_block.range`. */
export type TNeuronBlockParameter = {
  /** parameter name, e.g. `gKv3_2bar` */
  name: string;
  /** unit string, e.g. `S/cm2`, or `null` when unitless */
  unit: string | null;
};

const parameterEntrySchema = z.record(z.string(), z.string().nullable());

const neuronBlockSchema = z.object({
  global: z.array(parameterEntrySchema),
  range: z.array(parameterEntrySchema),
  useion: z.array(z.unknown()),
  nonspecific: z.array(z.unknown()),
});

/**
 * flattens a list of single-key `{ name: unit }` entries into `{ name, unit }` records, suffixing
 * each bare NMODL name with the model's `nmodl_suffix` (e.g. `gkv_6_2bar` -> `gkv_6_2bar_kv_6_2`).
 *
 * `neuron_block.range` holds the variable's bare name as it appears inside the mod file itself —
 * no suffix needed there, since the file only ever describes its own mechanism. Everywhere else
 * (BluePyEModel's optimisation output, `obione-emodeloptimizationvariables-getall`) the same
 * variable is addressed by its qualified NEURON name, suffix included: see ObiOne's
 * `_create_mechanism_variable_from_ion_channel` (`obi_one/scientific/library/emodel_parameters.py`),
 * which builds `f"{var_name}_{suffix}"` from the same two inputs. `MechanismRegionSelection.parameters`
 * is a bare `dict[str, ...]` with no key-format check, so writing the bare name here instead of the
 * qualified one doesn't fail validation — it just never matches what the AI agent (or anything else
 * going through the qualified name) writes, leaving the checkbox silently unchecked.
 */
function flattenEntries(
  entries: Array<Record<string, string | null>>,
  nmodlSuffix: string
): TNeuronBlockParameter[] {
  return entries.flatMap((entry) =>
    Object.entries(entry).map(([name, unit]) => ({ name: `${name}_${nmodlSuffix}`, unit }))
  );
}

/**
 * Validates `model.neuron_block` and, when valid, returns the flat list of its `range`
 * parameters, each name qualified with `nmodlSuffix`. Returns `null` when the block is missing or
 * malformed, so callers can show the "parameters not found" message.
 */
export function extractNeuronBlockParameters(
  neuronBlock: unknown,
  nmodlSuffix: string
): TNeuronBlockParameter[] | null {
  const result = neuronBlockSchema.safeParse(neuronBlock);
  if (!result.success) return null;

  return flattenEntries(result.data.range, nmodlSuffix);
}
