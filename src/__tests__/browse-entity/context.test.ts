import { createStore } from 'jotai';
import superjson from 'superjson';
import { beforeEach, describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  speciesSelectionModeAtom,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import {
  SPECIES_TAXONOMY_IDS,
  SpeciesSelectionMode,
} from '@/features/brain-region-hierarchy/types';
import {
  coreActiveColumnsAtom,
  coreFiltersAtom,
  DataListSnapshotSyncAtomFamily,
} from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';

function makeListingDataKey(dataType = ExtendedEntitiesTypeDict.IonChannelModel) {
  return makeDataKey({
    virtualLabId: 'virtual-lab',
    projectId: 'project',
    section: WorkspaceSection.Data,
    dataType,
    scope: WorkspaceScope.Public,
  }).dataKey;
}

describe('data list snapshot sync', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('resets active columns to species-aware defaults on RESET', () => {
    const store = createStore();
    const dataType = ExtendedEntitiesTypeDict.IonChannelModel;
    const dataKey = makeListingDataKey(dataType);

    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.All);
    store.set(workspaceHierarchySpeciesAtom, null);

    const defaultColumns = store.get(coreActiveColumnsAtom({ dataType, key: dataKey }));
    expect(defaultColumns).toContain(EntityCoreFields.SpeciesName);

    store.set(coreActiveColumnsAtom({ dataType, key: dataKey }), ['index', EntityCoreFields.Name]);
    expect(store.get(coreActiveColumnsAtom({ dataType, key: dataKey }))).not.toContain(
      EntityCoreFields.SpeciesName
    );

    store.set(DataListSnapshotSyncAtomFamily({ dataKey, dataType }), { type: 'reset' });

    expect(store.get(coreActiveColumnsAtom({ dataType, key: dataKey }))).toContain(
      EntityCoreFields.SpeciesName
    );
  });

  it('derives default active columns from hierarchy atoms after RESET', () => {
    const store = createStore();
    const dataType = ExtendedEntitiesTypeDict.IonChannelModel;
    const dataKey = makeListingDataKey(dataType);

    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.All);
    store.set(workspaceHierarchySpeciesAtom, null);
    expect(store.get(coreActiveColumnsAtom({ dataType, key: dataKey }))).toContain(
      EntityCoreFields.SpeciesName
    );

    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.Focused);
    store.set(workspaceHierarchySpeciesAtom, {
      id: 'species-mouse',
      name: 'Mus musculus',
      taxonomyId: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      hierarchId: 'hierarchy-mouse',
      displayName: 'Mouse',
    });
    store.set(DataListSnapshotSyncAtomFamily({ dataKey, dataType }), { type: 'reset' });

    expect(store.get(coreActiveColumnsAtom({ dataType, key: dataKey }))).not.toContain(
      EntityCoreFields.SpeciesName
    );
  });

  it('keeps user-overridden active columns when hierarchy atoms change without RESET', () => {
    const store = createStore();
    const dataType = ExtendedEntitiesTypeDict.IonChannelModel;
    const dataKey = makeListingDataKey(dataType);

    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.All);
    store.set(workspaceHierarchySpeciesAtom, null);
    store.set(coreActiveColumnsAtom({ dataType, key: dataKey }), [
      'index',
      EntityCoreFields.Name,
      EntityCoreFields.SpeciesName,
    ]);

    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.Focused);
    store.set(workspaceHierarchySpeciesAtom, {
      id: 'species-mouse',
      name: 'Mus musculus',
      taxonomyId: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS,
      hierarchId: 'hierarchy-mouse',
      displayName: 'Mouse',
    });

    expect(store.get(coreActiveColumnsAtom({ dataType, key: dataKey }))).toEqual([
      'index',
      EntityCoreFields.Name,
      EntityCoreFields.SpeciesName,
    ]);
  });

  it('restores stale session filters that omit species even when all-species mode is active', () => {
    const store = createStore();
    const dataType = ExtendedEntitiesTypeDict.IonChannelModel;
    const dataKey = makeListingDataKey(dataType);

    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.All);
    store.set(workspaceHierarchySpeciesAtom, null);

    const staleSnapshot = {
      Sort: [],
      Search: '',
      Page: 1,
      Filters: [
        {
          field: EntityCoreFields.Name,
          backendField: EntityCoreFields.Name,
          value: [],
        },
      ],
      View: 'hierarchy',
    };
    sessionStorage.setItem(dataKey, superjson.stringify(staleSnapshot));

    store.set(DataListSnapshotSyncAtomFamily({ dataKey, dataType }), { type: 'restore' });

    const restoredFilters = store.get(coreFiltersAtom({ dataType, key: dataKey }));
    expect(restoredFilters.map((filter) => filter.field)).not.toContain(
      EntityCoreFields.SpeciesName
    );
  });

  it('resets filters to species-aware defaults after RESET clears stale session storage', () => {
    const store = createStore();
    const dataType = ExtendedEntitiesTypeDict.IonChannelModel;
    const dataKey = makeListingDataKey(dataType);

    store.set(speciesSelectionModeAtom, SpeciesSelectionMode.All);
    store.set(workspaceHierarchySpeciesAtom, null);

    sessionStorage.setItem(
      dataKey,
      superjson.stringify({
        Sort: [],
        Search: '',
        Page: 1,
        Filters: [{ field: EntityCoreFields.Name, backendField: EntityCoreFields.Name, value: [] }],
        View: 'hierarchy',
      })
    );

    store.set(DataListSnapshotSyncAtomFamily({ dataKey, dataType }), { type: 'reset' });

    const resetFilters = store.get(coreFiltersAtom({ dataType, key: dataKey }));
    expect(resetFilters.map((filter) => filter.field)).toContain(EntityCoreFields.SpeciesName);
    expect(sessionStorage.getItem(dataKey)).toBeNull();
  });
});
