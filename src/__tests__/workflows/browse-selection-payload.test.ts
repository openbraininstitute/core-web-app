import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  type EntityCoreIdentifiableNamed,
  EntityLifecycleStatus,
  type TEntityLifecycleStatus,
} from '@/api/entitycore/types/shared/global';
import { WorkflowSchemaSelectionMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import { WorkflowSessionSelectionMode } from '@/features/scan-config/workflow/workflow-session-selection';
import { buildWorkflowBrowseSelectionPayload } from '@/ui/segments/workflows/browse/listing';

import type { TWorkflowSchemaSelection } from '@/features/scan-config/workflow/workflow-schema-selection';

function row(
  id: string,
  lifecycle_status?: TEntityLifecycleStatus
): EntityCoreIdentifiableNamed & { lifecycle_status?: TEntityLifecycleStatus } {
  return {
    id,
    name: id,
    type: ExtendedEntitiesTypeDict.Memodel,
    legacy_id: null,
    lifecycle_status,
  };
}

const configurationInputs = [{ type: ExtendedEntitiesTypeDict.Memodel, label: 'Single neuron' }];
const multipleSelection = {
  selectionMode: WorkflowSchemaSelectionMode.Multiple,
} as TWorkflowSchemaSelection;

describe('buildWorkflowBrowseSelectionPayload lifecycle gating', () => {
  it('drops draft and disqualified rows from a list payload', () => {
    const payload = buildWorkflowBrowseSelectionPayload({
      selectionConfig: multipleSelection,
      configurationInputs,
      selectionsByType: {
        [ExtendedEntitiesTypeDict.Memodel]: [
          row('active-1', EntityLifecycleStatus.Active),
          row('draft-1', EntityLifecycleStatus.Draft),
          row('dq-1', EntityLifecycleStatus.Disqualified),
        ],
      },
    });

    expect(payload).toEqual({
      mode: WorkflowSessionSelectionMode.List,
      items: [{ type: ExtendedEntitiesTypeDict.Memodel, id: 'active-1', name: 'active-1' }],
    });
  });

  it('returns null when every selected row is blocked', () => {
    const payload = buildWorkflowBrowseSelectionPayload({
      selectionConfig: multipleSelection,
      configurationInputs,
      selectionsByType: {
        [ExtendedEntitiesTypeDict.Memodel]: [row('draft-1', EntityLifecycleStatus.Draft)],
      },
    });

    expect(payload).toBeNull();
  });
});
