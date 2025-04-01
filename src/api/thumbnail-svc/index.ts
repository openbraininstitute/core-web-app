import find from 'lodash/find';

import { getSession } from '@/authFetch';
import { thumbnailGenerationBaseUrl } from '@/config';
import { ENTITY_CORE_DATA_TYPES } from '@/api/entitycore/types/shared/context';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import buildQueryString from '@/util/query-params-builder';

function buildAssetUrl(resource: EntityCoreResource, options?: { dpi?: number }) {
  let queryParams = '';
  const extension = find(Object.values(ENTITY_CORE_DATA_TYPES), {
    type: resource.type,
  })?.assetExtension;
  const asset = find(resource.assets, { content_type: extension });
  queryParams = buildQueryString({
    dpi: options?.dpi,
    entity_id: resource.id,
    asset_id: asset?.id,
  });
  queryParams = queryParams ? `?${queryParams}` : '';
  return `${thumbnailGenerationBaseUrl}/core/${resource.type}/preview${queryParams}`;
}

export async function getPreviewBlob(resource: EntityCoreResource, accept: string = 'image/png') {
  const url = buildAssetUrl(resource, { dpi: 400 });
  const session = await getSession();
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: accept ?? 'image/png',
    },
  });
  if (!response.ok) {
    throw new Error('Error generating thumbnail', { cause: await response.json() });
  }
  const blob = await response.blob();
  return blob;
}
