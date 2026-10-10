import { describe, expect, it } from 'vitest';

import {
  dataBrowseListingUsesBrainRegionHierarchy,
  ExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { EntityCoreConfiguration } from '@/entity-configuration/domain';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';
import { SimulationDataExtendedTypes } from '@/ui/segments/explore/helpers';

describe('e-model optimisation result entity is removed', () => {
  // Campaign, config and result are all the same two generic entitycore entities (`task_config`
  // / `task_result`) discriminated by a `*_type` string. The result (`emodel_optimization__result`)
  // is never surfaced on its own: the Optimize Results tab resolves outputs through task
  // activities, not a result domain config. So no result wrapper is registered.
  it('is not registered in the entity configuration', () => {
    expect('EModelOptimizationResult' in EntityCoreConfiguration).toBe(false);
  });

  it('is not listed in Data > Simulations nor its browse route', () => {
    const simulations = Object.values(SimulationDataExtendedTypes).map(
      (entry) => entry.extendedType
    );

    expect(simulations).not.toContain(ExtendedEntitiesTypeDict.EModelOptimizationResult);
    expect(DATA_BROWSE_ALLOWED_ENTITIES).not.toContain(
      ExtendedEntitiesTypeDict.EModelOptimizationResult
    );
  });
});

describe('e-model optimisation campaign', () => {
  it('is registered under simulations with the display title', () => {
    const config = EntityCoreConfiguration.EModelOptimizationCampaign;

    expect(config.extendedType).toBe(ExtendedEntitiesTypeDict.EModelOptimizationCampaign);
    expect(config.group).toBe('simulations');
    expect(config.title).toBe('E-model optimisation');
  });

  it('is listed in Data > Simulations and its browse route', () => {
    const simulations = Object.values(SimulationDataExtendedTypes).map(
      (entry) => entry.extendedType
    );

    expect(simulations).toContain(ExtendedEntitiesTypeDict.EModelOptimizationCampaign);
    expect(DATA_BROWSE_ALLOWED_ENTITIES).toContain(
      ExtendedEntitiesTypeDict.EModelOptimizationCampaign
    );
  });

  it('shows only the fields a campaign carries', () => {
    const viewDef = getViewDefinitionByExtendedType(
      ExtendedEntitiesTypeDict.EModelOptimizationCampaign
    );

    expect(viewDef?.columns).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.RegistrationDate,
    ]);

    const displayed = [
      ...(viewDef?.columns ?? []),
      ...(viewDef?.summaryViewFields ?? []).map((entry) => entry.field),
      ...(viewDef?.miniDetailView ?? []).map((entry) => entry.field),
    ];
    expect(displayed).not.toContain(EntityCoreFields.EType);
    expect(displayed).not.toContain(EntityCoreFields.BrainRegion);
    expect(displayed).not.toContain(EntityCoreFields.SpeciesName);
  });

  it('opts out of brain-region hierarchy scoping', () => {
    expect(
      dataBrowseListingUsesBrainRegionHierarchy(ExtendedEntitiesTypeDict.EModelOptimizationCampaign)
    ).toBe(false);
  });
});
