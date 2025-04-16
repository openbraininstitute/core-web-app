import get from 'lodash/get';
import { FieldConfiguration as ExperimentalFieldsDefinition } from '@/entity-configuration/definitions/fields/experimental';
import { FieldConfiguration as CommonFieldsDefinition } from '@/entity-configuration/definitions/fields/common';

import type { CoreFieldDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { CoreFieldDefinition } from '@/entity-configuration/definitions/types';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreTypes } from '@/api/entitycore/types';

const CoreFieldsDefinitionRegistry: CoreFieldDefinitionRegistry<EntityCoreTypes> = {
  ...CommonFieldsDefinition,
  ...ExperimentalFieldsDefinition,
};

export default CoreFieldsDefinitionRegistry;

export function getCoreFieldDefinition<T extends EntityCoreIdentifiable = EntityCoreIdentifiable>(
  field: string
): CoreFieldDefinition<T> | null {
  return get(CoreFieldsDefinitionRegistry, field, null);
}
