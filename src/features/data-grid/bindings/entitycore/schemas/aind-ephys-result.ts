import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  descriptionColumn,
  nameColumn,
  registrationDateColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { SortDirection } from '@/features/data-grid/core';

import type { ITaskResult } from '@/api/entitycore/types/entities/task-result';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';

type Row = ITaskResult;

function aindEphysResultSchema(id: string): IGridSchema<Row> {
  return {
    id,
    getRowId: (row) => row.id,
    defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: SortDirection.Desc }],
    selection: { enabled: true },
    columns: [
      nameColumn<Row>({ id: EntityCoreFields.Name, essential: true }),
      descriptionColumn<Row>({ id: EntityCoreFields.Description }),
      registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate, essential: true }),
    ],
  };
}

export const aindEphysPreprocessingResultGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.AindEphysPreprocessingResult,
  schema: aindEphysResultSchema('aind-ephys-preprocessing-result'),
};

export const aindEphysSpikeSortingResultGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingResult,
  schema: aindEphysResultSchema('aind-ephys-spikesorting-result'),
};
