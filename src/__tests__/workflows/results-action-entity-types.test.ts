import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityValues } from '@/ui/segments/workflows/config';
import {
  buildWorkflowActivityResultsHref,
  NotAllowedResultsActionEntityTypes,
  type TWorkflowActivityTableRow,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';

import type { TActivityValue } from '@/ui/segments/workflows/config';

const workspace = { virtualLabId: 'vlab', projectId: 'proj' };
const ROW_ID = '11111111-1111-1111-1111-111111111111';

const taskConfigRow: TWorkflowActivityTableRow = {
  id: ROW_ID,
  type: EntityTypeDict.TaskConfig,
  inputs: [{ id: 'source-entity' }],
};

const campaignRow: TWorkflowActivityTableRow = {
  id: ROW_ID,
  type: EntityTypeDict.SimulationCampaign,
  entity_id: 'source-entity',
};

const resultsHref = (
  activity: TActivityValue,
  listEntityType: (typeof ExtendedEntitiesTypeDict)[keyof typeof ExtendedEntitiesTypeDict],
  row: TWorkflowActivityTableRow
) => buildWorkflowActivityResultsHref({ activity, listEntityType, workspace, row });

describe('workflow activity "View results" action', () => {
  it.each([
    // the campaign's own results tab reads its task results, so no single result entity is needed
    [ExtendedEntitiesTypeDict.EFeatureExtractionCampaign, ActivityValues.Extract, 'extractions'],
    [ExtendedEntitiesTypeDict.CircuitExtractionCampaign, ActivityValues.Extract, 'extractions'],
    [
      ExtendedEntitiesTypeDict.SkeletonizationCampaign,
      ActivityValues['Process Data'],
      'skeletonizations',
    ],
    [ExtendedEntitiesTypeDict.EmSynapseMappingCampaign, ActivityValues.Build, 'results'],
    [ExtendedEntitiesTypeDict.BuildSynaptomeCampaign, ActivityValues.Build, 'results'],
    [ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign, ActivityValues.Build, 'results'],
  ])('opens %s on its own results tab', (entityType, activity, tab) => {
    const href = resultsHref(activity, entityType, taskConfigRow);

    expect(href).toContain(`tab=${tab}`);
    // the same editor URL "View configuration" opens, so the stored campaign form loads with it
    expect(href).toContain(`origin=${ROW_ID}`);
  });

  it.each([
    ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
    ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
    ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ])('opens simulation campaign %s on its simulations tab', (entityType) => {
    expect(resultsHref(ActivityValues.Simulate, entityType, campaignRow)).toContain(
      'tab=simulations'
    );
  });

  it('still uses the detail-view route for a type that resolves to one result entity', () => {
    const href = resultsHref(
      ActivityValues.Simulate,
      ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
      { id: ROW_ID, type: EntityTypeDict.SingleNeuronSynaptomeSimulation }
    );

    expect(href).toBe(
      `/app/virtual-lab/vlab/proj/workflows/view/single-neuron-synaptome-simulation/${ROW_ID}/results`
    );
  });

  it.each([
    // a build row that is not a scan-config campaign: its detail view is the model, not results
    [ExtendedEntitiesTypeDict.Memodel, EntityTypeDict.Memodel],
    [
      ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
      EntityTypeDict.IonChannelModelingCampaign,
    ],
  ])('has no results view for %s', (entityType, rowType) => {
    expect(resultsHref(ActivityValues.Build, entityType, { id: ROW_ID, type: rowType })).toBeNull();
  });

  it('keeps the detail-view route closed for the campaigns it cannot resolve', () => {
    // the scan-config editor covers these; the fallback route would 404
    for (const entityType of [
      ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
      ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    ]) {
      expect(NotAllowedResultsActionEntityTypes).toContain(entityType);
    }

    // a task-config row with no input entity cannot build the editor URL, so nothing opens
    expect(
      resultsHref(ActivityValues.Extract, ExtendedEntitiesTypeDict.EFeatureExtractionCampaign, {
        id: ROW_ID,
        type: EntityTypeDict.TaskConfig,
      })
    ).toBeNull();
  });
});
