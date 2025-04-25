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

export function getFieldDefinition<T extends EntityCoreIdentifiable>(
  field: string
): FieldDefinition<T> | null {
  return get(FieldsDefinitionRegistry, field, null) as FieldDefinition<T> | null;
}

export function getFieldsDefinition(fields: Array<EntityCoreFields>) {
  return pick(FieldsDefinitionRegistry, fields);
}
