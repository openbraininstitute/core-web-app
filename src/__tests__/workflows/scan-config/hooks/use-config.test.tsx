import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useConfig } from '@/features/scan-config/components/hooks/schema';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { WorkflowSessionSelectionMode } from '@/features/scan-config/workflow/workflow-session-selection';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const morphologyId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';

const schema = {
  properties: {
    type: { const: 'EMSynapseMappingScanConfig' },
    initialize: {
      ui_element: ScanConfigUIElementDict.BlockSingle,
      properties: {
        model: {
          ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
          default: [],
        },
        seed: { ui_element: ScanConfigUIElementDict.IntParameterSweep, default: 11 },
      },
    },
  },
} as unknown as ConfigSchema;

describe('scan-config hooks', () => {
  it('builds default config from schema and model input', () => {
    const { result } = renderHook(() =>
      useConfig({
        schema,
        model: {
          id: morphologyId,
          type: 'cell_morphology',
        } as never,
      })
    );

    expect(result.current[0]).toEqual({
      type: 'EMSynapseMappingScanConfig',
      initialize: {
        model: [{ type: 'CellMorphologyFromID', id_str: morphologyId }],
        seed: 11,
      },
    });
  });

  it('patches fresh workflow session selection into the initialize model field', () => {
    const { result } = renderHook(() =>
      useConfig({
        schema,
        model: null,
        workflowSessionSelection: {
          mode: WorkflowSessionSelectionMode.Single,
          item: { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: sessionId },
        },
        resolveFromIdType: (type) =>
          type === ExtendedEntitiesTypeDict.UniversalCellMorphology
            ? 'CellMorphologyFromID'
            : undefined,
      })
    );

    expect(result.current[0]).toMatchObject({
      initialize: {
        model: { type: 'CellMorphologyFromID', id_str: sessionId },
        seed: 11,
      },
    });
  });

  it('preserves origin config instead of overwriting it with session selection', () => {
    const initialConfig: Config = {
      initialize: {
        model: [{ type: 'CellMorphologyFromID', id_str: morphologyId }],
        seed: 42,
      },
    };

    const { result } = renderHook(() =>
      useConfig({
        schema,
        initialConfig,
        origin: 'campaign-id',
        model: null,
        workflowSessionSelection: {
          mode: WorkflowSessionSelectionMode.Single,
          item: { type: ExtendedEntitiesTypeDict.UniversalCellMorphology, id: sessionId },
        },
        resolveFromIdType: () => 'CellMorphologyFromID',
      })
    );

    expect(result.current[0]).toEqual({
      type: 'EMSynapseMappingScanConfig',
      initialize: {
        model: [{ type: 'CellMorphologyFromID', id_str: morphologyId }],
        seed: 42,
      },
    });
  });
});
