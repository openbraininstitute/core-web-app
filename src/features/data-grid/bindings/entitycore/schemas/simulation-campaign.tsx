import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { SortDirection } from '../../../core';
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
 * Grid schema for the generic `simulation_campaign` dataType (Data → Simulations).
 *
 * Mirrors `circuit-simulations.ts` / `campaign-common.tsx` but is authored directly
 * against the legacy view-def column set (`view-defs/simulation/simulation-campaign.ts`):
 *
 *   Name, Description, Circuit, Registration date, Status
 *
 * The Status column uses the shared campaign status renderer (badge + hover cards of
 * the campaign's scan-parameter sets) — the popover is the DEFAULT, so NO full-width
 * expandable detail row is wired (unlike the legacy antd nested table). Column order
 * is the parity contract locked by `__tests__/campaign-parity.test.ts`.
 */
const columns: Array<IColumnModel<ICampaignRow>> = [
  campaignNameColumn<ICampaignRow>(),
  campaignDescriptionColumn<ICampaignRow>(),
  circuitNameColumn<ICampaignRow>(),
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
