import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import {
  buildWorkflowActivityConfigurationHref,
  buildWorkflowActivityDuplicateHref,
  canDuplicateWorkflowActivityRow,
  resolveWorkflowActivityConfigureRequest,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';

import type { TWorkflowActivityTableRow } from '@/ui/segments/workflows/elements/workflow-activity-actions';

const workspace = { virtualLabId: 'virtual-lab-id', projectId: 'project-id' };

const extractionTaskConfigRow = {
  id: 'task-config-id',
  type: EntityTypeDict.TaskConfig,
  inputs: [{ id: 'circuit-id', type: EntityTypeDict.Circuit }],
} satisfies TWorkflowActivityTableRow;

const skeletonizationCampaignRow = {
  id: 'skeletonization-campaign-id',
  type: EntityTypeDict.TaskConfig,
  inputs: [{ id: 'em-cell-mesh-id', type: EntityTypeDict.EMCellMesh }],
} satisfies TWorkflowActivityTableRow;

const simulationCampaignRow = {
  id: 'simulation-campaign-id',
  type: EntityTypeDict.SimulationCampaign,
  entity_id: 'circuit-id',
} satisfies TWorkflowActivityTableRow;

describe('scan-config workflow activity actions', () => {
  it('resolves View configuration requests for scan-config task config rows', () => {
    expect(
      resolveWorkflowActivityConfigureRequest({
        activity: WorkflowActivityDictValue.extract,
        listEntityType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
        row: extractionTaskConfigRow,
      })
    ).toEqual({
      activity: WorkflowActivityDictValue.extract,
      targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      entityId: 'circuit-id',
      entityType: ExtendedEntitiesTypeDict.Circuit,
    });
  });

  it('builds View configuration hrefs with origin query and a fresh configure session', () => {
    const href = buildWorkflowActivityConfigurationHref({
      activity: WorkflowActivityDictValue.extract,
      listEntityType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      workspace,
      row: extractionTaskConfigRow,
    });

    expect(href).toMatch(
      /^\/\/virtual-lab-id\/project-id\/workflows\/extract\/configure\/circuit-extraction-campaign\/wf_[a-z0-9]{10}\?origin=task-config-id$/
    );
  });

  it('builds Duplicate hrefs for process scan-config rows using origin campaign form', () => {
    const href = buildWorkflowActivityDuplicateHref({
      activity: WorkflowActivityDictValue.process,
      listEntityType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
      workspace,
      row: skeletonizationCampaignRow,
      query: { source: 'activity-table' },
    });

    expect(href).toMatch(
      /^\/\/virtual-lab-id\/project-id\/workflows\/process\/configure\/skeletonization-campaign\/wf_[a-z0-9]{10}\?source=activity-table&origin=skeletonization-campaign-id$/
    );
  });

  it('allows duplicate only when the selected row can resolve a configure request', () => {
    expect(
      canDuplicateWorkflowActivityRow({
        activity: WorkflowActivityDictValue.extract,
        listEntityType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
        row: extractionTaskConfigRow,
      })
    ).toBe(true);

    expect(
      canDuplicateWorkflowActivityRow({
        activity: WorkflowActivityDictValue.extract,
        listEntityType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
        row: { id: 'bad-row', type: EntityTypeDict.TaskConfig, inputs: [] },
      })
    ).toBe(false);
  });

  it('falls back to the activity detail view when scan-config configure cannot be resolved', () => {
    expect(
      buildWorkflowActivityConfigurationHref({
        activity: WorkflowActivityDictValue.simulate,
        listEntityType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
        workspace,
        row: { ...simulationCampaignRow, entity_id: undefined },
      })
    ).toBe(
      '//virtual-lab-id/project-id/workflows/view/small-microcircuit-simulation/simulation-campaign-id/overview'
    );
  });
});
