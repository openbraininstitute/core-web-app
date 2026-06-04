import { Select } from 'antd';

import {
  type Reference as ReferenceSchema,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';

import { useReferenceTypeDict } from '../hooks/schema';

import type { Config } from '@/features/scan-config/components/components';
import type { ConfigSchema } from '@/features/scan-config/types';

const DEFAULT_SENTINEL = '__default_as_null__';
const ALLOWED_BLOCK_TYPES = 'allowed_block_types';

/**
 * collects the set of block variant type names that are allowed by this reference field
 *
 * each reference field has an `anyOf` array where each item (except `{ type: "null" }`)
 * is a reference type schema that may carry an `allowed_block_types` list, e.g.:
 *
 *   { title: "BiophysicalNeuronSetReference", allowed_block_types: ["BiophysicalIDNeuronSet", "BiophysicalPopulationNeuronSet"] }
 *   { title: "PointNeuronSetReference",       allowed_block_types: ["PointIDNeuronSet", "PointPopulationNeuronSet"] }
 *
 * we collect all allowed block types into a single set so the dropdown can filter entries
 * if no `allowed_block_types` are found (older schema), returns null to skip filtering
 */
function collectAllowedBlockTypes(referenceSchema: ReferenceSchema): Set<string> | null {
  const anyOfItems = referenceSchema.anyOf;
  if (!anyOfItems || !Array.isArray(anyOfItems)) return null;

  const allowed = new Set<string>();
  let hasAny = false;

  for (const item of anyOfItems) {
    if (ALLOWED_BLOCK_TYPES in item && Array.isArray(item.allowed_block_types)) {
      hasAny = true;
      for (const blockType of item.allowed_block_types) {
        allowed.add(blockType);
      }
    }
  }

  return hasAny ? allowed : null;
}

export default function Reference({
  value,
  onChange,
  disabled,
  schema,
  referenceSchema,
  config,
}: {
  schema: ConfigSchema;
  referenceSchema: ReferenceSchema;
  config: Config;
  value: string | null;
  onChange: (block_name: string | null, block_dict_name: string | null) => void;
  disabled: boolean;
}) {
  const referenceTypeDict = useReferenceTypeDict(schema);

  // collect all matching dictionaries across all accepted reference types
  const matchingDicts: { configKey: string; singularName: string }[] = [];
  for (const refType of referenceSchema.reference_types) {
    const entries = referenceTypeDict[refType] ?? [];
    for (const entry of entries) {
      if (!matchingDicts.some((d) => d.configKey === entry.configKey)) {
        matchingDicts.push(entry);
      }
    }
  }

  // check visibility: at least one reference type must have a default label
  const hasDefaultLabel = referenceSchema.reference_types.some(
    (refType) => schema?.default_block_reference_labels?.[refType]
  );

  if (!schema || !hasDefaultLabel) return null;

  // collect the set of allowed block variant types from the anyOf schemas
  // e.g. for targeted_neuron_set: {"BiophysicalIDNeuronSet", "BiophysicalPopulationNeuronSet", "PointIDNeuronSet", "PointPopulationNeuronSet"}
  // if null, the schema doesn't provide allowed_block_types — skip filtering (backward compat)
  const allowedBlockTypes = collectAllowedBlockTypes(referenceSchema);

  // build dropdown options from all matching dictionaries
  const options: Array<{ label: string; value: string }> = [];
  // use the first configKey as the default for onChange (backward compat)
  const primaryConfigKey = matchingDicts[0]?.configKey ?? '';

  for (const dict of matchingDicts) {
    const entries = config[dict.configKey] ?? {};
    for (const [k, v] of Object.entries(entries)) {
      if (options.some((o) => o.value === k)) continue;

      // if the schema provides allowed_block_types, filter entries by their block variant type
      if (allowedBlockTypes && typeof v === 'object' && v !== null && 'type' in v) {
        const entryType = v.type as string;
        if (!allowedBlockTypes.has(entryType)) continue;
      }

      options.push({ label: k, value: k });
    }
  }

  // find the first available default label across accepted reference types
  const defaultLabel =
    referenceSchema.reference_types
      .map((refType) => schema.default_block_reference_labels?.[refType])
      .find(Boolean) ?? 'Default';

  options.unshift({
    label: defaultLabel,
    value: DEFAULT_SENTINEL,
  });

  // if the ai suggested a value that is not in the options, add it
  if (typeof value === 'string' && !options.map((o) => o.value).includes(value)) {
    options.push({
      label: value,
      value: value,
    });
  }

  // when user selects a value, find which dictionary it belongs to
  const findConfigKeyForValue = (selectedValue: string): string => {
    for (const dict of matchingDicts) {
      const entries = config[dict.configKey];
      if (entries && typeof entries === 'object' && selectedValue in entries) {
        return dict.configKey;
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
