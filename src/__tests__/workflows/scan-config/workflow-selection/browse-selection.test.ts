import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowSchemaSelectionMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import { WorkflowSessionSelectionMode } from '@/features/scan-config/workflow/workflow-session-selection';
import {
  buildWorkflowBrowseSelectionPayload,
  isWorkflowMultiEntityBrowse,
} from '@/ui/segments/workflows/browse/listing';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TWorkflowSchemaSelection } from '@/features/scan-config/workflow/workflow-schema-selection';

const circuitRow = {
  id: '11111111-1111-4111-8111-111111111111',
  legacy_id: null,
  name: 'Circuit A',
  type: 'circuit',
} satisfies EntityCoreIdentifiableNamed;

const morphologyRow = {
  id: '22222222-2222-4222-8222-222222222222',
  legacy_id: null,
  name: 'Morphology A',
  type: 'cell_morphology',
} satisfies EntityCoreIdentifiableNamed;

const memodelRow = {
  id: '33333333-3333-4333-8333-333333333333',
  legacy_id: null,
  name: 'ME Model A',
  type: 'memodel',
} satisfies EntityCoreIdentifiableNamed;

function selectionConfig(
  selectionMode: TWorkflowSchemaSelection['selectionMode']
): TWorkflowSchemaSelection {
  if (selectionMode === WorkflowSchemaSelectionMode.Single) {
    return {
      schemaName: 'CircuitSimulationScanConfig',
      uiElement: 'model_identifier',
      selectionMode,
      acceptedFromIdTypes: ['CircuitFromID'],
      tableSelectionType: undefined,
    };
  }

  if (selectionMode === WorkflowSchemaSelectionMode.None) {
    return {
      schemaName: 'CircuitSimulationScanConfig',
      uiElement: null,
      selectionMode,
      acceptedFromIdTypes: [],
      tableSelectionType: undefined,
    };
  }

  return {
    schemaName: 'EMSynapseMappingScanConfig',
    uiElement: 'model_identifier_multiple',
    selectionMode,
    acceptedFromIdTypes: ['CellMorphologyFromID', 'MEModelFromID'],
    acceptedEntityTypes: [
      ExtendedEntitiesTypeDict.UniversalCellMorphology,
      ExtendedEntitiesTypeDict.Memodel,
    ],
    tableSelectionType: 'checkbox',
  };
}

describe('scan-config workflow browse selection', () => {
  it('classifies multiple and grouped schema selection modes as multi-entity browse', () => {
    expect(
      isWorkflowMultiEntityBrowse({
        selectionConfig: selectionConfig(WorkflowSchemaSelectionMode.Multiple),
      })
    ).toBe(true);
    expect(
      isWorkflowMultiEntityBrowse({
        selectionConfig: selectionConfig(WorkflowSchemaSelectionMode.Grouped),
      })
    ).toBe(true);
    expect(
      isWorkflowMultiEntityBrowse({
        selectionConfig: selectionConfig(WorkflowSchemaSelectionMode.Single),
      })
    ).toBe(false);
  });

  it('builds a single-selection payload from the first selected row', () => {
    expect(
      buildWorkflowBrowseSelectionPayload({
        selectionConfig: selectionConfig(WorkflowSchemaSelectionMode.Single),
        configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
        selectionsByType: {
          [ExtendedEntitiesTypeDict.Circuit]: [circuitRow],
        },
      })
    ).toEqual({
      mode: WorkflowSessionSelectionMode.Single,
      item: { type: ExtendedEntitiesTypeDict.Circuit, id: circuitRow.id },
    });
  });

  it('builds a flat list payload for multiple selection across configured input order', () => {
    expect(
      buildWorkflowBrowseSelectionPayload({
        selectionConfig: selectionConfig(WorkflowSchemaSelectionMode.Multiple),
        configurationInputs: [
          { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, label: 'Morphology' },
          { type: ExtendedEntitiesTypeDict.Memodel, label: 'ME-model' },
        ],
        selectionsByType: {
          [ExtendedEntitiesTypeDict.Memodel]: [memodelRow],
          [ExtendedEntitiesTypeDict.UniversalCellMorphology]: [morphologyRow],
        },
      })
    ).toEqual({
      mode: WorkflowSessionSelectionMode.List,
      items: [
        { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: morphologyRow.id },
        { type: ExtendedEntitiesTypeDict.Memodel, id: memodelRow.id },
      ],
    });
  });

  it('builds grouped payloads with configuration input labels and skips empty groups', () => {
    expect(
      buildWorkflowBrowseSelectionPayload({
        selectionConfig: selectionConfig(WorkflowSchemaSelectionMode.Grouped),
        configurationInputs: [
          { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, label: 'Morphology' },
          { type: ExtendedEntitiesTypeDict.Memodel, label: 'ME-model' },
          { type: ExtendedEntitiesTypeDict.Circuit, label: 'Circuit' },
        ],
        selectionsByType: {
          [ExtendedEntitiesTypeDict.UniversalCellMorphology]: [morphologyRow],
          [ExtendedEntitiesTypeDict.Memodel]: [memodelRow],
        },
      })
    ).toEqual({
      mode: WorkflowSessionSelectionMode.Grouped,
      groups: [
        {
          name: 'Morphology',
          items: [{ type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: morphologyRow.id }],
        },
        {
          name: 'ME-model',
          items: [{ type: ExtendedEntitiesTypeDict.Memodel, id: memodelRow.id }],
        },
      ],
    });
  });

  it('returns null when no selected rows are available', () => {
    expect(
      buildWorkflowBrowseSelectionPayload({
        selectionConfig: selectionConfig(WorkflowSchemaSelectionMode.Multiple),
        configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
        selectionsByType: {},
      })
    ).toBeNull();
  });
});
