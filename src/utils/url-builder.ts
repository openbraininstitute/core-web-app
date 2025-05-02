import kebabCase from 'lodash/kebabCase';

import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { toPascalCase } from '@/utils/string';

import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';

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
      return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/explore/${routePrefix}/${usedSlug}/${entityId}`;
    } else if (usedSlug) {
      return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/explore/${routePrefix}/${usedSlug}`;
    } else {
      return (baseUrl = `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/explore/interactive`);
    }
  } else if (!dataType && !entityId) {
    baseUrl = `${baseUri}/explore/interactive`;
  }
  return baseUrl;
}

export function resolveProjectUrl({ virtualLabId, projectId }: WorkspaceContext) {
  return `${baseUri}/lab/${virtualLabId}/project/${projectId}`;
}

export function resolveLibraryUrl({
  ctx,
  category,
  dataType,
}: {
  ctx: WorkspaceContext;
  category?: string; // TODO: build the correct type
  dataType?: DataType;
}) {
  const searchParams = new URLSearchParams();
  let querySegment = '';
  if (category) searchParams.set('c', category);
  if (dataType) searchParams.set('t', kebabCase(toPascalCase(dataType)));
  if (Boolean(searchParams.size)) querySegment = `?${searchParams.toString()}`;

  return `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/library${querySegment}`;
}
