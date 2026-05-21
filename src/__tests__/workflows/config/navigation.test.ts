import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import {
  TableSelectionType,
  WorkflowInitializeSelectionMode,
} from '@/features/scan-config/schema/types';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import {
  getWorkflowInitialStageFromSelection,
  resolveWorkflowInitialStage,
  WorkflowInitialStageDict,
} from '@/ui/segments/workflows/config/helpers';
import { WorkflowConfigureRoutingDict } from '@/ui/segments/workflows/config/types';

vi.mock('@/features/scan-config/components/hooks/schema', () => ({
  fetchSchema: vi.fn(),
}));

import { fetchSchema } from '@/features/scan-config/components/hooks/schema';

const fetchSchemaMock = vi.mocked(fetchSchema);

describe('workflow initial stage resolution', () => {
  beforeEach(() => {
    fetchSchemaMock.mockReset();
  });

  describe('getWorkflowInitialStageFromSelection', () => {
    it('maps schema initialize none to configure (ion channel hub flow)', () => {
      expect(
        getWorkflowInitialStageFromSelection({
          selectionMode: WorkflowInitializeSelectionMode.None,
          acceptedEntityTypes: [],
          acceptedFromIdTypes: [],
          tableSelectionType: TableSelectionType.None,
          uiElement: null,
        })
      ).toBe(WorkflowInitialStageDict.Configure);
    });

    it('maps single selection schemas to browse', () => {
      expect(
        getWorkflowInitialStageFromSelection({
          selectionMode: WorkflowInitializeSelectionMode.Single,
          acceptedEntityTypes: [ExtendedEntitiesTypeDict.MemodelCircuit],
          acceptedFromIdTypes: [],
          tableSelectionType: TableSelectionType.None,
          uiElement: ScanConfigUIElementDict.ModelIdentifier,
        })
      ).toBe(WorkflowInitialStageDict.New);
    });
  });

  describe('resolveWorkflowInitialStage', () => {
    it('resolves ion channel simulation to configure without attaching hub session', async () => {
      fetchSchemaMock.mockResolvedValue({
        properties: {},
      } as never);

      const result = await resolveWorkflowInitialStage({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
      });

      expect(result.stage).toBe(WorkflowInitialStageDict.Configure);
      expect(result.workflow?.isScanConfig).toBe(true);
      expect(result.workflow?.configureRouting).toBe(WorkflowConfigureRoutingDict.Standalone);
      expect(result.attachSessionId).toBe(false);
    });

    it('resolves memodel circuit simulation to browse with session on hub navigation', async () => {
      fetchSchemaMock.mockResolvedValue({
        properties: {
          initialize: {
            ui_element: ScanConfigUIElementDict.BlockSingle,
            properties: {
              model: {
                ui_element: ScanConfigUIElementDict.ModelIdentifier,
                accepted_input_types: ['MemodelCircuit'],
              },
            },
          },
        },
      } as never);

      const result = await resolveWorkflowInitialStage({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
      });

      expect(result.stage).toBe(WorkflowInitialStageDict.New);
      expect(result.attachSessionId).toBe(true);
    });

    it('resolves memodel simulation to browse', async () => {
      const result = await resolveWorkflowInitialStage({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
      });

      expect(result.stage).toBe(WorkflowInitialStageDict.New);
      expect(result.workflow?.isScanConfig).toBe(false);
      expect(result.attachSessionId).toBe(false);
    });
  });
});
