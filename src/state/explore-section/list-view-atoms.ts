import { atom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh } from 'jotai/utils';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';

import { bookmarksForProjectAtomFamily } from '../virtual-lab/bookmark';
import columnKeyToFilter from './column-key-to-filter';
import { EntityCoreFields } from '@/constants/explore-section/fields-config/enums';

import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { ExploreDataScope, SortState } from '@/types/explore-section/application';
import fetchDataQuery from '@/queries/explore-section/data';
import {
  DataQuery,
  fetchDimensionAggs,
  fetchEsResourcesByType,
  fetchLinkedModel,
  fetchTotalByExperimentAndRegions,
} from '@/api/explore-section/resources';
import {
  DataType,
  EXPERIMENTAL_DATATYPES,
  PAGE_NUMBER,
  PAGE_SIZE,
} from '@/constants/explore-section/list-views';
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
import { EntityCoreLegacyType, getEntityByLegacyType } from '@/api/entitycore/types/shared/context';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

type DataAtomFamilyScopeType = {
  dataType: DataType;
  dataScope?: ExploreDataScope;
  resourceId?: string;
  virtualLabInfo?: VirtualLabInfo;
  key: string;
};

const isListAtomEqual = (a: DataAtomFamilyScopeType, b: DataAtomFamilyScopeType): boolean =>
  a.key === b.key;

export const pageNumberAtom = atomFamily((_key: string) => atom<number>(PAGE_NUMBER));

export const selectedRowsAtom = atomFamily(
  (_key: string) => atom<Array<any>>([]) // FIXME: get the right type
);

export const searchStringAtom = atomFamily((_key: string) => atom<string>(''));

export const sortStateAtom = atomFamily((scope: DataAtomFamilyScopeType) => {
  const initialState: SortState = isExperimentalData(scope.dataType)
    ? { field: EntityCoreFields.CreationDate, order: 'desc' }
    : { field: EntityCoreFields.CreationDate, order: 'desc' };

  const writableAtom = atom<SortState, [SortState], void>(initialState, (_, set, update) => {
    set(writableAtom, update); // Correctly updates the state
  });

  return writableAtom;
}, isListAtomEqual);

export const activeColumnsAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atomWithDefault<Promise<string[]> | string[]>(async (get) => {
      const dimensionColumns = await get(dimensionColumnsAtom(scope));
      const { columns } = { ...DATA_TYPES_TO_CONFIGS[scope.dataType] };

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
    atomWithDefault<Promise<Filter[]>>(async (get) => {
      const { columns } = DATA_TYPES_TO_CONFIGS[scope.dataType];
      const dimensionsColumns = await get(dimensionColumnsAtom(scope));
      return [
        ...columns.map((colKey) => {
          return columnKeyToFilter(colKey);
        }),
        ...(dimensionsColumns || []).map(
          (dimension) =>
            ({
              field: dimension,
              type: FilterTypeEnum.ValueOrRange,
              value: { gte: null, lte: null },
            }) as Filter
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
          ? (await get(bookmarksForProjectAtomFamily(scope.virtualLabInfo)))[scope.dataType]
          : []
      ).map((b) => b.resourceId);

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
      const sortState = get(sortStateAtom(scope));
      const queryParams = transformQueryParamsArrayToString(transformFiltersToQuery(filters));

      const queryParameters = {
        page_size: PAGE_SIZE,
        page: pageNumber,
        search: isEmpty(searchString) ? null : searchString,
        order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.field}`,
        ...queryParams,
      };

      const entity = getEntityByLegacyType(scope.dataType as EntityCoreLegacyType);
      if (entity && entity.queryAll) {
        const response = await entity.queryAll({
          withFacets: entity.allowedFacets,
          filters: {
            ...(entity.allowedParams === 'all'
              ? queryParameters
              : pick(queryParameters, entity.allowedParams ?? [])),
            // TODO: extend the brain region (in EntityCore) filter to support the children of the selected one
            // brain_region_id: selectedBrainRegion?.id
            //   ? Number(selectedBrainRegion?.id.split('/').pop())
            //   : undefined,
          },
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
      } as EntityCoreResponse<T | null>;
    }),
  isListAtomEqual
);

function isExperimentalData(dataType: DataType) {
  return EXPERIMENTAL_DATATYPES.includes(dataType);
}
