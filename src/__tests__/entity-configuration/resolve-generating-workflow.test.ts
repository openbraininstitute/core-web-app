import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTaskActivities } from '@/api/entitycore/queries/task';
import { getTaskConfig } from '@/api/entitycore/queries/task/task-config';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { resolveGeneratingWorkflow } from '@/entity-configuration/domain/resolve-generating-workflow';
import { resolveWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';

vi.mock('@/api/entitycore/queries/task/task-activity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/entitycore/queries/task/task-activity')>()),
  getTaskActivities: vi.fn(),
}));
vi.mock('@/api/entitycore/queries/task/task-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/entitycore/queries/task/task-config')>()),
  getTaskConfig: vi.fn(),
}));

const context = { virtualLabId: 'vl', projectId: 'p' };

const executions = [
  [TaskActivityType.CircuitExtractionExecution, TaskActivityType.CircuitExtractionConfigGeneration],
  [TaskActivityType.BuildSynaptomeExecution, TaskActivityType.BuildSynaptomeConfigGeneration],
  [
    TaskActivityType.CircuitSynapticPhysiologyExecution,
    TaskActivityType.CircuitSynapticPhysiologyConfigGeneration,
  ],
  [TaskActivityType.EmSynapseMappingExecution, TaskActivityType.EmSynapseMappingConfigGeneration],
  [TaskActivityType.MEModelBuildExecution, TaskActivityType.MEModelBuildConfigGeneration],
  [
    TaskActivityType.IonChannelModelingExecution,
    TaskActivityType.IonChannelModelingConfigGeneration,
  ],
  [
    TaskActivityType.EModelOptimizationExecution,
    TaskActivityType.EModelOptimizationConfigGeneration,
  ],
] as const;

describe('resolveGeneratingWorkflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(executions)('resolves the workflow of a %s activity', async (execution) => {
    vi.mocked(getTaskActivities).mockResolvedValue({
      data: [
        {
          task_activity_type: execution,
          used: [
            { id: 'morphology', type: 'cell_morphology' },
            { id: 'coordinate', type: 'task_config' },
          ],
        },
      ],
    } as never);
    vi.mocked(getTaskConfig).mockImplementation((async ({ id }: { id: string }) => ({
      id,
      task_config_generator_id: 'campaign',
    })) as never);

    const result = await resolveGeneratingWorkflow('entity', 'vl', 'p');

    expect(result?.activity.task_activity_type).toBe(execution);
    expect(
      resolveWorkflowTaskTypeBindings(result?.workflow.scanConfig?.definition.taskTypeBindings, {
        entity: null,
      })?.execution
    ).toBe(execution);
    expect(result?.campaign.id).toBe('campaign');
    expect(result?.coordinateConfig.id).toBe('coordinate');
    expect(getTaskActivities).toHaveBeenCalledWith({
      context,
      filters: { generated__id: 'entity', page_size: 1 },
    });
  });

  it('falls back to the config generation activity of the used config for the campaign', async () => {
    vi.mocked(getTaskActivities).mockImplementation((async ({
      filters,
    }: {
      filters: { generated__id?: string };
    }) => ({
      data:
        filters.generated__id === 'entity'
          ? [
              {
                task_activity_type: TaskActivityType.MEModelBuildExecution,
                used: [{ id: 'coordinate' }],
              },
            ]
          : [{ used: [{ id: 'campaign' }] }],
    })) as never);
    vi.mocked(getTaskConfig).mockImplementation((async ({ id }: { id: string }) => ({
      id,
      task_config_generator_id: null,
    })) as never);

    const result = await resolveGeneratingWorkflow('entity', 'vl', 'p');

    expect(result?.campaign.id).toBe('campaign');
  });

  it('returns null when no activity generated the entity', async () => {
    vi.mocked(getTaskActivities).mockResolvedValue({ data: [] } as never);

    await expect(resolveGeneratingWorkflow('entity', 'vl', 'p')).resolves.toBeNull();
    expect(getTaskConfig).not.toHaveBeenCalled();
  });

  it('returns null when the activity used no task config', async () => {
    vi.mocked(getTaskActivities).mockResolvedValue({
      data: [
        {
          task_activity_type: TaskActivityType.MEModelBuildExecution,
          used: [{ id: 'morphology', type: 'cell_morphology' }],
        },
      ],
    } as never);

    await expect(resolveGeneratingWorkflow('entity', 'vl', 'p')).resolves.toBeNull();
  });

  it('returns null when no workflow runs the activity type', async () => {
    vi.mocked(getTaskActivities).mockResolvedValue({
      data: [
        {
          task_activity_type: 'circuit_simplification__execution',
          used: [{ id: 'coordinate', type: 'task_config' }],
        },
      ],
    } as never);

    await expect(resolveGeneratingWorkflow('entity', 'vl', 'p')).resolves.toBeNull();
  });

  it('returns null when the campaign cannot be traced', async () => {
    vi.mocked(getTaskActivities).mockImplementation((async ({
      filters,
    }: {
      filters: { generated__id?: string };
    }) => ({
      data:
        filters.generated__id === 'entity'
          ? [
              {
                task_activity_type: TaskActivityType.MEModelBuildExecution,
                used: [{ id: 'coordinate', type: 'task_config' }],
              },
            ]
          : [],
    })) as never);
    vi.mocked(getTaskConfig).mockResolvedValue({ task_config_generator_id: null } as never);

    await expect(resolveGeneratingWorkflow('entity', 'vl', 'p')).resolves.toBeNull();
  });
});
