import { isPlainObject } from '@/features/scan-config/components/utils';
import { isType, ScanConfigUIElementDict } from '@/features/scan-config/types';

import type {
  Config,
  ConfigObject,
  ConfigSchema,
  ConfigValue,
  TBlock,
} from '@/features/scan-config/types';

export type ResolvedNeuronSet = {
  /** referenced neuron-set block key; null means the default target */
  key: string | null;
  /** resolved neuron-set block config sent to the endpoint; null means default or missing */
  value: ConfigValue | null;
  /** stable identity for the targeted neuron-set content */
  signature: string;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function referenceMatchesDeletedBlock(
  value: unknown,
  deletedBlockDictionaryName: string,
  deletedBlockName: string
) {
  if (
    !isPlainObject(value) ||
    value.block_name !== deletedBlockName ||
    (typeof value.block_dict_name === 'string' &&
      value.block_dict_name !== deletedBlockDictionaryName)
  ) {
    return false;
  }

  return true;
}

function findMatchingBlock(blocks: TBlock[] | undefined, state: ConfigObject): TBlock | null {
  if (!blocks) return null;
  const stateType = state.type;
  return (
    blocks.find((block) => {
      const typeSchema = block.properties?.type;
      return isPlainObject(typeSchema) && typeSchema.const === stateType;
    }) ?? null
  );
}

function getBlockSchemaForState(
  rootSchema: ConfigSchema['properties'][string] | undefined,
  state: ConfigObject
): TBlock | null {
  if (!rootSchema) return null;

  if (rootSchema.ui_element === ScanConfigUIElementDict.BlockDictionary) {
    return findMatchingBlock(rootSchema.additionalProperties?.oneOf, state);
  }

  if (rootSchema.ui_element === ScanConfigUIElementDict.BlockUnion) {
    return findMatchingBlock(rootSchema.oneOf, state);
  }

  return rootSchema;
}

function getDependentManipulationFields(blockSchema: TBlock | null, sourceField: string) {
  if (!blockSchema?.properties) return [];

  return Object.entries(blockSchema.properties)
    .filter(([, fieldSchema]) => {
      if (isType(fieldSchema)) return false;
      if (!isPlainObject(fieldSchema)) return false;
      if (fieldSchema.property_source_field !== sourceField) return false;
      return (
        fieldSchema.ui_element === ScanConfigUIElementDict.IonChannelVariableModificationByNeuron ||
        fieldSchema.ui_element ===
          ScanConfigUIElementDict.ionChannelVariableModificationBySectionList
      );
    })
    .map(([fieldKey]) => fieldKey);
}

function clearSourceReferenceAndDependents({
  state,
  blockSchema,
  rootKey,
  sourceField,
}: {
  state: ConfigObject;
  blockSchema: TBlock | null;
  rootKey: string;
  sourceField: string;
}) {
  if (rootKey === 'initialize') {
    state[sourceField] = null;
  } else {
    delete state[sourceField];
  }

  for (const dependentField of getDependentManipulationFields(blockSchema, sourceField)) {
    if (dependentField in state) {
      state[dependentField] = null;
    }
  }
}

function clearDeletedReferencesInState({
  state,
  blockSchema,
  rootKey,
  deletedBlockDictionaryName,
  deletedBlockName,
}: {
  state: ConfigObject;
  blockSchema: TBlock | null;
  rootKey: string;
  deletedBlockDictionaryName: string;
  deletedBlockName: string;
}) {
  for (const [fieldKey, fieldValue] of Object.entries(state)) {
    if (!referenceMatchesDeletedBlock(fieldValue, deletedBlockDictionaryName, deletedBlockName)) {
      continue;
    }

    clearSourceReferenceAndDependents({
      state,
      blockSchema,
      rootKey,
      sourceField: fieldKey,
    });
  }
}

/**
 * resolves a reference value (`{ block_name, block_dict_name }`) to the concrete
 * neuron-set block config it points at
 * the stable signature changes when either the selected block name or the selected block's contents change.
 */
export function resolveNeuronSet(
  config: Config,
  reference: ConfigValue | undefined
): ResolvedNeuronSet {
  if (
    !isPlainObject(reference) ||
    typeof reference.block_name !== 'string' ||
    typeof reference.block_dict_name !== 'string'
  ) {
    return {
      key: null,
      value: null,
      signature: stableStringify({ key: null, value: null }),
    };
  }

  const dictionary = config[reference.block_dict_name];
  const value = isPlainObject(dictionary) ? (dictionary[reference.block_name] ?? null) : null;

  return {
    key: reference.block_name,
    value,
    signature: stableStringify({ key: reference.block_name, value }),
  };
}

/**
 * removes references to a deleted block dictionary entry and clears circuit
 * manipulation fields that depend on those references.
 */
export function clearDeletedBlockReferences(
  config: Config,
  schema: Pick<ConfigSchema, 'properties'>,
  deletedBlockDictionaryName: string,
  deletedBlockName: string
): Config {
  const nextConfig = structuredClone(config);

  for (const [rootKey, rootValue] of Object.entries(nextConfig)) {
    if (!isPlainObject(rootValue)) continue;

    const rootSchema = schema.properties[rootKey];

    if (rootSchema?.ui_element === ScanConfigUIElementDict.BlockDictionary) {
      for (const entryValue of Object.values(rootValue)) {
        if (!isPlainObject(entryValue)) continue;
        clearDeletedReferencesInState({
          state: entryValue,
          blockSchema: getBlockSchemaForState(rootSchema, entryValue),
          rootKey,
          deletedBlockDictionaryName,
          deletedBlockName,
        });
      }
      continue;
    }

    clearDeletedReferencesInState({
      state: rootValue,
      blockSchema: getBlockSchemaForState(rootSchema, rootValue),
      rootKey,
      deletedBlockDictionaryName,
      deletedBlockName,
    });
  }

  return nextConfig;
}
