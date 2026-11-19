// Platform entities, from EntityCore. Each is read once and cached: a page
// with ten cards of the same circuit makes one call.
import { queryOptions } from '@tanstack/react-query';
import { isNotNil } from 'es-toolkit';

import { getEntitiesByRoute, getEntityByRoute } from '@/api/entitycore/queries/general/entity';
import { EntityType } from '@/features/logbook/blocks/kinds';

import type { IProject } from '@/features/logbook/auth/session';
import type { TEntityType } from '@/features/logbook/blocks/kinds';

// The EntityCore route of each type the log can link.
const routes: Readonly<Record<TEntityType, string>> = {
  [EntityType.Circuit]: 'circuit',
  [EntityType.Morphology]: 'cell-morphology',
  [EntityType.Emodel]: 'emodel',
  [EntityType.Simulation]: 'simulation-result',
  [EntityType.IonChannelModel]: 'ion-channel-model',
  [EntityType.Trace]: 'electrical-cell-recording',
  [EntityType.BrainRegion]: 'brain-region',
};

const isRouted = (type: string): type is TEntityType => Object.hasOwn(routes, type);

export const routeOfType = (type: string): string | null => (isRouted(type) ? routes[type] : null);

export interface IEntity {
  readonly id: string;
  readonly name: string;
  readonly creation_date?: string;
  readonly created_by?: { readonly pref_label: string };
  readonly brain_region?: { readonly name: string; readonly acronym?: string } | null;
  readonly subject?: { readonly species?: { readonly name: string } | null } | null;
}

const DAY_MS = 86_400_000;

export const entityQuery = (type: string, id: string, project: IProject) =>
  queryOptions({
    queryKey: ['entity', type, id],
    enabled: isNotNil(routeOfType(type)) && id.length > 0,
    queryFn: ({ signal }) =>
      getEntityByRoute<IEntity>({ route: routeOfType(type) ?? '', id, context: project, signal }),
    staleTime: DAY_MS,
    retry: false,
  });

export const entitySearchQuery = (type: TEntityType, search: string, project: IProject) =>
  queryOptions({
    queryKey: ['entity-search', type, search, project.projectId],
    queryFn: ({ signal }) => {
      const queryParams: Record<string, string> = { page_size: '10', order_by: '-creation_date' };
      if (search.trim().length > 0) queryParams.name__ilike = search.trim();
      return getEntitiesByRoute<IEntity>({
        route: routes[type],
        queryParams,
        context: project,
        signal,
      }).then((page) => page.data.map((entity) => ({ ...entity, type })));
    },
    staleTime: 60_000,
  });
