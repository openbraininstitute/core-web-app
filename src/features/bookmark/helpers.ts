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

import {
  EXPERIMENT_DATA_TYPE_CONFIG,
  EXPERIMENTAL_DATATYPES,
} from '@/constants/explore-section/data-types/experiment-data-types';
import {
  SIMULATION_DATA_TYPE_CONFIG,
  SIMULATION_DATATYPES,
} from '@/constants/explore-section/data-types/simulation-data-types';
import {
  MODEL_DATA_TYPE_CONFIG,
  MODEL_DATATYPES,
} from '@/constants/explore-section/data-types/model-data-types';
import { getEntitiesByGroup, getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { getViewDefinitionsByLegacyType } from '@/entity-configuration/definitions/view-defs';
import { SimulationTypeNames } from '@/types/simulation/single-neuron';
import { DataType } from '@/constants/explore-section/list-views';

import type { EntityCoreTypeGroup } from '@/entity-configuration/domain/types';
import type { LibraryBookmark } from '@/api/virtual-lab-svc/queries/types';

export const BOOKMARK_CATEGORY = ['experimental', 'models', 'simulations'] as const;
export type BookmarkCategoryType = (typeof BOOKMARK_CATEGORY)[number];

type ExperimentalDataMap = Partial<
  Record<(typeof EXPERIMENTAL_DATATYPES)[number], Array<LibraryBookmark>>
>;

type ModelDataMap = Partial<Record<(typeof MODEL_DATATYPES)[number], Array<LibraryBookmark>>>;

type SimulationDataMap = Partial<
  Record<(typeof SIMULATION_DATATYPES)[number], Array<LibraryBookmark>>
>;

export type GroupedLibraryBookmarks = {
  experimental?: ExperimentalDataMap;
  models?: ModelDataMap;
  simulations?: SimulationDataMap;
};

export const DATA_CATEGORY_TABS = [
  {
    key: 'experimental',
    routePrefix: 'interactive/experimental',
    label: 'Experimental data',
    items: EXPERIMENT_DATA_TYPE_CONFIG,
  },
  {
    key: 'models',
    routePrefix: 'model',
    label: 'Models',
    items: MODEL_DATA_TYPE_CONFIG,
  },
  {
    key: 'simulations',
    routePrefix: 'simulate',
    label: 'Simulations',
    items: SIMULATION_DATA_TYPE_CONFIG,
  },
];

export const MESSAGES = {
  ENTITY_NOT_FOUND: "We couldn't find what you're looking for. It may have been deleted.",
  ENTITY_ALREADY_EXISTS: 'This item already exists. Please check and try again.',
  DATABASE_ERROR: "We're experiencing some issues retrieving data. Please try again later.",
  SERVER_ERROR: 'Something went wrong on our end. Please refresh the page or try again shortly.',
};

export const isSimulation = (t: string | null): t is SimulationTypeNames => {
  return t ? Object.values(SimulationTypeNames).includes(t as SimulationTypeNames) : false;
};

const getCategory = (key: DataType): string => {
  if (EXPERIMENTAL_DATATYPES.includes(key)) return 'experimental';
  if (MODEL_DATATYPES.includes(key)) return 'models';
  if (SIMULATION_DATATYPES.includes(key)) return 'simulations';
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
