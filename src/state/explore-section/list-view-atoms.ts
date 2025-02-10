import { atom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh } from 'jotai/utils';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';

import { bookmarksForProjectAtomFamily } from '../virtual-lab/bookmark';
import columnKeyToFilter from './column-key-to-filter';
import { Field } from '@/constants/explore-section/fields-config/enums';

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
import { ExploreESHit } from '@/types/explore-section/es';
import { Filter } from '@/features/listing-filter-panel/types';
import {
  selectedBrainRegionAtom,
  selectedBrainRegionWithDescendantsAndAncestorsAtom,
  selectedBrainRegionWithDescendantsAndAncestorsFamily,
  setSelectedBrainRegionAtomGetter,
} from '@/state/brain-regions';
import { FilterTypeEnum } from '@/types/explore-section/filters';
import { DATA_TYPES_TO_CONFIGS } from '@/constants/explore-section/data-types';
import { ExploreSectionResource } from '@/types/explore-section/resources';
import * as entitycoreApi from '@/http/entitycore/queries';
import { transformFiltersToQuery } from '@/http/entitycore/transformers';

type DataAtomFamilyScopeType = {
  dataType: DataType;
  dataScope?: ExploreDataScope;
  resourceId?: string;
  virtualLabInfo?: VirtualLabInfo;
  key: string;
};

const isListAtomEqual = (a: DataAtomFamilyScopeType, b: DataAtomFamilyScopeType): boolean =>
  a.key === b.key;

export const pageSizeAtom = atom<number>(PAGE_SIZE);

export const pageNumberAtom = atomFamily((_key: string) => atom<number>(PAGE_NUMBER));

export const selectedRowsAtom = atomFamily((_key: string) =>
  atom<ExploreESHit<ExploreSectionResource>[]>([])
);

export const searchStringAtom = atomFamily((_key: string) => atom<string>(''));

export const sortStateAtom = atomFamily((scope: DataAtomFamilyScopeType) => {
  const initialState: SortState = isExperimentalData(scope.dataType)
    ? { field: Field.CreationDate, order: 'desc' }
    : { field: Field.RegistrationDate, order: 'desc' };

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
              aggregationType: 'stats',
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

      const query = fetchDataQuery(
        0,
        1,
        [],
        scope.dataType,
        sortState,
        '',
        descendantAndAncestorIds
      );
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
      const pageSize = get(pageSizeAtom);
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
        pageSize,
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

export const dataAtom = atomFamily(
  (scope) =>
    atom(async (get) => {
      const query = await get(queryAtom(scope));
      const searchString = get(searchStringAtom(scope.key));
      const pageNumber = get(pageNumberAtom(scope.key));
      const pageSize = get(pageSizeAtom);
      const filters = await get(filtersAtom(scope));
      const selectedBrainRegion = get(selectedBrainRegionAtom);

      // TODO: sorting should be fixed at the end, it's related to too many changes that break things
      const sortState = get(sortStateAtom(scope));
      const queryParams = transformFiltersToQuery(filters);

      if (scope.dataType === DataType.ExperimentalNeuronMorphology) {
        const response = await entitycoreApi.getReconstructionMorphologies({
          filters: {
            page_size: pageSize,
            page: pageNumber - 1,
            search: isEmpty(searchString) ? null : searchString,
            // TODO: ask backend team to extend the brain region filter to support the children of the selected one
            brain_region_id: selectedBrainRegion?.id
              ? Number(selectedBrainRegion?.id.split('/').pop())
              : undefined,
            ...queryParams,
          },
        });

        console.log('ᦨ #  list-view-atoms.ts:226 #  atom #  response:', response);

        return response;
      }
      // const response =
      //   query && (await fetchEsResourcesByType(query, undefined, scope.virtualLabInfo));

      // if (response?.hits) {
      //   if (scope.dataType === DataType.SingleNeuronSynaptome) {
      //     return {
      //       aggs: response.aggs,
      //       total: response.total,
      //       hits: await fetchLinkedModel({
      //         results: response.hits,
      //         path: '_source.singleNeuronSynaptome.memodel.["@id"]',
      //         linkedProperty: 'linkedMeModel',
      //       }),
      //     };
      //   }
      //   if (scope.dataType === DataType.SingleNeuronSynaptomeSimulation) {
      //     return {
      //       aggs: response.aggs,
      //       total: response.total,
      //       hits: await fetchLinkedModel({
      //         results: response.hits,
      //         path: '_source.synaptomeSimulation.synaptome.["@id"]',
      //         linkedProperty: 'linkedSynaptomeModel',
      //       }),
      //     };
      //   }
      //   return response;
      // }
      return null;
    }),
  isListAtomEqual
);

function isExperimentalData(dataType: DataType) {
  return EXPERIMENTAL_DATATYPES.includes(dataType);
}
