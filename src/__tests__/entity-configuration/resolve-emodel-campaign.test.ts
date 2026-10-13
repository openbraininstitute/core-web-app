import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTaskActivities, getTaskConfig } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { resolveEModelOptimizationCampaignId } from '@/entity-configuration/domain/optimization/resolve-emodel-campaign';

vi.mock('@/api/entitycore/queries/task/task-activity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/entitycore/queries/task/task-activity')>()),
  getTaskActivities: vi.fn(),
}));
vi.mock('@/api/entitycore/queries/task/task-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/entitycore/queries/task/task-config')>()),
  getTaskConfig: vi.fn(),
}));

const context = { virtualLabId: 'vl', projectId: 'p' };

/** activities keyed by `generated__id`, each listing what it `used` */
function mockActivities(usedByGeneratedId: Record<string, Array<{ id: string; type?: string }>>) {
  vi.mocked(getTaskActivities).mockImplementation(async ({ filters }) => {
    const used = usedByGeneratedId[filters?.generated__id ?? ''];
    return { data: used ? [{ used }] : [] } as never;
  });
}

describe('resolveEModelOptimizationCampaignId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('walks e-model → execution config → its generator campaign', async () => {
    mockActivities({
      emodel: [
        { id: 'morphology', type: 'cell_morphology' },
        { id: 'config', type: 'task_config' },
      ],
    });
    vi.mocked(getTaskConfig).mockResolvedValue({ task_config_generator_id: 'campaign' } as never);

    await expect(resolveEModelOptimizationCampaignId('emodel', context)).resolves.toBe('campaign');
    expect(getTaskActivities).toHaveBeenCalledWith({
      context,
      filters: {
        generated__id: 'emodel',
        task_activity_type: TaskActivityType.EModelOptimizationExecution,
      },
    });
    expect(getTaskConfig).toHaveBeenCalledWith({ id: 'config', context });
  });

  it('falls back to the config generation activity when the generator id is missing', async () => {
    mockActivities({
      emodel: [{ id: 'config', type: 'task_config' }],
      // refs may come back untyped
      config: [{ id: 'campaign' }],
    });
    vi.mocked(getTaskConfig).mockResolvedValue({ task_config_generator_id: null } as never);

    await expect(resolveEModelOptimizationCampaignId('emodel', context)).resolves.toBe('campaign');
  });

  it('returns null when the e-model has no optimisation provenance', async () => {
    mockActivities({});

    await expect(resolveEModelOptimizationCampaignId('emodel', context)).resolves.toBeNull();
    expect(getTaskConfig).not.toHaveBeenCalled();
  });
});
