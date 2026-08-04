import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { SortDirection } from '../../../core';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import {
  campaignDescriptionColumn,
  campaignNameColumn,
  campaignRegistrationDateColumn,
  campaignStatusColumn,
  circuitNameColumn,
  type ICampaignRow,
  registerCampaignRenderers,
} from './campaign-common';

import type { IColumnModel, IGridSchema } from '../../../core';
import type { IEntityGridDefinition } from '../registry';

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
