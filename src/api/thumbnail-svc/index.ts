import find from 'es-toolkit/compat/find';
import kebabCase from 'es-toolkit/compat/kebabCase';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import buildQueryString from '@/util/query-params-builder';

function buildAssetUrl(
  resource: EntityCoreResource,
  options?: {
    dpi?: number;
    target?: 'simulation' | 'stimulus';
  }
) {
  let queryParams = '';
  const extension = getEntityByCoreType({ type: resource.type })?.asset.extension;
  const asset = find(resource.assets, { content_type: extension });

  queryParams = buildQueryString({
    dpi: options?.dpi,
    entity_id: resource.id,
    asset_id: asset?.id,
    target: options?.target,
  });

  queryParams = queryParams ? `?${queryParams}` : '';
  let type = kebabCase(resource.type);
  if (resource.type === 'emodel' || resource.type === 'memodel') {
    type = 'model-trace';
  } else if (!asset) {
    throw Error('No Asset found', {
      cause: {
        message: 'No asset found',
        code: 'NoAssetFound',
      },
    });
  }
  return `${config.THUMBNAIL_API_URL}/core/${type}/preview${queryParams}`;
}

export async function getPreviewBlob(
  resource: EntityCoreResource,
  virtualLabId?: string,
  projectId?: string,
  target?: 'simulation' | 'stimulus',
  accept: string = 'image/png'
) {
  const url = buildAssetUrl(resource, { dpi: 400, target });
  const session = await getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: accept,
  };

  if (virtualLabId) headers['virtual-lab-id'] = virtualLabId;
  if (projectId) headers['project-id'] = projectId;

  const response = await fetch(url, {
    method: 'get',
    headers,
  });
  if (!response.ok) {
    throw new Error('Error generating thumbnail', {
      cause: await response.json(),
    });
  }
  const blob = await response.blob();
  return blob;
}
