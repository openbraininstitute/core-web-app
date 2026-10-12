import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  descriptionColumn,
  nameColumn,
  registrationDateColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import {
  EMODEL_OPTIMIZATION_STATUS_RENDERER,
  EModelOptimizationCampaignStatusCell,
} from '@/features/data-grid/bindings/entitycore/renderers/emodel-optimization-status-cell';
import { Align, mergeColumnDef, SortDirection } from '@/features/data-grid/core';

import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IColumnModel, IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

type Row = ITaskConfig<Record<string, unknown>> & { id: string };

/**
 * Aggregated run status for an e-model optimisation campaign. Display-only, rendered by
 * {@link EModelOptimizationCampaignStatusCell} off the campaign's own task-activity status.
 */
function statusColumn(): IColumnModel<Row> {
  return mergeColumnDef<Row>({
    id: 'status',
    header: 'Status',
    align: Align.Center,
    getValue: () => '',
    cellRenderer: EMODEL_OPTIMIZATION_STATUS_RENDERER,
    width: { width: 120, minWidth: 100 },
  });
}

/**
 * E-model optimisation campaigns (`GET /task-config`, narrowed to the e-model optimisation
 * campaign type by the entity's own `list`). `TaskConfigRead` carries name, description and
 * creation date; the aggregated run status is not a column on the entity but is resolved from
 * its task activities, so it uses a dedicated status renderer rather than the simulation one.
 */
export const emodelOptimizationCampaignSchema: IGridSchema<Row> = {
  id: 'emodel-optimization-campaign',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: SortDirection.Desc }],
  selection: { enabled: true },
  columns: [
    nameColumn<Row>({ id: EntityCoreFields.Name, essential: true }),
    descriptionColumn<Row>({ id: EntityCoreFields.Description }),
    registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate, essential: true }),
    statusColumn(),
  ],
};

export const emodelOptimizationCampaignGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.EModelOptimizationCampaign,
  schema: emodelOptimizationCampaignSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registry.register(EMODEL_OPTIMIZATION_STATUS_RENDERER, EModelOptimizationCampaignStatusCell);
  },
};
