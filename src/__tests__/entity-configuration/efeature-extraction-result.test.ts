import { describe, expect, it } from 'vitest';

import {
  dataBrowseListingUsesBrainRegionHierarchy,
  ExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { EntityCoreConfiguration } from '@/entity-configuration/domain';
import { BrowseExperimentalDataExtendedTypes } from '@/ui/segments/explore/helpers';

describe('intracellular efeature extraction result', () => {
  it('is registered in the entity configuration under experimental data', () => {
    const config = EntityCoreConfiguration.EFeatureExtractionResult;

    expect(config.extendedType).toBe(ExtendedEntitiesTypeDict.EFeatureExtractionResult);
    expect(config.group).toBe('experimental');
  });

  it('lists the columns the acceptance criteria call for', () => {
    const viewDef = getViewDefinitionByExtendedType(
      ExtendedEntitiesTypeDict.EFeatureExtractionResult
    );

    expect(viewDef?.columns).toEqual(
      expect.arrayContaining([
        EntityCoreFields.Name,
        EntityCoreFields.EType,
        EntityCoreFields.BrainRegion,
        EntityCoreFields.SpeciesName,
      ])
    );
  });

  it('shows etype, brain region and species on the detail view', () => {
    const viewDef = getViewDefinitionByExtendedType(
      ExtendedEntitiesTypeDict.EFeatureExtractionResult
    );

    expect(viewDef?.summaryViewFields?.map((entry) => entry.field)).toEqual([
      EntityCoreFields.EType,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.SpeciesName,
    ]);
  });

  it('opts out of brain-region hierarchy scoping', () => {
    // a task result has no brain region column of its own, so the hierarchy filter would
    // constrain the query on a field the API cannot match and return nothing
    expect(
      dataBrowseListingUsesBrainRegionHierarchy(ExtendedEntitiesTypeDict.EFeatureExtractionResult)
    ).toBe(false);

    // unchanged for a type that does carry one
    expect(
      dataBrowseListingUsesBrainRegionHierarchy(ExtendedEntitiesTypeDict.ElectricalCellRecording)
    ).toBe(true);
  });

  it('appears in the Data > Experimental sidebar', () => {
    // registering the entity config is not enough on its own: the sidebar iterates its own list,
    // and a type missing from it is simply never offered
    const experimental = Object.values(BrowseExperimentalDataExtendedTypes).map(
      (entry) => entry.extendedType
    );

    expect(experimental).toContain(ExtendedEntitiesTypeDict.EFeatureExtractionResult);
  });
});
