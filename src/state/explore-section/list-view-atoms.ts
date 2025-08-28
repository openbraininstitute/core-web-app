import { atomFamily, atomWithDefault, loadable } from 'jotai/utils';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import isEmpty from 'lodash/isEmpty';
import flatMap from 'lodash/flatMap';
import _get from 'lodash/get';
import pMap from 'p-map';

import columnKeyToFilter from './column-key-to-filter';
import {
  EntityCoreFields,
  CoreFieldFilterTypeEnum,
} from '@/entity-configuration/definitions/fields-defs/enums';

import { DataType, PAGE_NUMBER, PAGE_SIZE } from '@/constants/explore-section/list-views';
import { ExploreDataScope, SortState } from '@/types/explore-section/application';
import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import { getCircuits } from '@/api/entitycore/queries/model/circuit';
import { useUnwrappedValue } from '@/hooks/hooks';

import {
  getViewDefinitionByLegacyType,
  ViewsDefinitionRegistry,
} from '@/entity-configuration/definitions/view-defs';
import { DEFAULT_BRAIN_REGION_HIERARCHY_ID } from '@/features/brain-region-hierarchy/context';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { CoreFilter } from '@/entity-configuration/definitions/types';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { compactRecord } from '@/utils/dictionary';
import {
  buildFilteredHierarchyTree,
  circuitHierarchy,
  circuitRepresentationAtom,
  hierarchyByExtractionDerivationAtomFamily,
  HierarchyOutputNode,
} from '@/features/entities/circuit/elements/context';

import type {
  EntityCorePagination,
  EntityCoreResponse,
} from '@/api/entitycore/types/shared/response';
import type { EntityCoreLegacyType } from '@/entity-configuration/domain/helpers';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

type DataAtomBinding = {
  key: string;
  resourceId?: string;
  shouldUseIds?: boolean;
  dataType: EntityCoreLegacyType;
  dataScope?: ExploreDataScope;
  workspace?: WorkspaceContext;
  brainRegionId?: string | null;
};

const isListAtomEqual = (a: DataAtomBinding, b: DataAtomBinding): boolean => {
  return a.key === b.key;
};

export const pageNumberAtom = atomFamily((_key: string) => {
  const childAtom = atom<number>(PAGE_NUMBER);
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
    const columns = getViewDefinitionByLegacyType(scope.dataType)?.columns;
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

export const circuitHierarchyFiltered = atomFamily(
  ({
    key,
    virtualLabId,
    projectId,
    brainRegionId,
  }: { key: string; brainRegionId: string | null | undefined } & Partial<WorkspaceContext>) => {
    const childAtom = atom(async (get) => {
      const sortState = get(sortStateAtom({ key }));
      const searchString = get(searchStringAtom(key));
      const pageNumber = get(pageNumberAtom(key));
      const filters = get(filtersAtom({ dataType: DataType.Circuit, key }));

      const queryParameters = compactRecord({
        page_size: PAGE_SIZE,
        page: pageNumber,
        search: isEmpty(searchString) ? null : searchString,
        order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.backendField}`,
        within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
        within_brain_region_brain_region_id: brainRegionId,
        within_brain_region_ascendants: false,
        ...transformFiltersToQuery(filters as any),
      });

      const first = await getCircuits({
        withFacets: false,
        context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
        filters: { ...queryParameters, page: 1, page_size: PAGE_SIZE },
      });

      const totalPages = Math.ceil(first.pagination.total_items / first.pagination.page_size);
      const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

      const responses = await pMap(
        pages,
        (page) =>
          getCircuits({
            withFacets: false,
            context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
            filters: { ...queryParameters, page, page_size: PAGE_SIZE },
          }),
        { concurrency: 5 }
      );

      const allData = flatMap(responses, (r) => r.data);

      return {
        data: allData.map((p) => ({ ...p, isFiltered: true })),
        facets: undefined,
        pagination: {} as EntityCorePagination,
      };
    });

    childAtom.debugLabel = `circuit-filtered/${key}`;
    return childAtom;
  },
  (a, b) => a.key === b.key
);

export const dataAtom = atomFamily(<T extends EntityCoreObjectTypes>(ctx: DataAtomBinding) => {
  const refreshDataAtom = refreshDataAtomFamily(ctx.key);

  const childAtom = atom<Promise<EntityCoreResponse<T>>>(
    async (get): Promise<EntityCoreResponse<T>> => {
      get(refreshDataAtom);
      const sortState = get(sortStateAtom({ key: ctx.key }));
      const searchString = get(searchStringAtom(ctx.key));
      const extraPerTypeQueryParams = get(queryParamsPerEntityTypeAtomFamily(ctx.key));
      const pageNumber = get(pageNumberAtom(ctx.key));
      const filters = get(filtersAtom(ctx));
      // TODO: better handling when we have IDs filter
      if (ctx.shouldUseIds) {
        const IDs = get(entityTargetIdentifiersAtom(ctx.key));
        if (IDs.length) {
          filters.push({
            constraint: 'id__in',
            field: EntityCoreFields.ID,
            type: CoreFieldFilterTypeEnum.WithinList,
            value: IDs,
          });
        } else {
          return {
            data: [],
            pagination: {
              total_items: 0,
              page: 1,
              page_size: PAGE_SIZE,
            },
          } as EntityCoreResponse<T>;
        }
      }

      const queryParameters = compactRecord({
        page_size: PAGE_SIZE,
        page: pageNumber,
        search: isEmpty(searchString) ? null : searchString,
        order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.backendField}`,
        within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
        within_brain_region_brain_region_id: ctx.brainRegionId,
        within_brain_region_ascendants: false,
        ...transformFiltersToQuery(filters as any),
        ...extraPerTypeQueryParams,
      });

      const entity = getEntityByLegacyType({ legacyType: ctx.dataType as EntityCoreLegacyType });

      if (entity?.type === EntityTypeEnum.Circuit) {
        const representation = get(circuitRepresentationAtom);
        if (representation === 'hierarchy') {
          const hierarchy = await get(
            hierarchyByExtractionDerivationAtomFamily({ key: ctx.key, ...ctx.workspace })
          );
          const result = await get(circuitHierarchy({ key: ctx.key, ...ctx.workspace }));
          const filteredResult = await get(
            circuitHierarchyFiltered({
              key: ctx.key,
              ...ctx.workspace,
              brainRegionId: ctx.brainRegionId,
            })
          );

          return {
            // @ts-expect-error
            data: buildFilteredHierarchyTree(
              hierarchy,
              result,
              filteredResult
            ) as unknown as HierarchyOutputNode[],
            pagination: result.pagination,
            facets: result.facets,
          };
        }
      }

      if (entity && entity.api.query.list) {
        const response = await entity.api.query.list({
          withFacets: entity.api.config.allowedFacets,
          filters: queryParameters,
          context: ctx.workspace,
        });
        return response as EntityCoreResponse<T>;
      }

      return {
        data: [],
        pagination: {
          total_items: 0,
          page: 1,
          page_size: PAGE_SIZE,
        },
      } as EntityCoreResponse<T>;
    }
  );
  childAtom.debugLabel = `data-atom/${ctx.key}`;
  return childAtom;
}, isListAtomEqual);

export function useDataAtom<T>(ctx: DataAtomBinding) {
  const prevData = useAtomValue(previousDataAtom(ctx));
  const data = useUnwrappedValue(dataAtom(ctx));
  const isLoading = useAtomValue(loadable(dataAtom(ctx))).state === 'loading';

  return { result: [...prevData, ...(data?.data ?? [])] as Array<T>, isLoading };
}
