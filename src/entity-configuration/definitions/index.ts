import pick from 'lodash/pick';
import get from 'lodash/get';

import { FieldsDefinition as ExperimentalFieldsDefinition } from '@/entity-configuration/definitions/fields-defs/experimental';
import { FieldsDefinition as CommonFieldsDefinition } from '@/entity-configuration/definitions/fields-defs/common';
import { FieldsDefinition as ModelFieldsDefinition } from '@/entity-configuration/definitions/fields-defs/model';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { FieldDefinition } from '@/entity-configuration/definitions/types';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

const FieldsDefinitionRegistry: FieldsDefinitionRegistry<EntityCoreObjectTypes> = {
  ...CommonFieldsDefinition,
  ...ExperimentalFieldsDefinition,
  ...ModelFieldsDefinition,
};

export default FieldsDefinitionRegistry;

/**
 * Retrieves the field definition for a given field from the FieldsDefinitionRegistry.
 *
 * @template F - The type of the field, extending `EntityCoreFields`.
 * @template T - The type of the entity, extending `EntityCoreIdentifiable`.
 * @param field - The field for which the definition is to be retrieved.
 * @returns The field definition of type `FieldDefinition<T>` if found, otherwise `null`.
 */
export function getFieldDefinition<F extends EntityCoreFields, T extends EntityCoreIdentifiable>(
  field: F
): FieldDefinition<T> | null {
  return get(FieldsDefinitionRegistry, field, null) as FieldDefinition<T> | null;
}

/**
 * Retrieves a subset of field definitions from the `FieldsDefinitionRegistry` based on the provided array of field names.
 *
 * @template T - A tuple of field names extending `EntityCoreFields[]`.
 * @param fields - An array of field names to pick from the `FieldsDefinitionRegistry`.
 * @returns An object containing the selected field definitions from the `FieldsDefinitionRegistry`.
 */
export function getFieldsDefinition<T extends EntityCoreFields[]>(
  fields: [...T]
): Pick<typeof FieldsDefinitionRegistry, T[number]> {
  return pick(FieldsDefinitionRegistry, fields);
}
