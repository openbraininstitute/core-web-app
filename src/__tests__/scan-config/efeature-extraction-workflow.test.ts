import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  efeatureExtractionActivityFlag,
  extractionActivityFlag,
  flags,
} from '@/features/feature-flags/flags';
import { ScanConfigUIElementDict, SchemaNameDict } from '@/features/scan-config/types';
import { extractEFeaturesWorkflow } from '@/features/scan-config/workflow/definitions/extract-efeatures';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';
import {
  entityTypeForScanConfigFromIdType,
  WorkflowSchemaSelectionMode,
} from '@/features/scan-config/workflow/workflow-schema-selection';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';
import {
  getWorkflow,
  listActivities,
  listWorkflows,
  resolveWorkflowRouteStage,
} from '@/ui/segments/workflows/config/helpers';
import { ScanConfigFromIdType } from '@/ui/segments/workflows/config/scan-config-binding';
import {
  findScanConfigRegistryByDefinition,
  findScanConfigRegistryByTargetType,
} from '@/ui/segments/workflows/config/scan-config-registry';
import {
  WorkflowInitialStageDict,
  WorkflowInitialStagePolicyDict,
} from '@/ui/segments/workflows/config/types';

import type { FeatureFlags } from '@/features/feature-flags/flags';

const noFlags = {} as FeatureFlags;
const efeatureOnly = { [efeatureExtractionActivityFlag.key]: true } as unknown as FeatureFlags;
const circuitOnly = { [extractionActivityFlag.key]: true } as unknown as FeatureFlags;

function extractionActivityVisible(flags: FeatureFlags) {
  return listActivities(flags).some((activity) => activity.value === 'extract');
}

/**
 * `FlagDefinition.key` is typed `string`, so `FlagKey` collapses to `string` and the compiler
 * cannot tell a registered flag from a typo or an unregistered one. A gate referencing a flag
 * missing from the registry is never in `defaultFlags`, reads as undefined, and silently hides
 * the thing it guards — so it is checked here instead.
 */
describe('workflow feature flags', () => {
  const registeredKeys = new Set(flags.map((flag) => flag.key));

  it('registers every flag referenced by an activity or workflow gate', () => {
    const referenced = new Set<string>();

    for (const activity of Object.values(ActivityRegistry)) {
      for (const key of activity.requiredFeatures ?? []) referenced.add(key);
      for (const key of activity.requiredAnyFeatures ?? []) referenced.add(key);
      for (const workflow of [...activity.workflows, ...(activity.browseWorkflows ?? [])]) {
        for (const key of workflow.requiredFeatures ?? []) referenced.add(key);
      }
    }

    const unregistered = [...referenced].filter((key) => !registeredKeys.has(key));
    expect(unregistered).toEqual([]);
  });
});

/**
 * `ScanConfigFromIdType` is declared twice — once in the workflow registry binding and once,
 * privately, in workflow-schema-selection. The second one drives browse entity types and ref
 * badges, and it *skips* FromID types it does not know rather than failing, so a registry that
 * drifts loses browse types silently.
 */
describe('FromID type registries', () => {
  it('maps every registered FromID type to an entity type', () => {
    const unmapped = Object.values(ScanConfigFromIdType).filter(
      (fromIdType) => !entityTypeForScanConfigFromIdType(fromIdType)
    );

    expect(unmapped).toEqual([]);
  });
});

describe('extraction activity gating', () => {
  it('hides the extraction activity when no extraction flag is on', () => {
    expect(extractionActivityVisible(noFlags)).toBe(false);
  });

  it('shows the extraction activity when only the efeature flag is on', () => {
    expect(extractionActivityVisible(efeatureOnly)).toBe(true);
  });

  it('still shows the extraction activity when only the circuit flag is on', () => {
    expect(extractionActivityVisible(circuitOnly)).toBe(true);
  });
});

describe('intracellular efeatures workflow registration', () => {
  it('is listed and enabled under extract when its own flag is on', () => {
    const workflow = listWorkflows({ activity: 'extract', flags: efeatureOnly }).find(
      (entry) => entry.targetType === ExtendedEntitiesTypeDict.EFeatureExtractionCampaign
    );

    expect(workflow).toBeDefined();
    expect(workflow?.label).toBe('Intracellular EFeatures');
    expect(workflow?.disabled).toBe(false);
  });

  it('is disabled when only the circuit extraction flag is on', () => {
    const workflow = listWorkflows({ activity: 'extract', flags: circuitOnly }).find(
      (entry) => entry.targetType === ExtendedEntitiesTypeDict.EFeatureExtractionCampaign
    );

    expect(workflow?.disabled).toBe(true);
  });

  it('resolves its scan-config binding by target type', () => {
    const registry = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.EFeatureExtractionCampaign
    );

    expect(registry?.schemaName).toBe(SchemaNameDict.EModelEFeatureExtractionScanConfig);
    expect(registry?.configureBinding.browseType).toBe(
      ExtendedEntitiesTypeDict.ElectricalCellRecording
    );
    // the obi-one endpoint name is derived from the ScanConfig class name; a mismatch here
    // is a silent 404 at generation time rather than a type error
    expect(registry?.configureBinding.generatedApiPath).toBe(
      'e-model-e-feature-extraction-scan-config-generate-grid'
    );
  });

  it('resolves the same binding by workflow definition', () => {
    const registry = findScanConfigRegistryByDefinition(extractEFeaturesWorkflow);

    expect(registry?.schemaName).toBe(SchemaNameDict.EModelEFeatureExtractionScanConfig);
  });
});

/**
 * Recordings are picked inside the editor, from the `model_identifier_multiple` field's own
 * browse widget. Two things have to agree for that: routing must not send the user to `/new`
 * first, and configure must accept a session with nothing selected in it.
 */
describe('intracellular efeatures selects entities in the editor', () => {
  const workflow = getWorkflow({
    activity: 'extract',
    targetType: ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
  });

  it('starts on configure, not on the browse page', () => {
    expect(workflow?.initialStage).toBe(WorkflowInitialStagePolicyDict.Configure);
    expect(workflow?.isScanConfig).toBe(true);
  });

  it('stays on configure even when the schema declares a multi-entity selection', () => {
    const selection = {
      schemaName: SchemaNameDict.EModelEFeatureExtractionScanConfig,
      uiElement: ScanConfigUIElementDict.ModelIdentifierMultiple,
      selectionMode: WorkflowSchemaSelectionMode.Multiple,
      acceptedFromIdTypes: [ScanConfigFromIdType.ElectricalCellRecordingFromID],
      acceptedEntityTypes: [ExtendedEntitiesTypeDict.ElectricalCellRecording],
      tableSelectionType: 'checkbox',
    } as const;

    expect(resolveWorkflowRouteStage({ workflow, selection })).toBe(
      WorkflowInitialStageDict.Configure
    );
  });

  it('opens configure on an empty session instead of 404ing', () => {
    expect(extractEFeaturesWorkflow.entity).toMatchObject({
      mode: ScanConfigEntitySourceMode.Session,
      picksEntitiesInEditor: true,
    });
  });

  it('keeps the recording browse type so the in-editor picker lists recordings', () => {
    expect(workflow?.configurationInputs).toEqual([
      { type: ExtendedEntitiesTypeDict.ElectricalCellRecording },
    ]);
  });
});
