import { queryOptions } from '@tanstack/react-query';
import { isNil, isNotNil } from 'es-toolkit';

import { getEntitiesByRoute, getEntityByRoute } from '@/api/entitycore/queries/general/entity';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { EntityType } from '@/features/logbook/blocks/kinds';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IProject } from '@/features/logbook/auth/session';
import type { TEntityType } from '@/features/logbook/blocks/kinds';

// EntityCore ids are UUIDs; anything else in a card (page text anyone wrote) never reaches a URL.
const ENTITY_ID = /^[0-9a-f-]{36}$/;

// Routes for the two types core's entity configuration doesn't list.
const routes: Readonly<Partial<Record<TEntityType, string>>> = {
  [EntityType.Simulation]: 'simulation-result',
  [EntityType.BrainRegion]: 'brain-region',
};

export const routeOfType = (type: string): string | null =>
  Object.hasOwn(routes, type) ? (routes[type as TEntityType] ?? null) : null;

// The logbook's own names for five core types; any other core type is stored under core's name.
// Old cards and agents keep writing these names, so they stay.
const coreOfBlock: Readonly<Partial<Record<TEntityType, TExtendedEntitiesTypeDict>>> = {
  [EntityType.Circuit]: ExtendedEntitiesTypeDict.Circuit,
  [EntityType.Morphology]: ExtendedEntitiesTypeDict.CellMorphology,
  [EntityType.Emodel]: ExtendedEntitiesTypeDict.Emodel,
  [EntityType.IonChannelModel]: ExtendedEntitiesTypeDict.IonChannelModel,
  [EntityType.Trace]: ExtendedEntitiesTypeDict.ElectricalCellRecording,
};
const blockOfCore = new Map<string, TEntityType>(
  Object.entries(coreOfBlock).map(([block, core]) => [core, block as TEntityType])
);
const coreTypes = new Set<string>(Object.values(ExtendedEntitiesTypeDict));

/** Core's entity type for a card's type, or null when core has no such type. */
export function coreTypeOf(type: string): TExtendedEntitiesTypeDict | null {
  const mapped = Object.hasOwn(coreOfBlock, type) ? coreOfBlock[type as TEntityType] : undefined;
  if (isNotNil(mapped)) return mapped;
  return coreTypes.has(type) ? (type as TExtendedEntitiesTypeDict) : null;
}

/** What a card stores for a core type picked in the grid. */
export const blockTypeOf = (coreType: TExtendedEntitiesTypeDict): string =>
  blockOfCore.get(coreType) ?? coreType;

/** Core's configuration of a card's type: its title, group and how to fetch one. */
export function entityConfigOf(type: string) {
  const coreType = coreTypeOf(type);
  return isNil(coreType) ? null : (getEntityByExtendedType({ type: coreType }) ?? null);
}

export interface IEntity {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly creation_date?: string;
  readonly created_by?: { readonly pref_label: string };
  readonly brain_region?: { readonly name: string; readonly acronym?: string } | null;
  readonly subject?: { readonly species?: { readonly name: string } | null } | null;
}

const DAY_MS = 86_400_000;

// Newest first, except where EntityCore only sorts by name.
const searchOrder: Partial<Record<TEntityType, string>> = { [EntityType.BrainRegion]: 'name' };

/** One entity, full record; the card and the detail panel share this cache entry. */
export const entityQuery = (type: string, id: string, project: IProject) => {
  const config = entityConfigOf(type);
  const route = routeOfType(type);
  return queryOptions({
    queryKey: keyBuilderLogbook.entity(type, id),
    enabled: (isNotNil(config) || isNotNil(route)) && ENTITY_ID.test(id),
    queryFn: async ({ signal }): Promise<IEntity> =>
      isNotNil(config)
        ? // Any core entity; the card reads only the fields IEntity names.
          ((await config.api.query.one({ id, context: project })) as IEntity)
        : getEntityByRoute<IEntity>({ route: route ?? '', id, context: project, signal }),
    staleTime: DAY_MS,
    retry: false,
  });
};

/** Name search for the types core has no grid for. */
export const entitySearchQuery = (type: TEntityType, search: string, project: IProject) =>
  queryOptions({
    queryKey: keyBuilderLogbook.entitySearch(type, search, project.projectId),
    enabled: isNotNil(routeOfType(type)),
    queryFn: ({ signal }) => {
      const queryParams: Record<string, string> = {
        page_size: '10',
        order_by: searchOrder[type] ?? '-creation_date',
      };
      if (search.trim().length > 0) queryParams.name__ilike = search.trim();
      return getEntitiesByRoute<IEntity>({
        route: routeOfType(type) ?? '',
        queryParams,
        context: project,
        signal,
      }).then((page) => page.data);
    },
    staleTime: 60_000,
  });
