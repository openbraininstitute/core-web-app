import find from 'lodash/find';
import kebabCase from 'lodash/kebabCase';

import buildQueryString from '@/util/query-params-builder';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { thumbnailGenerationBaseUrl } from '@/config';
import { getSession } from '@/authFetch';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';

function buildAssetUrl(resource: EntityCoreResource, options?: { dpi?: number }) {
  let queryParams = '';
  const extension = getEntityByCoreType({ type: resource.type })?.asset.extension;
  const asset = find(resource.assets, { content_type: extension });
  queryParams = buildQueryString({
    dpi: options?.dpi,
    entity_id: resource.id,
    asset_id: asset?.id,
  });
  queryParams = queryParams ? `?${queryParams}` : '';
  const type = kebabCase(resource.type);
  return `${thumbnailGenerationBaseUrl}/core/${type}/preview${queryParams}`;
}

export async function getPreviewBlob(resource: EntityCoreResource, accept: string = 'image/png') {
  const url = buildAssetUrl(resource, { dpi: 400 });
  const session = await getSession();
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: accept,
    },
  });
  if (!response.ok) {
    throw new Error('Error generating thumbnail', { cause: await response.json() });
  }
  const blob = await response.blob();
  return blob;
}
