import kebabCase from 'lodash/kebabCase';

import { getEntityByLegacyType } from '@/api/entitycore/types/shared/context';
import { toPascalCase } from '@/utils/string';

import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/app/virtual-lab';

export function resolveExploreDetailsPageUrl({
  ctx,
  entityId,
  dataType,
}: {
  ctx?: WorkspaceContext;
  entityId: string;
  dataType: DataType;
}) {
  const entityConfig = getEntityByLegacyType({ legacyType: dataType });
  let slug = entityConfig?.slug; // morphology, e-model, ...
  const routePrefix = entityConfig?.exploreRoutePrefix; // interactive/experimental, model, simulate
  if (routePrefix === 'simulate') slug = `${slug}/view`;
  let baseUrl = `${baseUri}/explore/${routePrefix}/${slug}/${entityId}`;
  if (ctx) {
    baseUrl = `${baseUri}/lab/${ctx.virtualLabId}/project/${ctx.projectId}/explore/${routePrefix}/${slug}/${entityId}`;
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
