import { describe, expect, it } from 'vitest';

import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import {
  dataBrowseListingUsesBrainRegionHierarchy,
  ExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { EntityCoreConfiguration } from '@/entity-configuration/domain';
import { getExtendedTypeByTaskResultType } from '@/entity-configuration/domain/helpers';
import { eModelOptimizationFlag } from '@/features/feature-flags/flags';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';
import { SimulationDataExtendedTypes } from '@/ui/segments/explore/helpers';

describe('e-model optimization result', () => {
  it('is registered in the entity configuration under simulations', () => {
    const config = EntityCoreConfiguration.EModelOptimizationResult;

    expect(config.extendedType).toBe(ExtendedEntitiesTypeDict.EModelOptimizationResult);
    expect(config.group).toBe('simulations');
    expect(config.title).toBe('Optimization TaskResult');
  });

  it('lists only optimization task results', () => {
    expect(getExtendedTypeByTaskResultType(TaskResultType.EModelOptimizationResult)).toBe(
      ExtendedEntitiesTypeDict.EModelOptimizationResult
    );
  });

  it('is hidden unless the e-model optimization flag is on', () => {
    expect(EntityCoreConfiguration.EModelOptimizationResult.requiredFeatures).toEqual([
      eModelOptimizationFlag.key,
    ]);
  });

  it('does not display fields a task result has no value for', () => {
    const viewDef = getViewDefinitionByExtendedType(
      ExtendedEntitiesTypeDict.EModelOptimizationResult
    );

    const displayed = [
      ...(viewDef?.columns ?? []),
      ...(viewDef?.summaryViewFields ?? []).map((entry) => entry.field),
      ...(viewDef?.miniDetailView ?? []).map((entry) => entry.field),
    ];

    expect(viewDef?.columns).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.RegistrationDate,
    ]);
    expect(displayed).not.toContain(EntityCoreFields.EType);
    expect(displayed).not.toContain(EntityCoreFields.BrainRegion);
    expect(displayed).not.toContain(EntityCoreFields.SpeciesName);
  });

  it('opts out of brain-region hierarchy scoping', () => {
    expect(
      dataBrowseListingUsesBrainRegionHierarchy(ExtendedEntitiesTypeDict.EModelOptimizationResult)
    ).toBe(false);
  });

  it('appears in the Data > Simulations sidebar and its browse route', () => {
    const simulations = Object.values(SimulationDataExtendedTypes).map(
      (entry) => entry.extendedType
    );

    expect(simulations).toContain(ExtendedEntitiesTypeDict.EModelOptimizationResult);
    expect(DATA_BROWSE_ALLOWED_ENTITIES).toContain(
      ExtendedEntitiesTypeDict.EModelOptimizationResult
    );
  });
});
