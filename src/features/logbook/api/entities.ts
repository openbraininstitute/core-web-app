import { queryOptions } from '@tanstack/react-query';
import { isNil, isNotNil } from 'es-toolkit';
import z from 'zod';

import { getEntitiesByRoute, getEntityByRoute } from '@/api/entitycore/queries/general/entity';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { DAY_MS } from '@/features/logbook/constants';
import { EntityType } from '@/features/logbook/types';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IEntity, IProject, TEntityType } from '@/features/logbook/types';

const EntityIdSchema = z.uuid();

const entitiesOfPage = (page: EntityCoreResponse<IEntity>) => page.data;

const routes: Readonly<Partial<Record<TEntityType, string>>> = {
  [EntityType.Simulation]: 'simulation-result',
  [EntityType.BrainRegion]: 'brain-region',
};

export const routeOfType = (type: string): string | null =>
  Object.hasOwn(routes, type) ? (routes[type as TEntityType] ?? null) : null;

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

export function coreTypeOf(type: string): TExtendedEntitiesTypeDict | null {
  const mapped = Object.hasOwn(coreOfBlock, type) ? coreOfBlock[type as TEntityType] : undefined;
  if (isNotNil(mapped)) return mapped;
  return coreTypes.has(type) ? (type as TExtendedEntitiesTypeDict) : null;
}

export const blockTypeOf = (coreType: TExtendedEntitiesTypeDict): string =>
  blockOfCore.get(coreType) ?? coreType;

export function entityConfigOf(type: string) {
  const coreType = coreTypeOf(type);
  return isNil(coreType) ? null : (getEntityByExtendedType({ type: coreType }) ?? null);
}

const searchOrder: Partial<Record<TEntityType, string>> = { [EntityType.BrainRegion]: 'name' };

export const entityQuery = (type: string, id: string, project: IProject) => {
  const config = entityConfigOf(type);
  const route = routeOfType(type);
  return queryOptions({
    queryKey: keyBuilderLogbook.entity(type, id),
    enabled: (isNotNil(config) || isNotNil(route)) && EntityIdSchema.safeParse(id).success,
    queryFn: async ({ signal }): Promise<IEntity> =>
      isNotNil(config)
        ? ((await config.api.query.one({ id, context: project })) as IEntity)
        : getEntityByRoute<IEntity>({ route: route ?? '', id, context: project, signal }),
    staleTime: DAY_MS,
    retry: false,
  });
};

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
      });
    },
    select: entitiesOfPage,
    staleTime: 60_000,
  });
