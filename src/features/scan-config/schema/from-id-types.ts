/**
 * maps ObiOne scan-config `*FromID` schema discriminators to extended entity types
 *
 * schemas reference model inputs with string consts such as `MEModelFromID`.
 * this module is the single place those values are translated into entity types
 * used by browse tables and workflow selection ({@link parseInitializeSelection})
 *
 * maintain mappings in {@link fromIdTypeToExtendedEntityType} only; the reverse
 * map is derived automatically.
 */

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * ObiOne `*FromID` discriminator values used in scan-config JSON schemas
 *
 * these appear as `const` strings on model identifier fields under `initialize`
 */
export const FromIdTypeDict = {
  CellMorphologyFromID: 'CellMorphologyFromID',
  MEModelFromID: 'MEModelFromID',
  CircuitFromID: 'CircuitFromID',
  EMCellMeshFromID: 'EMCellMeshFromID',
  MEModelWithSynapsesCircuitFromID: 'MEModelWithSynapsesCircuitFromID',
} as const;

/** union of known ObiOne from-id discriminator strings */
export type TFromIdType = (typeof FromIdTypeDict)[keyof typeof FromIdTypeDict];

/**
 * canonical from-id → entity type mapping
 *
 * add new schema/model pairs here; {@link extendedEntityTypeToFromIdType} is built
 * from this object at module load time
 */
export const fromIdTypeToExtendedEntityType = {
  [FromIdTypeDict.CellMorphologyFromID]: ExtendedEntitiesTypeDict.UniversalCellMorphology,
  [FromIdTypeDict.MEModelFromID]: ExtendedEntitiesTypeDict.Memodel,
  [FromIdTypeDict.CircuitFromID]: ExtendedEntitiesTypeDict.Circuit,
  [FromIdTypeDict.EMCellMeshFromID]: ExtendedEntitiesTypeDict.EMCellMesh,
  [FromIdTypeDict.MEModelWithSynapsesCircuitFromID]: ExtendedEntitiesTypeDict.MEModelWithSynapses,
} as const satisfies Record<TFromIdType, TExtendedEntitiesTypeDict>;

/**
 * entity type → from-id discriminator (inverse of {@link fromIdTypeToExtendedEntityType})
 *
 * only contains entries present in the forward map; not every extended entity type
 * has a corresponding ObiOne from-id type
 */
export const extendedEntityTypeToFromIdType = Object.fromEntries(
  Object.entries(fromIdTypeToExtendedEntityType).map(([fromIdType, entityType]) => [
    entityType,
    fromIdType,
  ])
) as Record<(typeof fromIdTypeToExtendedEntityType)[TFromIdType], TFromIdType>;

/**
 * converts schema from-id strings into extended entity types for browse UI
 *
 * unknown strings are skipped. duplicate entity types in the input are deduplicated
 * while preserving first-seen order
 *
 * @param fromIdTypes: raw discriminator strings from a schema model field
 *   (`accepted_input_types` or embedded `const` values)
 * @returns mapped extended entity types; may be empty when none are recognized
 *
 * @example
 * ```ts
 * const types = mapFromIdTypesToExtendedEntityTypes([
 *   'MEModelFromID',
 *   'UnknownFromID',
 *   'MEModelFromID',
 * ]);
 * // [ExtendedEntitiesTypeDict.Memodel]
 * ```
 */
export function mapFromIdTypesToExtendedEntityTypes(
  fromIdTypes: readonly string[]
): TExtendedEntitiesTypeDict[] {
  const mapped: TExtendedEntitiesTypeDict[] = [];

  for (const fromIdType of fromIdTypes) {
    if (!isKnownFromIdType(fromIdType)) {
      continue;
    }

    const entityType = fromIdTypeToExtendedEntityType[fromIdType];
    if (!mapped.includes(entityType)) {
      mapped.push(entityType);
    }
  }

  return mapped;
}

/**
 * type guard for ObiOne from-id discriminator strings defined in {@link FromIdTypeDict}
 *
 * @param value: arbitrary string from schema parsing
 * @returns `true` when `value` is a supported {@link TFromIdType}
 */
export function isKnownFromIdType(value: string): value is TFromIdType {
  return Object.values(FromIdTypeDict).includes(value as TFromIdType);
}
