import fromPairs from 'lodash/fromPairs';
import mapValues from 'lodash/mapValues';
import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import isNil from 'lodash/isNil';
import pick from 'lodash/pick';
import get from 'lodash/get';
import map from 'lodash/map';

import { EXPERIMENTAL_DATATYPES } from '@/entity-configuration/domain/experimental';
import { SIMULATIONS_DATATYPES } from '@/entity-configuration/domain/simulation';
import { MODEL_DATATYPES } from '@/entity-configuration/domain/model';
import { getEntitiesByGroup, getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { getViewDefinitionsByLegacyType } from '@/entity-configuration/definitions/view-defs';
import { DataType } from '@/constants/explore-section/list-views';

import type { EntityCoreTypeGroup } from '@/entity-configuration/domain/types';
import type { LibraryBookmark } from '@/api/virtual-lab-svc/queries/types';

const BOOKMARK_CATEGORY = ['experimental', 'models', 'simulations'] as const;
type BookmarkCategoryType = (typeof BOOKMARK_CATEGORY)[number];

type ExperimentalDataMap = Partial<
  Record<(typeof EXPERIMENTAL_DATATYPES)[number], Array<LibraryBookmark>>
>;

type ModelDataMap = Partial<Record<(typeof MODEL_DATATYPES)[number], Array<LibraryBookmark>>>;

type SimulationDataMap = Partial<
  Record<(typeof SIMULATIONS_DATATYPES)[number], Array<LibraryBookmark>>
>;

export type GroupedLibraryBookmarks = {
  experimental?: ExperimentalDataMap;
  models?: ModelDataMap;
  simulations?: SimulationDataMap;
};

const getCategory = (key: DataType): string => {
  if (EXPERIMENTAL_DATATYPES.includes(key as (typeof EXPERIMENTAL_DATATYPES)[number]))
    return 'experimental';
  if (MODEL_DATATYPES.includes(key as (typeof MODEL_DATATYPES)[number])) return 'models';
  if (SIMULATIONS_DATATYPES.includes(key as (typeof SIMULATIONS_DATATYPES)[number]))
    return 'simulations';
  return 'unknown';
};

export const groupBookmarksByCategory = (
  data?: Record<DataType, any> | null
): { data: Record<DataType, any> | null; list: GroupedLibraryBookmarks | null } => {
  if (isNil(data) || isEmpty(data)) return { data: null, list: null };
  const entries = Object.entries(data).map(([key, value]) => ({
    key,
    value,
    category: getCategory(key as DataType),
  }));

  const grouped = groupBy(entries, 'category');
  const list = mapValues(grouped, (items) =>
    fromPairs(items.map(({ key, value }) => [key, value]))
  );
  return {
    data,
    list,
  };
};

export function getAvailableTabs(
  category: EntityCoreTypeGroup,
  data: GroupedLibraryBookmarks | null
) {
  const categoriesResultKeys = data ? Object.keys(data).sort() : [];
  const pickedCategory = categoriesResultKeys.at(0);
  const activeCategory = category ?? pickedCategory ?? 'experimental';
  const categoryData = get(data, activeCategory);
  const categoryAvailableTypesKeys = categoryData ? Object.keys(categoryData) : [];
  const items = getEntitiesByGroup({ group: activeCategory });
  const viewDefinitions = getViewDefinitionsByLegacyType(compact(items.map((p) => p.legacyType)));
  const picked = pick(viewDefinitions, categoryAvailableTypesKeys);

  const tabs = map(picked, (item, key) => {
    return {
      key: getEntityByLegacyType({ legacyType: key as DataType })?.slug,
      label: item!.title,
      name: item!.name,
    };
  });

  const availableTypeKeysPerCategory = Object.fromEntries(
    Object.entries(data ?? {}).map(([group, categories]) => [
      group,
      compact(
        Object.keys(categories).map(
          (legacyType) => getEntityByLegacyType({ legacyType: legacyType as DataType })?.slug
        )
      ),
    ])
  );

  return {
    activeCategory,
    availableTypeKeysPerCategory,
    tabs: sortBy(tabs, 'label'),
  };
}
