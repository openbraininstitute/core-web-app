import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { fieldsDefinitionRegistry } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  buildFieldListingContext,
  collectDefaultActiveColumns,
  collectListingFieldKeys,
  matchesFieldApiWhen,
  resolveContextualValue,
  resolveFieldListing,
} from '@/entity-configuration/definitions/listing';
import {
  SPECIES_TAXONOMY_IDS,
  SpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { FieldDefinition } from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

describe('field listing resolver', () => {
  it('supports list-based when values and matches predicates', () => {
    const value = resolveContextualValue(
      {
        default: false,
        rules: [
          {
            when: {
              dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
              section: [WorkspaceSection.BuildWorkflow, WorkspaceSection.SimulateWorkflow],
            },
            value: true,
          },
          {
            when: { scope: WorkspaceScope.Project },
            matches: (ctx) => ctx.section === WorkspaceSection.BuildWorkflow,
            value: false,
          },
        ],
      },
      {
        dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        section: WorkspaceSection.BuildWorkflow,
        scope: WorkspaceScope.Public,
      }
    );

    const overriddenValue = resolveContextualValue(
      {
        default: false,
        rules: [
          {
            when: {
              dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
              section: [WorkspaceSection.BuildWorkflow, WorkspaceSection.SimulateWorkflow],
            },
            value: true,
          },
          {
            when: { scope: WorkspaceScope.Project },
            matches: (ctx) => ctx.section === WorkspaceSection.BuildWorkflow,
            value: false,
          },
        ],
      },
      {
        dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        section: WorkspaceSection.BuildWorkflow,
        scope: WorkspaceScope.Project,
      }
    );

    expect(value).toBe(true);
    expect(overriddenValue).toBe(false);
  });

  it('matches the hierarchy selected species in when predicates', () => {
    expect(
      matchesFieldApiWhen(
        {
          dataType: ExtendedEntitiesTypeDict.IonChannelModel,
          section: WorkspaceSection.Data,
          selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
        },
        {
          dataType: ExtendedEntitiesTypeDict.IonChannelModel,
          section: WorkspaceSection.Data,
          selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
        }
      )
    ).toBe(true);

    expect(
      matchesFieldApiWhen(
        {
          dataType: ExtendedEntitiesTypeDict.IonChannelModel,
          section: WorkspaceSection.Data,
          selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
        },
        {
          dataType: ExtendedEntitiesTypeDict.IonChannelModel,
          section: WorkspaceSection.Data,
          selectedSpecies: SPECIES_TAXONOMY_IDS.HOMO_SAPIENS,
        }
      )
    ).toBe(false);

    expect(
      matchesFieldApiWhen(
        {
          dataType: ExtendedEntitiesTypeDict.IonChannelModel,
          section: WorkspaceSection.Data,
        },
        {
          dataType: ExtendedEntitiesTypeDict.IonChannelModel,
          section: WorkspaceSection.Data,
          selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
        }
      )
    ).toBe(true);
  });

  it('falls back to legacy field metadata when contextual config is absent', () => {
    const field: FieldDefinition<EntityCoreObjectTypes> = {
      title: 'Species',
      filter: null,
      isDisplayable: true,
      isFilterable: false,
      defaultConstraint: 'species__name__in',
      perTypeConstraint: {
        [ExtendedEntitiesTypeDict.UniversalCellMorphology]: 'subject__species__name__in',
      },
    };

    const listing = resolveFieldListing(field, {
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.BuildWorkflow,
    });

    expect(listing.columnAvailable).toBe(true);
    expect(listing.filterAvailable).toBe(false);
    expect(listing.constraint).toBe('subject__species__name__in');
  });

  it('shows species for experimental and model data on data browse when all species is selected', () => {
    const speciesField = fieldsDefinitionRegistry[EntityCoreFields.SpeciesName];
    const view = {
      title: 'Ion channel model',
      name: 'ion-channel-model',
      columns: [EntityCoreFields.Name, EntityCoreFields.SpeciesName],
    } satisfies ViewDefinitionConfig;

    const dataBrowseAllSpecies = {
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.Data,
      speciesSelectionMode: SpeciesSelectionMode.All,
    };

    const dataBrowseFocusedSpecies = {
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.Data,
      selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      speciesSelectionMode: SpeciesSelectionMode.Focused,
    };

    const simulateWorkflow = {
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.SimulateWorkflow,
      speciesSelectionMode: SpeciesSelectionMode.All,
    };

    const cellMorphologyAllSpecies = {
      dataType: ExtendedEntitiesTypeDict.CellMorphology,
      section: WorkspaceSection.Data,
      speciesSelectionMode: SpeciesSelectionMode.All,
    };

    expect(resolveFieldListing(speciesField, dataBrowseAllSpecies).columnAvailable).toBe(true);
    expect(resolveFieldListing(speciesField, dataBrowseAllSpecies).filterAvailable).toBe(true);
    expect(resolveFieldListing(speciesField, dataBrowseFocusedSpecies).columnAvailable).toBe(false);
    expect(resolveFieldListing(speciesField, simulateWorkflow).columnAvailable).toBe(false);
    expect(resolveFieldListing(speciesField, cellMorphologyAllSpecies).columnAvailable).toBe(true);
    expect(collectDefaultActiveColumns(view, dataBrowseAllSpecies)).toContain(
      EntityCoreFields.SpeciesName
    );
    expect(collectDefaultActiveColumns(view, dataBrowseFocusedSpecies)).not.toContain(
      EntityCoreFields.SpeciesName
    );
  });

  it('collects legacy view fields and context-enabled extras while keeping default active columns limited to view columns', () => {
    const view: ViewDefinitionConfig = {
      title: 'Test',
      name: 'test',
      columns: [EntityCoreFields.Name],
      filterableFields: [EntityCoreFields.Contributions],
      displayableFields: [EntityCoreFields.Contributions],
    };

    const registry = {
      [EntityCoreFields.Name]: {
        title: 'Name',
        filter: null,
        isDisplayable: true,
      },
      [EntityCoreFields.Contributions]: {
        title: 'Contributors',
        filter: null,
        isDisplayable: true,
      },
      [EntityCoreFields.GenerationType]: {
        title: 'Generation type',
        filter: null,
        presentation: {
          column: {
            available: {
              rules: [
                {
                  when: {
                    dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                    section: WorkspaceSection.BuildWorkflow,
                  },
                  value: true,
                },
              ],
            },
          },
        },
      },
    } satisfies Partial<Record<EntityCoreFields, FieldDefinition<EntityCoreObjectTypes>>>;

    const context = {
      dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
      section: WorkspaceSection.BuildWorkflow,
    };

    expect(collectListingFieldKeys(view, context, registry)).toEqual([
      EntityCoreFields.Name,
      EntityCoreFields.Contributions,
      EntityCoreFields.GenerationType,
    ]);
    expect(collectDefaultActiveColumns(view, context)).toContain(EntityCoreFields.Name);
    expect(collectDefaultActiveColumns(view, context)).not.toContain(
      EntityCoreFields.GenerationType
    );
  });

  it('matches speciesSelectionMode in when predicates', () => {
    const ionChannelDataContext = {
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.Data,
    };

    expect(
      matchesFieldApiWhen(
        { speciesSelectionMode: SpeciesSelectionMode.All },
        { ...ionChannelDataContext, speciesSelectionMode: SpeciesSelectionMode.All }
      )
    ).toBe(true);

    expect(
      matchesFieldApiWhen(
        { speciesSelectionMode: SpeciesSelectionMode.All },
        { ...ionChannelDataContext, speciesSelectionMode: SpeciesSelectionMode.Focused }
      )
    ).toBe(false);

    expect(
      matchesFieldApiWhen(
        { speciesSelectionMode: SpeciesSelectionMode.Focused },
        { ...ionChannelDataContext, speciesSelectionMode: SpeciesSelectionMode.All }
      )
    ).toBe(false);
  });

  it('buildFieldListingContext maps hierarchy selection to field API context', () => {
    const workspaceSpecies = {
      id: 'species-mouse',
      name: 'Mus musculus',
      taxonomyId: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      hierarchId: 'hierarchy-mouse',
      displayName: 'Mouse',
    };

    expect(
      buildFieldListingContext({
        dataType: ExtendedEntitiesTypeDict.IonChannelModel,
        section: WorkspaceSection.Data,
        scope: WorkspaceScope.Public,
        speciesSelectionMode: SpeciesSelectionMode.All,
        workspaceSpecies,
      })
    ).toEqual({
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.Data,
      scope: WorkspaceScope.Public,
      selectedSpecies: undefined,
      speciesSelectionMode: SpeciesSelectionMode.All,
    });

    expect(
      buildFieldListingContext({
        dataType: ExtendedEntitiesTypeDict.IonChannelModel,
        section: WorkspaceSection.Data,
        scope: WorkspaceScope.Public,
        speciesSelectionMode: SpeciesSelectionMode.Focused,
        workspaceSpecies,
      })
    ).toEqual({
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.Data,
      scope: WorkspaceScope.Public,
      selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      speciesSelectionMode: SpeciesSelectionMode.Focused,
    });
  });

  it('clears selectedSpecies in all-species mode even when workspace species is still set', () => {
    const workspaceSpecies = {
      id: 'species-mouse',
      name: 'Mus musculus',
      taxonomyId: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      hierarchId: 'hierarchy-mouse',
      displayName: 'Mouse',
    };

    expect(
      buildFieldListingContext({
        dataType: ExtendedEntitiesTypeDict.IonChannelModel,
        section: WorkspaceSection.Data,
        speciesSelectionMode: SpeciesSelectionMode.All,
        workspaceSpecies,
      }).selectedSpecies
    ).toBeUndefined();
  });

  it('leaves selectedSpecies undefined in focused mode when workspace species has not loaded yet', () => {
    expect(
      buildFieldListingContext({
        dataType: ExtendedEntitiesTypeDict.IonChannelModel,
        section: WorkspaceSection.Data,
        speciesSelectionMode: SpeciesSelectionMode.Focused,
        workspaceSpecies: null,
      })
    ).toEqual({
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      section: WorkspaceSection.Data,
      scope: undefined,
      selectedSpecies: undefined,
      speciesSelectionMode: SpeciesSelectionMode.Focused,
    });
  });

  it('does not expose species column when speciesSelectionMode is missing from context', () => {
    const speciesField = fieldsDefinitionRegistry[EntityCoreFields.SpeciesName];

    expect(
      resolveFieldListing(speciesField, {
        dataType: ExtendedEntitiesTypeDict.IonChannelModel,
        section: WorkspaceSection.Data,
        selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      }).columnAvailable
    ).toBe(false);
  });

  it('hides species on build workflow when a single species is focused', () => {
    const speciesField = fieldsDefinitionRegistry[EntityCoreFields.SpeciesName];

    expect(
      resolveFieldListing(speciesField, {
        dataType: ExtendedEntitiesTypeDict.IonChannelRecording,
        section: WorkspaceSection.BuildWorkflow,
        speciesSelectionMode: SpeciesSelectionMode.Focused,
        selectedSpecies: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      }).columnAvailable
    ).toBe(false);
  });
});
