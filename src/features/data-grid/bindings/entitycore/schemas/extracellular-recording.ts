import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import {
  brainRegionColumn,
  contributionsColumn,
  nameColumn,
  registrationDateColumn,
  speciesColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { SortDirection } from '@/features/data-grid/core';

import type { IExtracellularRecording } from '@/api/entitycore/types/entities/extracellular-recording';
import type {
  IHasContributions,
  IHasSpecies,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';

type Row = IExtracellularRecording & IHasSpecies & IHasContributions;

export const extracellularRecordingSchema: IGridSchema<Row> = {
  id: 'extracellular-recording',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  selection: { enabled: true },
  columns: [
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    nameColumn<Row>({ essential: true, width: { resizable: true, width: 200, minWidth: 150 } }),
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>({ essential: true }),
  ],
};

export const extracellularRecordingGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ExtracellularRecording,
  schema: extracellularRecordingSchema,
};
