import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

const taskResultView = {
  group: DataTypeGroup.ExperimentalData,
  // a task result has no brain region or species of its own
  columns: [EntityCoreFields.Name, EntityCoreFields.Description, EntityCoreFields.RegistrationDate],
  summaryViewFields: [
    { field: EntityCoreFields.Description },
    { field: EntityCoreFields.RegistrationDate },
  ],
  miniDetailView: [
    { field: EntityCoreFields.Description },
    { field: EntityCoreFields.RegistrationDate },
  ],
};

export const viewDefForAindEphysPreprocessingResult: ViewDefinitionConfig = {
  ...taskResultView,
  title: 'Preprocessed extracellular recording',
  name: EntitySlug.AindEphysPreprocessingResult,
};

export const viewDefForAindEphysSpikeSortingResult: ViewDefinitionConfig = {
  ...taskResultView,
  title: 'Sorted spikes',
  name: EntitySlug.AindEphysSpikeSortingResult,
};
