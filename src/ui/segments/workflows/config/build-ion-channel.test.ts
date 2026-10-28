import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ScanConfigUIElementDict, SchemaNameDict } from '@/features/scan-config/types';
import { buildIonChannelWorkflow } from '@/features/scan-config/workflow/definitions/build-ion-channel';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';
import { WorkflowSchemaSelectionMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { ScanConfigFromIdType } from '@/ui/segments/workflows/config/scan-config-binding';
import {
  WorkflowInitialStageDict,
  WorkflowInitialStagePolicyDict,
} from '@/ui/segments/workflows/config/types';

import { getWorkflow, listWorkflows, resolveWorkflowRouteStage } from './helpers';

const targetTypes = (context: 'configure' | 'browse') =>
  listWorkflows({ activity: ActivityValues.Build, context }).map((w) => w.targetType);

describe('ion channel build workflow registration', () => {
  it('configures new builds as generic task-config campaigns', () => {
    expect(targetTypes('configure')).toContain(ExtendedEntitiesTypeDict.IonChannelBuildCampaign);
    expect(targetTypes('configure')).not.toContain(
      ExtendedEntitiesTypeDict.IonChannelModelingCampaign
    );
  });

  it('still lists the campaigns built before the scan-config editor among past runs', () => {
    expect(targetTypes('browse')).toEqual(
      expect.arrayContaining([
        ExtendedEntitiesTypeDict.IonChannelBuildCampaign,
        ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
      ])
    );
  });
});

describe('ion channel build selects recordings in the editor', () => {
  const workflow = getWorkflow({
    activity: ActivityValues.Build,
    targetType: ExtendedEntitiesTypeDict.IonChannelBuildCampaign,
  });

  it('starts on configure, not on the browse page', () => {
    expect(workflow?.initialStage).toBe(WorkflowInitialStagePolicyDict.Configure);
    expect(workflow?.isScanConfig).toBe(true);
  });

  it('stays on configure even though the schema declares a multi-entity selection', () => {
    const selection = {
      schemaName: SchemaNameDict.IonChannelFittingScanConfig,
      uiElement: ScanConfigUIElementDict.ModelIdentifierMultiple,
      selectionMode: WorkflowSchemaSelectionMode.Multiple,
      acceptedFromIdTypes: [ScanConfigFromIdType.IonChannelRecordingFromID],
      acceptedEntityTypes: [ExtendedEntitiesTypeDict.IonChannelRecording],
      tableSelectionType: 'checkbox',
      maxSelections: 3,
    } as const;

    expect(resolveWorkflowRouteStage({ workflow, selection })).toBe(
      WorkflowInitialStageDict.Configure
    );
  });

  it('opens configure on an empty session instead of 404ing', () => {
    expect(buildIonChannelWorkflow.entity).toMatchObject({
      mode: ScanConfigEntitySourceMode.Session,
      picksEntitiesInEditor: true,
    });
  });
});
