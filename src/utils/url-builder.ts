import kebabCase from 'lodash/kebabCase';

import { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ROOT_ROUTE } from '@/config';
import {
  getEntityByCoreType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';

export const baseUri = '/app/virtual-lab';

export function resolveExploreDetailsPageUrl({
  ctx,
  entityId,
  dataType,
}: {
  ctx: Partial<WorkspaceContext>;
  entityId: string;
  dataType: TExtendedEntitiesTypeDict;
}) {
  return `${ROOT_ROUTE}/${ctx.virtualLabId}/${ctx.projectId}/data/view/${kebabCase(dataType)}/${entityId}`;
}

export function resolveVirtualLabUrl({ virtualLabId }: { virtualLabId: string }) {
  return `${baseUri}/lab/${virtualLabId}`;
}

export function resolveProjectUrl({ virtualLabId, projectId }: WorkspaceContext) {
  return `${baseUri}/lab/${virtualLabId}/project/${projectId}`;
}

export function resolveExperimentUrl({
  ctx,
  entityId,
  dataType,
}: {
  ctx: Required<WorkspaceContext>;
  dataType?: TEntityTypeDict;
  entityId?: string;
}) {
  const entityConfig = getEntityByCoreType({ type: dataType });
  if (entityId) {
    return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/simulate/${entityConfig?.slug}/new/${entityId}`;
  }
  return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/simulate`;
}

export function resolveExperimentUrlByExtendedType({
  ctx,
  entityId,
  dataType,
}: {
  ctx: Required<WorkspaceContext>;
  dataType?: TExtendedEntitiesTypeDict;
  entityId?: string;
}) {
  const entityConfig = getEntityByExtendedType({ type: dataType });
  if (entityId) {
    return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/simulate/${entityConfig?.slug}/new/${entityId}`;
  }
  return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/simulate`;
}

export function resolveLibraryUrl({
  ctx,
  category,
  slug,
}: {
  ctx: WorkspaceContext;
  category?: string; // TODO: build the correct type
  slug?: EntitySlugValue;
}) {
  const searchParams = new URLSearchParams();
  let querySegment = '';
  if (category) searchParams.set('c', category);
  if (slug) searchParams.set('t', slug);
  if (searchParams.size) querySegment = `?${searchParams.toString()}`;

  return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/library${querySegment}`;
}
