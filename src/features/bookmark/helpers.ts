import fromPairs from 'es-toolkit/compat/fromPairs';
import mapValues from 'es-toolkit/compat/mapValues';
import compact from 'es-toolkit/compat/compact';
import isEmpty from 'es-toolkit/compat/isEmpty';
import groupBy from 'es-toolkit/compat/groupBy';
import sortBy from 'es-toolkit/compat/sortBy';
import isNil from 'es-toolkit/compat/isNil';
import pick from 'es-toolkit/compat/pick';
import get from 'es-toolkit/compat/get';
import map from 'es-toolkit/compat/map';

import { getEntitiesByGroup, getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getViewDefinitionsByLegacyType } from '@/entity-configuration/definitions/view-defs';
import { EXPERIMENTAL_DATATYPES } from '@/entity-configuration/domain/experimental';
import { SIMULATIONS_DATATYPES } from '@/entity-configuration/domain/simulation';
import { MODEL_DATATYPES } from '@/entity-configuration/domain/model';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { LibraryBookmark } from '@/api/virtual-lab-svc/queries/types';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';

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

const getCategory = (key: TExtendedEntitiesTypeDict): string => {
  if (EXPERIMENTAL_DATATYPES.includes(key as (typeof EXPERIMENTAL_DATATYPES)[number]))
    return 'experimental';
  if (MODEL_DATATYPES.includes(key as (typeof MODEL_DATATYPES)[number])) return 'models';
  if (SIMULATIONS_DATATYPES.includes(key as (typeof SIMULATIONS_DATATYPES)[number]))
    return 'simulations';
  return 'unknown';
};

export const groupBookmarksByCategory = (
  data?: Record<TExtendedEntitiesTypeDict, any> | null
): {
  data: Record<TExtendedEntitiesTypeDict, any> | null;
  list: GroupedLibraryBookmarks | null;
} => {
  if (isNil(data) || isEmpty(data)) return { data: null, list: null };
  const entries = Object.entries(data).map(([key, value]) => ({
    key,
    value,
    category: getCategory(key as TExtendedEntitiesTypeDict),
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

export function getAvailableTabs(category: TEntityTypeGroup, data: GroupedLibraryBookmarks | null) {
  const categoriesResultKeys = data ? Object.keys(data).sort() : [];
  const pickedCategory = categoriesResultKeys.at(0);
  const activeCategory = category ?? pickedCategory ?? 'experimental';
  const categoryData = get(data, activeCategory);
  const categoryAvailableTypesKeys = categoryData ? Object.keys(categoryData) : [];
  const items = getEntitiesByGroup({ group: activeCategory });
  const viewDefinitions = getViewDefinitionsByLegacyType(compact(items.map((p) => p.extendedType)));
  const picked = pick(viewDefinitions, categoryAvailableTypesKeys);

  const tabs = map(picked, (item, key) => {
    return {
      key: getEntityByExtendedType({ type: key as TExtendedEntitiesTypeDict })?.slug,
      label: item!.title,
      name: item!.name,
    };
  });

  const availableTypeKeysPerCategory = Object.fromEntries(
    Object.entries(data ?? {}).map(([group, categories]) => [
      group,
      compact(
        Object.keys(categories).map(
          (legacyType) =>
            getEntityByExtendedType({ type: legacyType as TExtendedEntitiesTypeDict })?.slug
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
