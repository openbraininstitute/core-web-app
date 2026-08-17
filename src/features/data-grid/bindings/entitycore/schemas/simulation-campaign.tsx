import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import {
  campaignDescriptionColumn,
  campaignNameColumn,
  campaignRegistrationDateColumn,
  campaignStatusColumn,
  circuitNameColumn,
  type ICampaignRow,
  registerCampaignRenderers,
} from '@/features/data-grid/bindings/entitycore/schemas/campaign-common';
import { SortDirection } from '@/features/data-grid/core';

import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IColumnModel, IGridSchema } from '@/features/data-grid/core';

/**
 * Columns for the generic `simulation_campaign` dataType (Data → Simulations). Status
 * shows scan parameters as hover cards, so no expandable detail row is wired.
 */
const columns: Array<IColumnModel<ICampaignRow>> = [
  campaignNameColumn<ICampaignRow>(),
  campaignDescriptionColumn<ICampaignRow>(),
  circuitNameColumn<ICampaignRow>(),
  lifecycleStatusColumn<ICampaignRow>(),
  campaignRegistrationDateColumn<ICampaignRow>(),
  campaignStatusColumn<ICampaignRow>(),
];

const schema: IGridSchema<ICampaignRow> = {
  id: 'simulation-campaign',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  columns,
};

export const simulationCampaignGridDefinition: IEntityGridDefinition<ICampaignRow> = {
  dataType: ExtendedEntitiesTypeDict.SimulationCampaign,
  schema,
  registerCellRenderers: registerCampaignRenderers,
};
