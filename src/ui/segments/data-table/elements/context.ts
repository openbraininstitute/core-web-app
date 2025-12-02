'use client';

import { atomFamily, atomWithDefault, atomWithReset } from 'jotai/utils';
import { atom } from 'jotai';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { makeTypeDefaultFilters } from '@/ui/segments/data-table/elements/helpers';
import { DEFAULT_PAGE_NUMBER } from '@/constants';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';
import type { CoreFilter } from '@/entity-configuration/definitions/types';
import type { SortState } from '@/types/explore-section/application';

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
    const childAtom = atomWithDefault<Array<CoreFilter>>(() => {
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
    const initialState: SortState = {
      field: EntityCoreFields.CreationDate,
      backendField: EntityCoreFields.CreationDate,
      order: 'desc',
    };

    const writableAtom = atom<SortState, [SortState], void>(initialState, (_, set, update) => {
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
