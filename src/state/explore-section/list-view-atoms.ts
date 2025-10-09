import { atomFamily, atomWithDefault } from 'jotai/utils';
import { atom, useSetAtom } from 'jotai';
import _get from 'lodash/get';

import columnKeyToFilter from './column-key-to-filter';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { ExploreDataScope, SortState } from '@/types/explore-section/application';
import {
  getViewDefinitionByExtendedType,
  ViewsDefinitionRegistry,
} from '@/entity-configuration/definitions/view-defs';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { CoreFilter } from '@/entity-configuration/definitions/types';
import { DEFAULT_PAGE_NUMBER } from '@/constants';

import type { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';
import type { WorkspaceContext } from '@/types/common';

type DataAtomBinding = {
  key: string;
  resourceId?: string;
  shouldUseIds?: boolean;
  dataType: EntityCoreExtendedType;
  dataScope?: ExploreDataScope;
  workspace?: WorkspaceContext;
  brainRegionId?: string | null;
};

const isListAtomEqual = (a: DataAtomBinding, b: DataAtomBinding): boolean => {
  return a.key === b.key;
};

export const pageNumberAtom = atomFamily((_key: string) => {
  const childAtom = atom<number>(DEFAULT_PAGE_NUMBER);
  childAtom.debugLabel = `page-number/${_key}`;
  return childAtom;
});

export const pageSizeAtom = atomFamily(
  ({ key, defaultSize }: { key: string; defaultSize?: number }) => {
    const childAtom = atom<number | undefined>(defaultSize);
    childAtom.debugLabel = `page-size/${key}`;
    return childAtom;
  },
  (a, b) => a.key === b.key
);

export const selectedRowsAtom = atomFamily(
  (_key: string) => atom<Array<any>>([]) // FIXME: get the right type
);

export const searchStringAtom = atomFamily((_key: string) => atom<string>(''));

export const sortStateAtom = atomFamily(
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

export const activeColumnsAtom = atomFamily(
  (scope: DataAtomBinding) =>
    atomWithDefault<Promise<string[]> | string[]>(async () => {
      const { columns } = { ...ViewsDefinitionRegistry[scope.dataType] };
      return ['index', ...(columns || [])];
    }),
  isListAtomEqual
);

export const filtersAtom = atomFamily((scope: DataAtomBinding) => {
  const childAtom = atomWithDefault<Array<CoreFilter>>(() => {
    const columns = getViewDefinitionByExtendedType(scope.dataType)?.columns;
    const fields = columns ? getFieldsDefinition(columns) : [];

    return [
      ...(columns
        ?.filter(
          (o) =>
            _get(fields, o, { isFilterable: false })?.isFilterable === true ||
            _get(fields, o, { isDisplayable: false })?.isDisplayable === true
        )
        ?.map((colKey) => columnKeyToFilter(colKey, scope.dataType)) ?? []),
    ];
  });
  childAtom.debugLabel = `filter-atom/${scope.key}`;
  return childAtom;
}, isListAtomEqual);

export const previousDataAtom = atomFamily(<T>(ctx: DataAtomBinding) => {
  const childAtom = atom<T[]>([]);
  childAtom.debugLabel = `previous-data-atom/${ctx.key}`;
  return childAtom;
}, isListAtomEqual);

export const entityTargetIdentifiersAtom = atomFamily((key: string) => {
  const childAtom = atom<Array<string>>([]);
  childAtom.debugLabel = `entity-target-identifiers/${key}`;
  return childAtom;
});

export const queryParamsPerEntityTypeAtomFamily = atomFamily((key: string) => {
  const childAtom = atom<Record<string, any> | null>(null);
  childAtom.debugLabel = `query-params-entity-per-type/${key}`;
  return childAtom;
});

const refreshDataAtomFamily = atomFamily((_key: string) =>
  atom<symbol>(Symbol('refreshDataAtomFamily'))
);

export function useRefreshDataAtom(key: string): () => void {
  const setRefresh = useSetAtom(refreshDataAtomFamily(key));

  return () => {
    setRefresh(Symbol('refreshDataAtomFamily'));
  };
}
