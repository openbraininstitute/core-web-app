import { atom, useAtom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh } from 'jotai/utils';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import _get from 'lodash/get';

import { bookmarksForProjectAtomFamily } from '../virtual-lab/bookmark';
import columnKeyToFilter from './column-key-to-filter';
import { EntityCoreFields } from '@/constants/explore-section/fields-config/enums';

import { ExploreDataScope, SortState } from '@/types/explore-section/application';
import fetchDataQuery from '@/queries/explore-section/data';
import {
  DataQuery,
  fetchDimensionAggs,
  fetchEsResourcesByType,
  fetchLinkedModel,
  fetchTotalByExperimentAndRegions,
} from '@/api/explore-section/resources';
import { DataType, PAGE_NUMBER, PAGE_SIZE } from '@/constants/explore-section/list-views';
import { Filter } from '@/features/listing-filter-panel/types';
import {
  selectedBrainRegionAtom,
  selectedBrainRegionWithDescendantsAndAncestorsAtom,
  selectedBrainRegionWithDescendantsAndAncestorsFamily,
  setSelectedBrainRegionAtomGetter,
} from '@/state/brain-regions';
import { FilterTypeEnum } from '@/types/explore-section/filters';
import { DATA_TYPES_TO_CONFIGS } from '@/constants/explore-section/data-types';
import {
  transformFiltersToQuery,
  transformQueryParamsArrayToString,
} from '@/api/entitycore/transformers';
import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import type { EntityCoreLegacyType } from '@/entity-configuration/domain/helpers';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { WorkspaceContext } from '@/types/common';
import { useUnwrappedValue } from '@/hooks/hooks';
import {
  getViewDefinitionByLegacyType,
  ViewsDefinitionRegistry,
} from '@/entity-configuration/definitions/view-defs';
import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields-defs/enums';
import { CoreFilter } from '@/entity-configuration/definitions/types';
import { getFieldsDefinition } from '@/entity-configuration/definitions';

type DataAtomFamilyScopeType = {
  key: string;
  resourceId?: string;
  shouldUseIds?: boolean;
  targetIds?: Array<string>;
  dataType: DataType;
  dataScope?: ExploreDataScope;
  virtualLabInfo?: WorkspaceContext;
};

const isListAtomEqual = (a: DataAtomFamilyScopeType, b: DataAtomFamilyScopeType): boolean =>
  a.key === b.key;

export const pageNumberAtom = atomFamily((_key: string) => atom<number>(PAGE_NUMBER));

export const selectedRowsAtom = atomFamily(
  (_key: string) => atom<Array<any>>([]) // FIXME: get the right type
);

export const searchStringAtom = atomFamily((_key: string) => atom<string>(''));

export const sortStateAtom = atomFamily((scope: DataAtomFamilyScopeType) => {
  const initialState: SortState = { field: EntityCoreFields.CreationDate, order: 'desc' };

  const writableAtom = atom<SortState, [SortState], void>(initialState, (_, set, update) => {
    set(writableAtom, update); // Correctly updates the state
  });

  return writableAtom;
}, isListAtomEqual);

export const activeColumnsAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atomWithDefault<Promise<string[]> | string[]>(async (get) => {
      const dimensionColumns = await get(dimensionColumnsAtom(scope));
      const { columns } = { ...ViewsDefinitionRegistry[scope.dataType] };

      return [
        'index',
        ...(dimensionColumns || []),
        ...columns,
        // isExperimentalData(scope.dataType) ? Field.RegistrationDate : Field.CreationDate,
      ];
    }),
  isListAtomEqual
);

export const dimensionColumnsAtom = atomFamily((scope: DataAtomFamilyScopeType) =>
  atom<Promise<string[] | null>>(async () => {
    // if the type is not simulation campaign, we dont fetch dimension columns
    if (scope.dataType !== DataType.SimulationCampaigns) {
      return null;
    }
    const dimensionsResponse = await fetchDimensionAggs(scope.virtualLabInfo);
    const dimensions: string[] = [];
    dimensionsResponse.hits.forEach((response: any) => {
      if (response._source.parameter?.coords) {
        dimensions.push(...Object.keys(response._source.parameter?.coords));
      }
    });

    return uniq(dimensions);
  })
);

export const filtersAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atomWithDefault<Promise<Array<CoreFilter>>>(async (get) => {
      const columns = getViewDefinitionByLegacyType(scope.dataType)?.columns;
      const fields = columns ? getFieldsDefinition(columns) : [];

      const dimensionsColumns = await get(dimensionColumnsAtom(scope));
      return [
        ...(columns
          ?.filter(
            (o) =>
              _get(fields, o)?.isFilterable === true ||
              typeof _get(fields, o)?.isFilterable === 'undefined' // TODO: should be changed in the next commit
          )
          ?.map((colKey) => columnKeyToFilter(colKey)) ?? []),
        ...(dimensionsColumns || []).map(
          (dimension) =>
            ({
              field: dimension,
              type: CoreFieldFilterTypeEnum.ValueOrRange,
              value: { gte: null, lte: null },
            }) as CoreFilter
        ),
      ];
    }),
  isListAtomEqual
);

export const totalByExperimentAndRegionsAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atom<Promise<number | undefined | null>>(async (get) => {
      const sortState = get(sortStateAtom(scope));
      let descendantAndAncestorIds: string[] = [];

      if (scope.dataScope === ExploreDataScope.SelectedBrainRegion)
        descendantAndAncestorIds =
          (await get(selectedBrainRegionWithDescendantsAndAncestorsAtom)) || [];

      const query = fetchDataQuery(1, [], scope.dataType, sortState, '', descendantAndAncestorIds);
      const result =
        query && (await fetchTotalByExperimentAndRegions(query, undefined, scope.virtualLabInfo));

      return result;
    }),
  isListAtomEqual
);

export const queryAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atomWithRefresh<Promise<DataQuery | null>>(async (get) => {
      const searchString = get(searchStringAtom(scope.key));
      const pageNumber = get(pageNumberAtom(scope.key));
      const sortState = get(sortStateAtom(scope));
      const bookmarkResourceIds = (
        scope.dataScope === ExploreDataScope.BookmarkedResources && scope.virtualLabInfo
          ? (
              (await get(bookmarksForProjectAtomFamily(scope.virtualLabInfo))) as Record<
                string,
                any
              >
            )[scope.dataType] || []
          : []
      ).map((b: { resourceId: string }) => b.resourceId);

      const descendantIds: string[] =
        scope.dataScope === ExploreDataScope.SelectedBrainRegion ||
        ExploreDataScope.BuildSelectedBrainRegion
          ? (await get(
              selectedBrainRegionWithDescendantsAndAncestorsFamily(
                scope.dataScope === ExploreDataScope.SelectedBrainRegion ? 'explore' : 'build'
              )
            )) || []
          : [];

      const filters = await get(filtersAtom(scope));

      if (!filters) {
        return null;
      }

      return fetchDataQuery(
        pageNumber,
        filters,
        scope.dataType,
        sortState,
        searchString,
        descendantIds,
        bookmarkResourceIds
      );
    }),

  isListAtomEqual
);

export const previousDataAtom = atomFamily(
  <T>(_scope: DataAtomFamilyScopeType) => atom<Array<T>>([]),
  isListAtomEqual
);

export const dataAtom = atomFamily(
  <T>(scope: DataAtomFamilyScopeType) =>
    atom<Promise<EntityCoreResponse<T | null>>>(async (get) => {
      const searchString = get(searchStringAtom(scope.key));
      const pageNumber = get(pageNumberAtom(scope.key));
      const filters = await get(filtersAtom(scope));

      // TODO: better handling when we have IDs filter
      if (scope.shouldUseIds) {
        if (scope.targetIds && Boolean(scope.targetIds?.length)) {
          filters.push({
            constraint: 'id__in',
            field: 'id',
            type: CoreFieldFilterTypeEnum.CheckList,
            value: scope.targetIds,
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

      const sortState = get(sortStateAtom(scope));
      const queryParams = transformQueryParamsArrayToString(
        transformFiltersToQuery(filters as any)
      );

      const queryParameters = {
        page_size: PAGE_SIZE,
        page: pageNumber,
        search: isEmpty(searchString) ? null : searchString,
        order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.field}`,
        ...queryParams,
      };

      const entity = getEntityByLegacyType({ legacyType: scope.dataType as EntityCoreLegacyType });
      if (entity && entity.api.query.list) {
        const response = await entity.api.query.list({
          withFacets: entity.api.config.allowedFacets,
          filters: {
            ...(entity.api.config.allowedParams === 'all'
              ? queryParameters
              : pick(queryParameters, entity.api.config.allowedParams ?? [])),
            // TODO: extend the brain region (in EntityCore) filter to support the children of the selected one
            // brain_region_id: selectedBrainRegion?.id
            //   ? Number(selectedBrainRegion?.id.split('/').pop())
            //   : undefined,
          },
          context: scope.virtualLabInfo,
        });

        return {
          ...response,
          data: response.data.map((o: T) => ({
            ...o,
            type: entity.type,
          })) as Array<T>,
        };
      }

      return {
        data: [],
        pagination: {
          total_items: 0,
          page: 1,
          page_size: PAGE_SIZE,
        },
      } as EntityCoreResponse<T>;
    }),
  isListAtomEqual
);

export function useDataAtom<T>(
  dataContext: {
    virtualLabInfo?: WorkspaceContext;
    dataScope: ExploreDataScope;
    dataType: DataType;
    shouldUseIds?: boolean;
    targetIds?: Array<string>;
  },
  key: string
): Array<T> {
  const [prevData] = useAtom(previousDataAtom({ ...dataContext, key }));
  const data = useUnwrappedValue(
    dataAtom({
      ...dataContext,
      key,
    })
  );

  return [...prevData, ...(data?.data ?? [])] as Array<T>;
}
