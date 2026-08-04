/** label shown for a reference the user has not set, when the schema names no default */
export const FALLBACK_DEFAULT_REFERENCE_LABEL = 'Default';

type ReferenceFieldSchema = {
  /** the role this field plays, e.g. `stimulus_target` */
  reference_tag?: string;
  /** the reference classes this field accepts, e.g. `PointNeuronSetReference` */
  reference_types: Array<string>;
};

type DefaultsSchema = {
  /** default block name per role; the precise answer, absent on older schemas */
  reference_tag_defaults?: Record<string, string>;
  /** default block name per reference type; also declares which types a config supports */
  default_block_reference_labels?: Record<string, string>;
};

/**
 * the name of the block the backend resolves a reference field to when it is left unset.
 *
 * prefers the field's role (`reference_tag`) over its reference type, because a type can be
 * shared by fields that mean different things: in a Brian2 simulation an untargeted stimulus
 * drives the `sugar` node set while the simulation itself runs every point neuron, and both
 * fields are `PointNeuronSetReference`. keyed by type the schema can only carry one of those
 * answers; keyed by role it carries both.
 *
 * falls back to the by-type labels so schemas published before the tags existed still show a
 * sensible label, then to a generic one.
 */
export function resolveDefaultReferenceLabel(
  referenceSchema: ReferenceFieldSchema,
  schema: DefaultsSchema
): string {
  const byTag = referenceSchema.reference_tag
    ? schema.reference_tag_defaults?.[referenceSchema.reference_tag]
    : undefined;
  if (byTag) return byTag;

  const byType = referenceSchema.reference_types
    .map((referenceType) => schema.default_block_reference_labels?.[referenceType])
    .find(Boolean);

  return byType ?? FALLBACK_DEFAULT_REFERENCE_LABEL;
}
