import { Select } from 'antd';

import {
  type Reference as ReferenceSchema,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';

import {
  useAllowedBlockTypesByReferenceType,
  useBlockTypeToConfigKey,
  useReferenceTypeDict,
} from '../hooks/schema';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const DEFAULT_SENTINEL = '__default_as_null__';

/**
 * dropdown for picking another block as a reference (the `reference` ui_element)
 *
 * it resolves its options from the field's `reference_types` in two steps, both schema-driven:
 *
 * 1. which dictionaries can this field point at? a field reaches a dictionary either because
 *    that dictionary registers the reference type (`block_dictionary.reference_types`), or because
 *    the variants the reference type accepts live in it. The two are unioned.
 * 2. which entries are offered? each `reference_type` maps (via the schema's `allowed_block_types`)
 *    to the block variant `type`s it accepts; an entry is shown only if its `type` is in that set.
 *    if the reference types declare no `allowed_block_types`, no per-type filtering is applied.
 *
 * `reference_types` are reference-class names (e.g. `BiophysicalNeuronSetReference`), not entry
 * `type`s (e.g. `BiophysicalPopulationNeuronSet`); `allowed_block_types` is the bridge between them
 *
 * @param schema           the full scan-config schema (source of the reference/variant lookups)
 * @param referenceSchema  the field's own schema; only `reference_types` is read
 * @param config           the current config; dictionary entries become the dropdown options
 * @param value            the currently selected block name, or `null` for the default option
 * @param onChange         called with `(block_name, block_dict_name)` — both `null` for default
 * @param disabled         disables the select
 * @param omit             block names to hide (e.g. a combined set excluding itself)
 * @returns the select, or `null` when the field is hidden (no reference type has a default label)
 *
 * @example
 * // combined (Virtual): reference_types = ["VirtualNeuronSetReference"]
 * //   → allowed variants = Virtual* + VirtualCombinedNeuronSet + AllVirtualNeurons
 * //   → dropdown lists ONLY virtual neuron sets; biophysical/point ones are filtered out.
 *
 * @example
 * // combined (Any): reference_types = ["BiophysicalNeuronSetReference",
 * //                                    "VirtualNeuronSetReference", "PointNeuronSetReference"]
 * //   → allowed variants = the union of all three (incl. each *CombinedNeuronSet)
 * //   → lists every neuron set EXCEPT plain `PredefinedNeuronSet`/`CombinedNeuronSet`
 * //     (not in any list) and itself (passed via `omit`).
 *
 * @example
 * // timestamps field: reference_types = ["TimestampsReference"]
 * //   → allowed variants = ["SingleTimestamp", "RegularTimestamps"]
 * //   → lists entries from the `timestamps` dictionary only.
 *
 * @example
 * // distribution field: reference_types = ["AllDistributionsReference"]
 * //   → that reference type carries NO `allowed_block_types`
 * //   → no per-type filter; every entry in the `distributions` dictionary is listed.
 */
/**
 * whether a reference field is shown at all.
 *
 * a field is shown once the config says what it resolves to when left unset -- by role through
 * `reference_tag_defaults`, or by reference type through `default_block_reference_labels`.
 * either answer suffices, which is what lets a config drop the type-keyed map once every one of
 * its fields is tagged, while configs that tag nothing keep rendering exactly as before.
 *
 * the coupling itself is odd -- whether a field is *visible* has no reason to depend on whether
 * a default has been *named* -- and it is why a config that declared neither rendered its blocks
 * with no fields at all. widening it is the smallest step that does not change any config that
 * relies on the old behaviour.
 */
export function isReferenceFieldVisible(
  referenceSchema: Pick<ReferenceSchema, 'reference_types' | 'reference_tag'>,
  schema: Pick<ConfigSchema, 'default_block_reference_labels' | 'reference_tag_defaults'>
): boolean {
  if (
    referenceSchema.reference_tag &&
    schema.reference_tag_defaults?.[referenceSchema.reference_tag]
  ) {
    return true;
  }
  return referenceSchema.reference_types.some(
    (refType) => !!schema.default_block_reference_labels?.[refType]
  );
}

/**
 * the label for the dropdown's default option: what the field resolves to when left unset.
 *
 * a field that declares a `reference_tag` names the *role* it plays, and the config answers
 * per role through `reference_tag_defaults`. that is what the type-keyed
 * `default_block_reference_labels` cannot express: two fields of the same reference type
 * that mean different things -- a stimulus target and a recording target are both neuron set
 * references, and resolve to different neuron sets. the type-keyed map remains the fallback
 * for untagged fields, and it alone still decides whether a reference field is shown at all.
 */
export function resolveDefaultReferenceLabel(
  referenceSchema: Pick<ReferenceSchema, 'reference_types' | 'reference_tag'>,
  schema: Pick<ConfigSchema, 'default_block_reference_labels' | 'reference_tag_defaults'>
): string {
  // the tagged answer carries the block alongside its name; only the name is shown here, but
  // `schema.reference_tag_defaults[tag].block` is the distribution behind it, for a caller that
  // wants to render its values or materialise it rather than accept it unseen.
  const taggedLabel = referenceSchema.reference_tag
    ? schema.reference_tag_defaults?.[referenceSchema.reference_tag]?.name
    : undefined;

  return (
    taggedLabel ??
    referenceSchema.reference_types
      .map((refType) => schema.default_block_reference_labels?.[refType])
      .find(Boolean) ??
    'Default'
  );
}

export default function Reference({
  value,
  onChange,
  disabled,
  schema,
  referenceSchema,
  config,
  omit = [],
}: {
  schema: ConfigSchema;
  referenceSchema: ReferenceSchema;
  config: Config;
  value: string | null;
  onChange: (block_name: string | null, block_dict_name: string | null) => void;
  disabled: boolean;
  /** block names to exclude from the dropdown (e.g. a combined set excluding itself) */
  omit?: string[];
}) {
  const referenceTypeDict = useReferenceTypeDict(schema);
  const allowedByReferenceType = useAllowedBlockTypesByReferenceType(schema);
  const blockTypeToConfigKey = useBlockTypeToConfigKey(schema);

  // the block variant types this field accepts, derived from its `reference_types`: each declared
  // reference type maps (via the schema) to the set of variants it accepts. this is what narrows a
  // combined (virtual) field to virtual sets, etc. if no reference type carries `allowed_block_types`
  // (e.g. AllDistributionsReference), the set stays empty and no per-type filtering is applied.
  const allowedBlockTypes = new Set<string>();
  for (const refType of referenceSchema.reference_types) {
    for (const t of allowedByReferenceType[refType] ?? []) allowedBlockTypes.add(t);
  }

  // resolve which dictionaries (config keys) this field can reference. a Set dedups for free.
  const matchingConfigKeys = new Set<string>();

  // a dictionary registers the reference types it answers to (`block_dictionary.reference_types`).
  for (const refType of referenceSchema.reference_types) {
    for (const entry of referenceTypeDict[refType] ?? []) matchingConfigKeys.add(entry.configKey);
  }

  // also resolve from the accepted block variants — each maps to the dictionary that defines it.
  // this is how a field reaches `neuron_sets`: it declares "VirtualNeuronSetReference" etc., which
  // the dictionary doesn't register directly (it registers the single "NeuronSetReference"), but the
  // variants those reference types accept all live in `neuron_sets`. unioned with the above so a
  // field that accepts both (e.g. neuron sets and timestamps) resolves to every dictionary it can.
  for (const blockType of allowedBlockTypes) {
    const configKey = blockTypeToConfigKey[blockType];
    if (configKey) matchingConfigKeys.add(configKey);
  }

  if (!schema || !isReferenceFieldVisible(referenceSchema, schema)) return null;

  // build dropdown options from all matching dictionaries
  const options: Array<{ label: string; value: string }> = [];
  // use the first configKey as the default for onChange (backward compat)
  const primaryConfigKey = matchingConfigKeys.values().next().value ?? '';

  for (const configKey of matchingConfigKeys) {
    const entries = config[configKey] ?? {};
    for (const [k, v] of Object.entries(entries)) {
      if (options.some((o) => o.value === k)) continue;
      if (omit.includes(k)) continue;

      // narrow to the variants this field's `reference_types` accept (e.g. virtual-only). only
      // applies when those reference types declare accepted variants; otherwise show all entries.
      if (allowedBlockTypes.size > 0 && typeof v === 'object' && v !== null && 'type' in v) {
        if (!allowedBlockTypes.has(v.type as string)) continue;
      }

      options.push({ label: k, value: k });
    }
  }

  const defaultLabel = resolveDefaultReferenceLabel(referenceSchema, schema);

  options.unshift({
    label: defaultLabel,
    value: DEFAULT_SENTINEL,
  });

  // if the ai suggested a value that is not in the options, add it
  if (typeof value === 'string' && !options.some((o) => o.value === value)) {
    options.push({
      label: value,
      value: value,
    });
  }

  // when user selects a value, find which dictionary it belongs to
  const findConfigKeyForValue = (selectedValue: string): string => {
    for (const configKey of matchingConfigKeys) {
      const entries = config[configKey];
      if (entries && typeof entries === 'object' && selectedValue in entries) {
        return configKey;
      }
    }
    return primaryConfigKey;
  };

  return (
    <Select
      data-scan-config-block-element={ScanConfigUIElementDict.Reference}
      className="w-full"
      disabled={disabled}
      onChange={(newV: string) =>
        onChange(
          newV === DEFAULT_SENTINEL ? null : newV,
          newV === DEFAULT_SENTINEL ? null : findConfigKeyForValue(newV)
        )
      }
      value={value ?? DEFAULT_SENTINEL}
      options={options}
    />
  );
}
