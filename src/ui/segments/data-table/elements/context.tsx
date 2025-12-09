'use client';

import { atomFamily, atomWithDefault, atomWithReset, atomWithStorage } from 'jotai/utils';
import { use, useCallback, useEffect, useMemo, createContext } from 'react';
import { isNil, noop } from 'es-toolkit/compat';
import { Atom, atom, useSetAtom } from 'jotai';
import { match } from 'ts-pattern';

import { createSuperJsonStorage, memoryStorage } from '@/ui/hooks/use-storage-atom-with-validation';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { circuitRepresentationViewAtom } from '@/ui/segments/explore/circuit/helpers';
import {
  DEFAULT_PAGE_NUMBER,
  TWorkspaceScope,
  TWorkspaceSection,
  WorkspaceSection,
} from '@/constants';
import { SortOrder } from '@/entity-configuration/definitions/types';
import {
  makeDataListStateSnapshotAtomsInitialValue,
  makeTypeDefaultFilters,
} from '@/ui/segments/data-table/elements/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TCoreFilter, TSortState } from '@/entity-configuration/definitions/types';
import type { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';

type DataAtomBinding = {
  key: string;
  dataType: EntityCoreExtendedType;
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
  ({ dataType }: { key: string; dataType: EntityCoreExtendedType }) =>
    atomWithDefault<Promise<string[]> | string[]>(async () => {
      const { columns } = { ...ViewsDefinitionRegistry[dataType] };
      return ['index', ...(columns || [])];
    }),
  (a, b) => a.key === b.key
);

export const coreFiltersAtom = atomFamily(
  ({ dataType, key }: { key: string; dataType: TExtendedEntitiesTypeDict }) => {
    const childAtom = atomWithDefault<Array<TCoreFilter>>(() => {
      return makeTypeDefaultFilters({ dataType });
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
    const initialState: TSortState = {
      field: EntityCoreFields.CreationDate,
      backendField: EntityCoreFields.CreationDate,
      order: SortOrder.DESC,
    };

    const writableAtom = atom<TSortState, [TSortState], void>(initialState, (_, set, update) => {
      set(writableAtom, update);
    });

    return writableAtom;
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
    const initialValue = makeDataListStateSnapshotAtomsInitialValue({ dataType });
    const childAtom = atomWithStorage(
      dataKey,
      initialValue,
      createSuperJsonStorage<typeof initialValue>(resolvedStorage),
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
        const storageAtom = DataListStateSnapshotStorageAtomFamily({ dataKey, dataType });

        return match({ type: action.type })
          .with({ type: DataListStateSnapshotSyncAction.SYNC }, ({ type: t }) => {
            if (t === DataListStateSnapshotSyncAction.SYNC) {
              const attribute = action.attribute || {};
              const oldValue = get(storageAtom);
              set(storageAtom, {
                ...oldValue,
                ...attribute,
              });
            }
          })
          .with({ type: DataListStateSnapshotSyncAction.RESTORE }, () => {
            const stored = get(storageAtom);
            set(coreFiltersAtom({ key: dataKey, dataType }), stored.Filters);
            set(corePageNumberAtom(dataKey), stored.Page);
            set(coreSearchStringAtom(dataKey), stored.Search);
            set(coreSortStateAtom({ key: dataKey }), stored.Sort);
            set(circuitRepresentationViewAtom, stored.View);
          })
          .with({ type: DataListStateSnapshotSyncAction.RESET }, () => {
            const defaultListParams = makeDataListStateSnapshotAtomsInitialValue({ dataType });
            set(coreFiltersAtom({ key: dataKey, dataType }), defaultListParams.Filters);
            set(corePageNumberAtom(dataKey), defaultListParams.Page);
            set(coreSearchStringAtom(dataKey), defaultListParams.Search);
            set(coreSortStateAtom({ key: dataKey }), defaultListParams.Sort);
            set(circuitRepresentationViewAtom, defaultListParams.View);
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
  return {
    restore: () => updateSync({ type: DataListStateSnapshotSyncAction.RESTORE }),
    reset,
    sync: (attribute: Partial<TDataLisStateSnapshot>) =>
      updateSync({ type: DataListStateSnapshotSyncAction.SYNC, attribute }),
  };
}
