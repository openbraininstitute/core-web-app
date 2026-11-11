import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTaskActivities, getTaskConfig } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import {
  dataBrowseListingUsesBrainRegionHierarchy,
  ExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { EntityCoreConfiguration } from '@/entity-configuration/domain';
import { getExtendedTypeByTaskResultType } from '@/entity-configuration/domain/helpers';
import { resolveTaskResultCampaignId } from '@/entity-configuration/domain/simulation/task-result-campaign';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';
import { SimulationDataExtendedTypes } from '@/ui/segments/explore/helpers';

vi.mock('@/api/entitycore/queries/task', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/entitycore/queries/task')>()),
  getTaskActivities: vi.fn(),
  getTaskConfig: vi.fn(),
}));

describe('e-model validation result', () => {
  it('is registered under simulations as the task result of a validation run', () => {
    const config = EntityCoreConfiguration.EModelValidationResult;

    expect(config.extendedType).toBe(ExtendedEntitiesTypeDict.EModelValidationResult);
    expect(config.group).toBe('simulations');
    expect(config.title).toBe('E-model validation');
    expect(config.api.config?.extraQueryKeyBuilder).toEqual({
      task_result_type: TaskResultType.OptimizedEModelAnalysisValidationResult,
    });
  });

  it('is found from its task result type, so a task result picker can browse it', () => {
    expect(
      getExtendedTypeByTaskResultType(TaskResultType.OptimizedEModelAnalysisValidationResult)
    ).toBe(ExtendedEntitiesTypeDict.EModelValidationResult);
  });

  it('is listed in Data > Simulations with a grid and a browse route', () => {
    const simulations = Object.values(SimulationDataExtendedTypes).map(
      (entry) => entry.extendedType
    );

    expect(simulations).toContain(ExtendedEntitiesTypeDict.EModelValidationResult);
    expect(DATA_BROWSE_ALLOWED_ENTITIES).toContain(ExtendedEntitiesTypeDict.EModelValidationResult);
    expect(getEntityGridDefinition(ExtendedEntitiesTypeDict.EModelValidationResult)).toBeDefined();
  });

  it('shows only the fields a task result carries', () => {
    const viewDef = getViewDefinitionByExtendedType(
      ExtendedEntitiesTypeDict.EModelValidationResult
    );

    expect(viewDef?.columns).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.RegistrationDate,
    ]);
  });

  it('opts out of brain-region hierarchy scoping', () => {
    expect(
      dataBrowseListingUsesBrainRegionHierarchy(ExtendedEntitiesTypeDict.EModelValidationResult)
    ).toBe(false);
  });
});

describe('e-model validation campaign', () => {
  it('is configured, but not listed in Data, like the extraction campaign', () => {
    expect(EntityCoreConfiguration.EModelValidationCampaign.extendedType).toBe(
      ExtendedEntitiesTypeDict.EModelValidationCampaign
    );
    expect(DATA_BROWSE_ALLOWED_ENTITIES).not.toContain(
      ExtendedEntitiesTypeDict.EModelValidationCampaign
    );
  });
});

describe('resolveTaskResultCampaignId for a validation result', () => {
  const context = { virtualLabId: 'vl', projectId: 'p' };
  const activityTypes = {
    execution: TaskActivityType.EModelValidationExecution,
    configGeneration: TaskActivityType.EModelValidationConfigGeneration,
  };

  beforeEach(() => vi.clearAllMocks());

  it('walks result → validation execution config → its generator campaign', async () => {
    vi.mocked(getTaskActivities).mockResolvedValue({
      data: [
        {
          used: [
            { id: 'emodel', type: 'emodel' },
            { id: 'config', type: 'task_config' },
          ],
        },
      ],
    } as never);
    vi.mocked(getTaskConfig).mockResolvedValue({ task_config_generator_id: 'campaign' } as never);

    await expect(resolveTaskResultCampaignId('result', context, activityTypes)).resolves.toBe(
      'campaign'
    );
    expect(getTaskActivities).toHaveBeenCalledWith({
      context,
      filters: {
        generated__id: 'result',
        task_activity_type: TaskActivityType.EModelValidationExecution,
      },
    });
  });

  it('is null when no execution produced the result', async () => {
    vi.mocked(getTaskActivities).mockResolvedValue({ data: [] } as never);

    await expect(resolveTaskResultCampaignId('result', context, activityTypes)).resolves.toBeNull();
    expect(getTaskConfig).not.toHaveBeenCalled();
  });
});
