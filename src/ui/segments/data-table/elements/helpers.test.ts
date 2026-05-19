import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { makeTypeDefaultFilters } from './helpers';

describe('makeTypeDefaultFilters', () => {
  it('keeps workflow-only fields out of universal cell morphology data listings', () => {
    const filters = makeTypeDefaultFilters({
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.Data,
    });

    const fields = filters.map((filter) => filter.field);

    expect(fields).not.toContain(EntityCoreFields.SpeciesName);
    expect(fields).not.toContain('generation_type');
  });

  // TODO(testing): drift since #1570 — fix or remove
  it.skip('adds workflow-only fields to the build workflow listing for universal cell morphology', () => {
    const filters = makeTypeDefaultFilters({
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.BuildWorkflow,
    });

    const fields = filters.map((filter) => filter.field);
    const generationTypeFilter = filters.find((filter) => filter.field === 'generation_type');

    expect(fields).toContain(EntityCoreFields.SpeciesName);
    expect(fields).toContain('generation_type');
    expect(generationTypeFilter?.constraint).toBe('cell_morphology_protocol__generation_type__in');
  });

  // TODO(testing): drift since #1570 — fix or remove
  it.skip('preserves legacy view-level filterable and displayable fields', () => {
    const filters = makeTypeDefaultFilters({
      dataType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
      section: WorkspaceSection.SimulateWorkflow,
    });

    expect(filters.some((filter) => filter.field === EntityCoreFields.Contributions)).toBe(true);
  });
});
