import { getEntityByCoreType, getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';
import { SerializedEntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { head } from 'lodash';

const baseUri = '/app/virtual-lab';

export function resolveExploreDetailsPageUrl({
  ctx,
  entityId,
  dataType,
}: {
  ctx?: Partial<WorkspaceContext>;
  entityId?: string;
  dataType?: DataType;
}) {
  const entityConfig = getEntityByLegacyType({ legacyType: dataType });
  const slug = entityConfig?.slug; // morphology, e-model, ...
  let usedSlug: string | undefined = slug;
  const routePrefix = entityConfig?.explore.routePrefix; // interactive/experimental, model, simulate
  const basePrefix = entityConfig?.explore.basePrefix; // experimental, model, simulate

  if (basePrefix === 'simulate' && slug) usedSlug = `${slug}/view`;
  let baseUrl = `${baseUri}/explore/${routePrefix}/${usedSlug}`;
  if (entityId) {
    baseUrl = `${baseUrl}/${entityId}`;
  }
  if (ctx && ctx.virtualLabId && ctx.projectId) {
    if (entityId && usedSlug) {
      console.log('\n \n', 'here', routePrefix, usedSlug);
      return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/explore/${routePrefix}/${usedSlug}/${entityId}`;
    }
    if (usedSlug) {
      return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/explore/${routePrefix}/${usedSlug}`;
    }
    return (baseUrl = `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/explore/interactive`);
  }
  if (!dataType && !entityId) {
    baseUrl = `${baseUri}/explore/interactive`;
  }
  return baseUrl;
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
  dataType: EntityTypeEnum;
  entityId: string;
}) {
  const entityConfig = getEntityByCoreType({ type: dataType });
  return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/simulate/${entityConfig?.slug}/${entityId}`;
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
