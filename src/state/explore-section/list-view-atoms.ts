import { atom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh } from 'jotai/utils';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';

import { bookmarksForProjectAtomFamily } from '../virtual-lab/bookmark';
import columnKeyToFilter from './column-key-to-filter';
import { EntityCoreFields, Field } from '@/constants/explore-section/fields-config/enums';

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
import { ExploreESHit, ExploreResource } from '@/types/explore-section/es';
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
import { ENTITY_CORE_DATA_TYPES } from '@/api/entitycore/types/shared/context';
import * as entitycore from '@/api/entitycore/queries';
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
      console.log(
        'ᦨ #  list-view-atoms.ts:129 #  atomWithDefault<Promise<Filter[]>> #  columns:',
        columns
      );
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

const FetcherMapper = {
  [DataType.ExperimentalNeuronMorphology]: {
    query: entitycore.getReconstructionMorphologies,
    allowedFacets: true,
    allowedParams: 'all',
  },
  [DataType.ExperimentalBoutonDensity]: {
    query: entitycore.getExperimentalBoutonDensities,
    allowedFacets: false,
    allowedParams: ['page_size', 'page'],
  },
  [DataType.ExperimentalNeuronDensity]: {
    query: entitycore.getExperimentalNeuronDensities,
    allowedFacets: false,
    allowedParams: ['page_size', 'page'],
  },
  [DataType.ExperimentalSynapsePerConnection]: {
    query: entitycore.getExperimentalSynapsesPerConnections,
    allowedFacets: false,
    allowedParams: ['page_size', 'page'],
  },
};

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

      if (scope.dataType in FetcherMapper) {
        const subject = FetcherMapper[scope.dataType as keyof typeof FetcherMapper];
        const response = await subject.query({
          withFacets: subject.allowedFacets ? true : undefined,
          filters: {
            ...(subject.allowedParams === 'all'
              ? queryParameters
              : pick(queryParameters, subject.allowedParams)),
            // TODO: extend the brain region (in EntityCore) filter to support the children of the selected one
            // brain_region_id: selectedBrainRegion?.id
            //   ? Number(selectedBrainRegion?.id.split('/').pop())
            //   : undefined,
          },
        });
        return {
          ...response,
          data: response.data.map((o) => ({
            ...o,
            type: getEntityTypeForDataType(scope.dataType),
          })) as T[],
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

// TODO: build unified mapper for all kind of things
function getEntityTypeForDataType(dataType: DataType): string {
  switch (dataType) {
    case DataType.ExperimentalNeuronMorphology:
      return ENTITY_CORE_DATA_TYPES.RECONSTRUCTION_MORPHOLOGY.type;
    case DataType.ExperimentalBoutonDensity:
      return ENTITY_CORE_DATA_TYPES.EXPERIMENTAL_BOUTON_DENSITY.type;
    case DataType.ExperimentalNeuronDensity:
      return ENTITY_CORE_DATA_TYPES.EXPERIMENTAL_NEURON_DENSITY.type;
    case DataType.ExperimentalSynapsePerConnection:
      return ENTITY_CORE_DATA_TYPES.EXPERIMENTAL_SYNAPSES_PER_CONNECTION.type;
    default:
      return '';
  }
}
