import { atom, useAtomValue } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh } from 'jotai/utils';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import _get from 'lodash/get';

import { bookmarksForProjectAtomFamily } from '../virtual-lab/bookmark';
import columnKeyToFilter from './column-key-to-filter';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { ExploreDataScope, SortState } from '@/types/explore-section/application';
import fetchDataQuery from '@/queries/explore-section/data';
import {
  DataQuery,
  fetchDimensionAggs,
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
import { EntityCoreObjectTypes } from '@/api/entitycore/types';
import { compactRecord } from '@/utils/dictionary';
import {
  DEFAULT_BRAIN_REGION_HIERARCHY_ID,
  useBrainRegionHierarchy,
} from '@/features/brain-region-tree/v2/brain-region/context';

type DataAtomBinding = {
  key: string;
  resourceId?: string;
  shouldUseIds?: boolean;
  targetIds?: Array<string>;
  dataType: EntityCoreLegacyType;
  dataScope?: ExploreDataScope;
  workspace?: WorkspaceContext;
  brainRegionId?: string | null;
};

const isListAtomEqual = (a: DataAtomBinding, b: DataAtomBinding): boolean => {
  return (
    ('brainRegionId' in a ? `${a.key}/${a.brainRegionId}` : a.key) ===
    ('brainRegionId' in b ? `${b.key}/${b.brainRegionId}` : b.key)
  );
};

export const pageNumberAtom = atomFamily((_key: string) => atom<number>(PAGE_NUMBER));

export const selectedRowsAtom = atomFamily(
  (_key: string) => atom<Array<any>>([]) // FIXME: get the right type
);

export const searchStringAtom = atomFamily((_key: string) => atom<string>(''));

export const sortStateAtom = atomFamily((scope: DataAtomBinding) => {
  const initialState: SortState = { field: EntityCoreFields.CreationDate, order: 'desc' };

  const writableAtom = atom<SortState, [SortState], void>(initialState, (_, set, update) => {
    set(writableAtom, update); // Correctly updates the state
  });

  return writableAtom;
}, isListAtomEqual);

export const activeColumnsAtom = atomFamily(
  (scope: DataAtomBinding) =>
    atomWithDefault<Promise<string[]> | string[]>(async (get) => {
      const dimensionColumns = await get(dimensionColumnsAtom(scope));
      const { columns } = { ...ViewsDefinitionRegistry[scope.dataType] };

      return ['index', ...(dimensionColumns || []), ...columns];
    }),
  isListAtomEqual
);

export const dimensionColumnsAtom = atomFamily((scope: DataAtomBinding) =>
  atom<Promise<string[] | null>>(async () => {
    // if the type is not simulation campaign, we dont fetch dimension columns
    if (scope.dataType !== DataType.SimulationCampaigns) {
      return null;
    }
    const dimensionsResponse = await fetchDimensionAggs(scope.workspace);
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
  (scope: DataAtomBinding) =>
    atomWithDefault<Promise<Array<CoreFilter>>>(async (get) => {
      const columns = getViewDefinitionByLegacyType(scope.dataType)?.columns;
      const fields = columns ? getFieldsDefinition(columns) : [];
      const dimensionsColumns = await get(dimensionColumnsAtom(scope));

      return [
        ...(columns
          ?.filter(
            (o) =>
              _get(fields, o, { isFilterable: false })?.isFilterable === true ||
              _get(fields, o, { isDisplayable: false })?.isDisplayable === true
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
  (scope: DataAtomBinding) =>
    atom<Promise<number | undefined | null>>(async (get) => {
      const sortState = get(sortStateAtom(scope));
      let descendantAndAncestorIds: string[] = [];

      if (scope.dataScope === ExploreDataScope.SelectedBrainRegion)
        descendantAndAncestorIds =
          (await get(selectedBrainRegionWithDescendantsAndAncestorsAtom)) || [];

      const query = fetchDataQuery(1, [], scope.dataType, sortState, '', descendantAndAncestorIds);
      const result =
        query && (await fetchTotalByExperimentAndRegions(query, undefined, scope.workspace));

      return result;
    }),
  isListAtomEqual
);

export const queryAtom = atomFamily(
  (scope: DataAtomBinding) =>
    atomWithRefresh<Promise<DataQuery | null>>(async (get) => {
      const searchString = get(searchStringAtom(scope.key));
      const pageNumber = get(pageNumberAtom(scope.key));
      const sortState = get(sortStateAtom(scope));
      const bookmarkResourceIds = (
        scope.dataScope === ExploreDataScope.BookmarkedResources && scope.workspace
          ? ((await get(bookmarksForProjectAtomFamily(scope.workspace))) as Record<string, any>)[
              scope.dataType
            ] || []
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
  <T>(_scope: DataAtomBinding) => atom<Array<T>>([]),
  isListAtomEqual
);

export const dataAtom = atomFamily(<T extends EntityCoreObjectTypes>(ctx: DataAtomBinding) => {
  const childAtom = atom<Promise<EntityCoreResponse<T>>>(
    async (get): Promise<EntityCoreResponse<T>> => {
      const searchString = get(searchStringAtom(ctx.key));
      const pageNumber = get(pageNumberAtom(ctx.key));
      const filters = await get(filtersAtom(ctx));

      // TODO: better handling when we have IDs filter
      if (ctx.shouldUseIds) {
        if (ctx.targetIds && Boolean(ctx.targetIds?.length)) {
          filters.push({
            constraint: 'id__in',
            field: EntityCoreFields.ID,
            type: CoreFieldFilterTypeEnum.CheckList,
            value: ctx.targetIds,
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

      const sortState = get(sortStateAtom(ctx));

      const queryParameters = compactRecord({
        page_size: PAGE_SIZE,
        page: pageNumber,
        search: isEmpty(searchString) ? null : searchString,
        order_by: `${sortState.order === 'asc' ? '+' : '-'}${sortState.field}`,
        within_brain_region_hierachy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
        within_brain_region_brain_region_id: ctx.brainRegionId,
        within_brain_region_ascendants: false,
        ...transformQueryParamsArrayToString(transformFiltersToQuery(filters as any)),
      });

      const entity = getEntityByLegacyType({ legacyType: ctx.dataType as EntityCoreLegacyType });
      if (entity && entity.api.query.list) {
        const response = await entity.api.query.list({
          withFacets: entity.api.config.allowedFacets,
          filters: {
            ...(entity.api.config.allowedParams === 'all'
              ? queryParameters
              : pick(queryParameters, entity.api.config.allowedParams ?? [])),
          },
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
  childAtom.debugLabel = `data-atom/${ctx.key}/${ctx.brainRegionId}`;
  return childAtom;
}, isListAtomEqual);

export function useDataAtom<T>(dataContext: DataAtomBinding): Array<T> {
  const prevData = useAtomValue(previousDataAtom(dataContext));
  const data = useUnwrappedValue(dataAtom(dataContext));

  return [...prevData, ...(data?.data ?? [])] as Array<T>;
}
