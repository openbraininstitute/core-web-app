import find from 'es-toolkit/compat/find';
import kebabCase from 'es-toolkit/compat/kebabCase';

import { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import buildQueryString from '@/util/query-params-builder';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';

/** The service's error body: an RFC 9457 problem (`application/problem+json`) with a stable code. */
export type ThumbnailProblem = { status: number; code: string; detail: string };

/** A refused thumbnail request, carrying the service's problem. */
export class ThumbnailError extends Error {
  constructor(readonly problem: ThumbnailProblem) {
    super(problem.detail);
    this.name = 'ThumbnailError';
  }
}

/** Codes for a state that passes on its own (asset still uploading, entitycore busy). */
const TRANSIENT_CODES = new Set(['ASSET_NOT_READY', 'ENTITYCORE_UNAVAILABLE']);

/** True when asking again later may succeed. */
export function isTransientThumbnailError(error: unknown): boolean {
  return error instanceof ThumbnailError && TRANSIENT_CODES.has(error.problem.code);
}

/** The problem of a failed response; a body that is not one (a proxy page) keeps its status. */
async function problemOf(response: Response): Promise<ThumbnailProblem> {
  const body = await response.json().catch(() => null);
  return body && typeof body.code === 'string'
    ? { status: response.status, code: body.code, detail: String(body.detail ?? '') }
    : { status: response.status, code: 'UNKNOWN', detail: response.statusText };
}

/** Resolution for small grid-cell thumbnails. Keeps payloads light. */
export const GRID_PREVIEW_DPI = 100;
/** Resolution for the zoomable detail-view preview, where the user can expand the image. */
export const DETAIL_PREVIEW_DPI = 400;

function buildAssetUrl(
  resource: EntityCoreResource,
  options?: {
    dpi?: number;
    target?: 'simulation' | 'stimulus';
    format?: 'png' | 'webp';
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
    format: options?.format,
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
  accept: string = 'image/webp,image/png',
  dpi: number = GRID_PREVIEW_DPI
) {
  const url = buildAssetUrl(resource, { dpi, target, format: 'webp' });
  const session = await getSession();

  const headers: Record<string, string> = {
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
    throw new ThumbnailError(await problemOf(response));
  }
  const blob = await response.blob();
  return blob;
}
