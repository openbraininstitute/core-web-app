import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTaskActivities, getTaskConfig } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { resolveEFeatureExtractionCampaignId } from '@/entity-configuration/domain/simulation/efeature-extraction-result';

vi.mock('@/api/entitycore/queries/task', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/entitycore/queries/task')>()),
  getTaskActivities: vi.fn(),
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

describe('resolveEFeatureExtractionCampaignId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('walks result → execution config → its generator campaign', async () => {
    mockActivities({
      result: [
        { id: 'recording', type: 'electrical_cell_recording' },
        { id: 'config', type: 'task_config' },
      ],
    });
    vi.mocked(getTaskConfig).mockResolvedValue({
      task_config_generator_id: 'campaign',
    } as never);

    await expect(resolveEFeatureExtractionCampaignId('result', context)).resolves.toBe('campaign');
    expect(getTaskActivities).toHaveBeenCalledWith({
      context,
      filters: {
        generated__id: 'result',
        task_activity_type: TaskActivityType.EFeatureExtractionExecution,
      },
    });
    expect(getTaskConfig).toHaveBeenCalledWith({ id: 'config', context });
  });

  it('falls back to the config generation activity when the generator id is missing', async () => {
    mockActivities({
      result: [{ id: 'config', type: 'task_config' }],
      // refs may come back untyped
      config: [{ id: 'campaign' }],
    });
    vi.mocked(getTaskConfig).mockResolvedValue({
      task_config_generator_id: null,
    } as never);

    await expect(resolveEFeatureExtractionCampaignId('result', context)).resolves.toBe('campaign');
  });

  it('returns null when the result has no execution provenance', async () => {
    mockActivities({});

    await expect(resolveEFeatureExtractionCampaignId('result', context)).resolves.toBeNull();
    expect(getTaskConfig).not.toHaveBeenCalled();
  });
});
