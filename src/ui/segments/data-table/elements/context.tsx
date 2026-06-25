'use client';

import { isNil, noop } from 'es-toolkit/compat';
import { type Atom, atom, useSetAtom } from 'jotai';
import { atomWithDefault, atomWithReset, atomWithStorage, RESET } from 'jotai/utils';
import { atomFamily } from 'jotai-family';
import { createContext, use, useCallback, useEffect, useMemo } from 'react';
import superjson from 'superjson';
import { match } from 'ts-pattern';

import {
  DEFAULT_PAGE_NUMBER,
  type TWorkspaceScope,
  type TWorkspaceSection,
  WorkspaceSection,
} from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { buildFieldListingContext } from '@/entity-configuration/definitions/listing';
import { SortOrder } from '@/entity-configuration/definitions/types';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import {
  speciesSelectionModeAtom,
  workspaceHierarchySpeciesAtom,
} from '@/features/brain-region-hierarchy/context';
import { createSuperJsonStorage, memoryStorage } from '@/ui/hooks/use-storage-atom-with-validation';
import {
  extractPartsFromDataKey,
  makeDataListStateSnapshotAtomsInitialValue,
  makeTypeDefaultActiveColumns,
  makeTypeDefaultFilters,
} from '@/ui/segments/data-table/elements/helpers';
import { circuitRepresentationViewAtom } from '@/ui/segments/explore/circuit/helpers';

import type { Getter } from 'jotai';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  TCoreFilter,
  TSortState,
  TSortStateList,
} from '@/entity-configuration/definitions/types';

function readFieldListingContext(
  get: Getter,
  listing: {
    dataType: TExtendedEntitiesTypeDict;
    section?: TWorkspaceSection;
    scope?: TWorkspaceScope;
  }
) {
  return buildFieldListingContext({
    ...listing,
    speciesSelectionMode: get(speciesSelectionModeAtom),
    workspaceSpecies: get(workspaceHierarchySpeciesAtom),
  });
}

type DataAtomBinding = {
  key: string;
  dataType: TExtendedEntitiesTypeDict;
  dataScope: TWorkspaceScope;
};

// TODO: this should be removed for the sake of coreActiveColumnsAtom
export const activeColumnsAtom = atomFamily(
  (scope: DataAtomBinding) =>
    atomWithDefault<Promise<string[]> | string[]>(async () => {
      const { columns } = { ...ViewsDefinitionRegistry[scope.dataType] };
      return ['index', ...(columns || [])];
    }),
  (a: DataAtomBinding, b: DataAtomBinding): boolean => a.key === b.key
);

export const coreActiveColumnsAtom = atomFamily(
  ({ dataType, key }: { key: string; dataType: TExtendedEntitiesTypeDict }) =>
    atomWithDefault<Promise<string[]> | string[]>((get) => {
      const { section, scope } = extractPartsFromDataKey(key);
      const listingContext = readFieldListingContext(get, { dataType, section, scope });
      return ['index', ...makeTypeDefaultActiveColumns(listingContext)];
    }),
  (a, b) => a.key === b.key
);

export const coreFiltersAtom = atomFamily(
  ({ dataType, key }: { key: string; dataType: TExtendedEntitiesTypeDict }) => {
    const childAtom = atomWithDefault<Array<TCoreFilter>>((get) => {
      const { section, scope } = extractPartsFromDataKey(key);
      return makeTypeDefaultFilters(readFieldListingContext(get, { dataType, section, scope }));
    });
    childAtom.debugLabel = `filter-atom/${key}`;
    return childAtom;
  },
  (a, b) => a.key === b.key
);

export const coreSearchStringAtom = atomFamily((key: string) => {
  const childAtom = atom<string>('');
  childAtom.debugLabel = `search/${key}`;
  return childAtom;
});

export const coreSortStateAtom = atomFamily(
  (_ctx: { key: string }) => {
    const initialState: TSortStateList = [
      {
        field: EntityCoreFields.RegistrationDate,
        backendField: EntityCoreFields.RegistrationDate,
        order: SortOrder.DESC,
      } satisfies TSortState,
    ];
    return atom<TSortStateList>(initialState);
  },
  (a, b) => a.key === b.key
);

export const corePageNumberAtom = atomFamily((key: string) => {
  const childAtom = atomWithReset<number>(DEFAULT_PAGE_NUMBER);
  childAtom.debugLabel = `page-number/${key}`;
  return childAtom;
});

export const coreSelectedRowsAtom = atomFamily(
  (_key: string) => {
    const childAtom = atom<Array<any>>([]);
    childAtom.debugLabel = `selected-rows/${_key}`;
    return childAtom;
  },
  (a, b) => a === b
);

/**
 * AtomFamily for persisting and restoring data list (table) parameters (filters, sort, page, etc.)
 * state is persisted per dataKey (unique for each data-table context) and entity dataType.
 *
 * This atom uses either sessionStorage (in browser) or an in-memory fallback for SSR/Node.
 */
export const DataListStateSnapshotStorageAtomFamily = atomFamily(
  ({ dataKey, dataType }: { dataKey: string; dataType: TExtendedEntitiesTypeDict }) => {
    const resolvedStorage = typeof window !== 'undefined' ? sessionStorage : memoryStorage;
    const { section, scope } = extractPartsFromDataKey(dataKey);
    const childAtom = atomWithStorage(
      dataKey,
      makeDataListStateSnapshotAtomsInitialValue({ dataType, section, scope }),
      createSuperJsonStorage<ReturnType<typeof makeDataListStateSnapshotAtomsInitialValue>>(
        resolvedStorage
      ),
      { getOnInit: true }
    );
    childAtom.debugLabel = `list-params-storage-${dataKey}`;
    return childAtom;
  },
  (a, b) => a.dataKey === b.dataKey
);

type AtomValue<T> = T extends Atom<infer V> ? V : never;
type TDataLisStateSnapshot = AtomValue<ReturnType<typeof DataListStateSnapshotStorageAtomFamily>>;

const DataListStateSnapshotSyncAction = {
  SYNC: 'sync',
  RESTORE: 'restore',
  RESET: 'reset',
} as const;

type TDataListStateSnapshotSyncActionType =
  (typeof DataListStateSnapshotSyncAction)[keyof typeof DataListStateSnapshotSyncAction];
type TDataListStoreParamsSyncAction =
  | {
      type: Exclude<TDataListStateSnapshotSyncActionType, 'sync'>;
      attribute?: never;
    }
  | {
      type: Extract<TDataListStateSnapshotSyncActionType, 'sync'>;
      attribute: Partial<TDataLisStateSnapshot>;
    };

/**
 * AtomFamily for synchronizing data table (list) UI parameters
 * (filters, sort state, pagination, search string, and optional circuit view)
 * between the core jotai atoms and persistent storage.
 *
 * For a given `dataKey` and `dataType`, it acts as a mediator between in-memory atoms and stored values,
 * allowing bulk SYNC (write), RESTORE (read), and RESET (to factory defaults).
 */
export const DataListSnapshotSyncAtomFamily = atomFamily(
  ({ dataKey, dataType }: { dataKey: string; dataType: TExtendedEntitiesTypeDict }) => {
    const childAtom = atom(
      (get) => {
        const filters = get(coreFiltersAtom({ key: dataKey, dataType }));
        const sort = get(coreSortStateAtom({ key: dataKey }));
        const page = get(corePageNumberAtom(dataKey));
        const search = get(coreSearchStringAtom(dataKey));
        const view = get(circuitRepresentationViewAtom);
        return { filters, page, search, sort, view };
      },
      (get, set, action: TDataListStoreParamsSyncAction) => {
        const readStorage = (): TDataLisStateSnapshot => {
          const { section, scope } = extractPartsFromDataKey(dataKey);
          const listingContext = readFieldListingContext(get, { dataType, section, scope });
          const fallback = makeDataListStateSnapshotAtomsInitialValue(listingContext);
          if (typeof window === 'undefined') {
            return fallback;
          }
          const raw = sessionStorage.getItem(dataKey);
          if (!raw) {
            return fallback;
          }
          try {
            return superjson.parse<TDataLisStateSnapshot>(raw);
          } catch {
            return fallback;
          }
        };

        const writeStorage = (value: TDataLisStateSnapshot) => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(dataKey, superjson.stringify(value));
          }
        };

        return match({ type: action.type })
          .with({ type: DataListStateSnapshotSyncAction.SYNC }, ({ type: t }) => {
            if (t === DataListStateSnapshotSyncAction.SYNC) {
              writeStorage({ ...readStorage(), ...(action.attribute || {}) });
            }
          })
          .with({ type: DataListStateSnapshotSyncAction.RESTORE }, () => {
            const stored = readStorage();
            set(coreFiltersAtom({ key: dataKey, dataType }), stored.Filters);
            set(corePageNumberAtom(dataKey), stored.Page);
            set(coreSearchStringAtom(dataKey), stored.Search);
            set(coreSortStateAtom({ key: dataKey }), stored.Sort);
            set(circuitRepresentationViewAtom, stored.View);
          })
          .with({ type: DataListStateSnapshotSyncAction.RESET }, () => {
            const { section, scope } = extractPartsFromDataKey(dataKey);
            const listingContext = readFieldListingContext(get, { dataType, section, scope });
            const defaultListParams = makeDataListStateSnapshotAtomsInitialValue(listingContext);
            set(coreFiltersAtom({ key: dataKey, dataType }), defaultListParams.Filters);
            set(corePageNumberAtom(dataKey), defaultListParams.Page);
            set(coreSearchStringAtom(dataKey), defaultListParams.Search);
            set(coreSortStateAtom({ key: dataKey }), defaultListParams.Sort);
            set(circuitRepresentationViewAtom, defaultListParams.View);
            set(coreActiveColumnsAtom({ dataType, key: dataKey }), RESET);
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(dataKey);
            }
            DataListStateSnapshotStorageAtomFamily.remove({ dataKey, dataType });
          });
      }
    );
    childAtom.debugLabel = `data-list-store-params-sync-${dataKey}`;
    return childAtom;
  },
  (a, b) => a.dataKey === b.dataKey
);

export type ResetRegistryFn = (key: string, resetFn: () => void) => void;

/**
 * context for registering reset functions for data table atoms.
 * this context is used to register a reset function that will be called when the user leaves the data section.
 * this allows to clear the session storage and reset the atoms when the user navigates away from the data pages.
 */
export const DataListStateSnapshotContext = createContext<ResetRegistryFn | null>(null);

/**
 * hook for synchronizing data list (table) parameters (filters, sort, search, page, etc.)
 * state is synchronized per dataKey (unique for each data-table context) and entity dataType.
 *
 * This hook is used to synchronize the state required to restore the params of data tables (such as filters, sorting, page number).
 * It returns a set of functions to restore, reset, and sync the state to the data-table.
 *
 * It also automatically registers the reset function with the DataResetContext, so that the state is cleared when the user leaves the data section.
 */
export function useDataListStateSnapshotActions({
  dataKey,
  dataType,
  section,
}: {
  dataKey: string;
  dataType: TExtendedEntitiesTypeDict;
  section?: TWorkspaceSection;
}) {
  const updateSync = useSetAtom(
    useMemo(() => DataListSnapshotSyncAtomFamily({ dataKey, dataType }), [dataKey, dataType])
  );

  const registerReset = use(DataListStateSnapshotContext);

  const reset = useCallback(
    () => updateSync({ type: DataListStateSnapshotSyncAction.RESET }),
    [updateSync]
  );

  const restore = useCallback(
    () => updateSync({ type: DataListStateSnapshotSyncAction.RESTORE }),
    [updateSync]
  );

  const sync = useCallback(
    (attribute: Partial<TDataLisStateSnapshot>) =>
      updateSync({ type: DataListStateSnapshotSyncAction.SYNC, attribute }),
    [updateSync]
  );

  useEffect(() => {
    if (registerReset) {
      registerReset(dataKey, reset);
    }
  }, [registerReset, dataKey, reset]);

  if (section !== WorkspaceSection.Data || isNil(section)) {
    return {
      restore: noop,
      reset: noop,
      sync: noop,
    };
  }
  return { restore, reset, sync };
}
