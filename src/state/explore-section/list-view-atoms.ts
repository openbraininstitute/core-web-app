import { Atom, atom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh } from 'jotai/utils';
import uniq from 'lodash/uniq';
import isEqual from 'lodash/isEqual';

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
import { DataType, PAGE_NUMBER, PAGE_SIZE } from '@/constants/explore-section/list-views';
import { ExploreESHit, FlattenedExploreESResponse } from '@/types/explore-section/es';
import { Filter } from '@/components/Filter/types';
import {
  selectedBrainRegionWithDescendantsAndAncestorsAtom,
  selectedBrainRegionWithDescendantsAndAncestorsFamily,
} from '@/state/brain-regions';
import { FilterTypeEnum } from '@/types/explore-section/filters';
import { DATA_TYPES_TO_CONFIGS } from '@/constants/explore-section/data-types';
import { ExploreSectionResource } from '@/types/explore-section/resources';

type DataAtomFamilyScopeType = {
  dataType: DataType;
  dataScope?: ExploreDataScope;
  resourceId?: string;
  virtualLabInfo?: VirtualLabInfo;
  isBuildConfig?: boolean;
  key?: string;
};

const isListAtomEqual = (a: DataAtomFamilyScopeType, b: DataAtomFamilyScopeType): boolean =>
  // eslint-disable-next-line lodash/prefer-matches
  a.dataType === b.dataType &&
  a.dataScope === b.dataScope &&
  a.resourceId === b.resourceId &&
  a.isBuildConfig === b.isBuildConfig &&
  a.key === b.key &&
  isEqual(a.virtualLabInfo, b.virtualLabInfo);

export const pageSizeAtom = atom<number>(PAGE_SIZE);

export const pageNumberAtom = atomFamily(
  (_scope: DataAtomFamilyScopeType) => atom<number>(PAGE_NUMBER),
  isListAtomEqual
);

export const selectedRowsAtom = atomFamily(
  (_scope: DataAtomFamilyScopeType) => atom<ExploreESHit<ExploreSectionResource>[]>([]),
  isListAtomEqual
);

export const searchStringAtom = atomFamily(
  (_scope: DataAtomFamilyScopeType) => atom<string>(''),
  isListAtomEqual
);

export const sortStateAtom = atom<SortState | undefined>({ field: 'createdAt', order: 'desc' });

export const activeColumnsAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atomWithDefault<Promise<string[]> | string[]>(async (get) => {
      const dimensionColumns = await get(dimensionColumnsAtom(scope));
      const { columns } = { ...DATA_TYPES_TO_CONFIGS[scope.dataType] };

      return [
        'index',
        ...(dimensionColumns || []),
        ...columns,
        scope.isBuildConfig ? Field.CreationDate : Field.RegistrationDate,
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
        ...columns.map((colKey) => columnKeyToFilter(colKey)),
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
      const sortState = get(sortStateAtom);
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
      const searchString = get(searchStringAtom(scope));

      const pageNumber = get(pageNumberAtom(scope));
      const pageSize = get(pageSizeAtom);
      const sortState = get(sortStateAtom);
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

export const queryResponseAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atom<Promise<FlattenedExploreESResponse<ExploreSectionResource> | null>>(async (get) => {
      const query = await get(queryAtom(scope));
      const result =
        query && (await fetchEsResourcesByType(query, undefined, scope.virtualLabInfo));

      return result;
    }),
  isListAtomEqual
);

export const dataAtom = atomFamily<
  DataAtomFamilyScopeType,
  Atom<Promise<ExploreESHit<ExploreSectionResource>[]>>
>(
  (scope) =>
    atom(async (get) => {
      const response = await get(queryResponseAtom(scope));

      if (response?.hits) {
        if (scope.dataType === DataType.SingleNeuronSynaptome) {
          return await fetchLinkedModel({
            results: response.hits,
            path: '_source.singleNeuronSynaptome.memodel.["@id"]',
            linkedProperty: 'linkedMeModel',
          });
        }
        if (scope.dataType === DataType.SingleNeuronSynaptomeSimulation) {
          return await fetchLinkedModel({
            results: response.hits,
            path: '_source.synaptomeSimulation.synaptome.["@id"]',
            linkedProperty: 'linkedSynaptomeModel',
          });
        }
        return response.hits;
      }
      return [];
    }),
  isListAtomEqual
);

export const totalAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atom(async (get) => {
      const response = await get(queryResponseAtom(scope));
      const { total } = response ?? {
        total: { value: 0 },
      };
      return total?.value;
    }),
  isListAtomEqual
);

export const aggregationsAtom = atomFamily(
  (scope: DataAtomFamilyScopeType) =>
    atom<Promise<FlattenedExploreESResponse<ExploreSectionResource>['aggs'] | undefined>>(
      async (get) => {
        const response = await get(queryResponseAtom(scope));
        return response?.aggs;
      }
    ),
  isListAtomEqual
);
