import { atomFamily, atomWithDefault } from 'jotai/utils';
import { atom } from 'jotai';
import _get from 'es-toolkit/compat/get';

import { columnKeyToFilter } from '@/ui/segments/data-table/elements/column-key-to-filter';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import {
  getViewDefinitionByExtendedType,
  ViewsDefinitionRegistry,
} from '@/entity-configuration/definitions/view-defs';
import { DEFAULT_PAGE_NUMBER } from '@/constants';

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
  ({ dataType, key }: { key: string; dataType: EntityCoreExtendedType }) => {
    const childAtom = atomWithDefault<Array<CoreFilter>>(() => {
      const columns = getViewDefinitionByExtendedType(dataType)?.columns;
      const fields = columns ? getFieldsDefinition(columns) : [];

      return [
        ...(columns
          ?.filter(
            (o) =>
              _get(fields, o, { isFilterable: false })?.isFilterable === true ||
              _get(fields, o, { isDisplayable: false })?.isDisplayable === true
          )
          ?.map((colKey) => columnKeyToFilter(colKey, dataType)) ?? []),
      ];
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
  const childAtom = atom<number>(DEFAULT_PAGE_NUMBER);
  childAtom.debugLabel = `page-number/${key}`;
  return childAtom;
});

export const coreSelectedRowsAtom = atomFamily(
  (_key: string) => atom<Array<any>>([]) // FIXME: get the right type
);
