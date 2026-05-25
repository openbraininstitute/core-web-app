import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { WorkflowSchemaSelectionMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/browse/use-workflow-selection-config';

const mocks = vi.hoisted(() => ({
  schema: undefined as unknown,
  isLoading: false,
}));

vi.mock('@/features/scan-config/components/hooks/schema', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/scan-config/components/hooks/schema')>();
  return {
    ...actual,
    useObioneJsonSchema: () => ({ schema: mocks.schema, isLoading: mocks.isLoading }),
  };
});

describe('scan-config workflow selection config hook', () => {
  beforeEach(() => {
    mocks.schema = undefined;
    mocks.isLoading = false;
  });

  it('returns empty state when activity or target type is missing', () => {
    const { result } = renderHook(() =>
      useWorkflowSelectionConfig({ activity: null, targetType: null })
    );

    expect(result.current).toMatchObject({
      workflow: null,
      schemaName: undefined,
      schema: undefined,
      configurationInputs: [],
      selectionConfig: null,
      isLoading: false,
    });
  });

  it('parses remote schema selection for single-selection scan-config workflows', () => {
    mocks.schema = {
      properties: {
        initialize: {
          ui_element: ScanConfigUIElementDict.BlockSingle,
          properties: {
            circuit: {
              ui_element: ScanConfigUIElementDict.ModelIdentifier,
              accepted_input_types: ['CircuitFromID'],
            },
          },
        },
      },
    };

    const { result } = renderHook(() =>
      useWorkflowSelectionConfig({
        activity: WorkflowActivityDictValue.extract,
        targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      })
    );

    expect(result.current.configurationInputs).toEqual([
      { type: ExtendedEntitiesTypeDict.Circuit },
    ]);
    expect(result.current.selectionConfig).toMatchObject({
      selectionMode: WorkflowSchemaSelectionMode.Single,
      acceptedFromIdTypes: ['CircuitFromID'],
    });
  });

  it('parses grouped selection for multi-input build workflows', () => {
    mocks.schema = {
      properties: {
        initialize: {
          ui_element: ScanConfigUIElementDict.BlockSingle,
          properties: {
            models: {
              ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
              title: 'NamedTupleInput',
              accepted_input_types: ['CellMorphologyFromID', 'MEModelFromID'],
            },
          },
        },
      },
    };

    const { result } = renderHook(() =>
      useWorkflowSelectionConfig({
        activity: WorkflowActivityDictValue.build,
        targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
      })
    );

    expect(result.current.configurationInputs).toHaveLength(2);
    expect(result.current.selectionConfig).toMatchObject({
      selectionMode: WorkflowSchemaSelectionMode.Grouped,
      acceptedEntityTypes: [
        ExtendedEntitiesTypeDict.UniversalCellMorphology,
        ExtendedEntitiesTypeDict.Memodel,
      ],
      tableSelectionType: 'checkbox',
    });
  });

  it('exposes loading while a scan-config workflow schema is loading', () => {
    mocks.isLoading = true;

    const { result } = renderHook(() =>
      useWorkflowSelectionConfig({
        activity: WorkflowActivityDictValue.process,
        targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
      })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.selectionConfig).toBeNull();
  });
});
