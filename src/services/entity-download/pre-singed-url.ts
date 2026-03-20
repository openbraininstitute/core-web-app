import { isNil, omitBy } from 'es-toolkit/compat';

import { compactRecord } from '@/utils/dictionary';

import type { TEntityTypeDict } from '@/api/entitycore/types';

export async function getEntityCorePresignedUrl({
  entityType,
  virtualLabId,
  projectId,
  entityId,
  configAssetId,
  assetPath,
}: {
  entityType: TEntityTypeDict;
  entityId: string;
  virtualLabId: string;
  projectId: string;
  configAssetId: string;
  assetPath?: string;
}): Promise<{ url: string; size: number }> {
  const url = `${window.location.origin}/api/entity-download/presigned-url`;
  const query = new URLSearchParams();
  const queryParams = compactRecord({
    virtualLabId,
    projectId,
    entityType,
    entityId,
    configAssetId,
    assetPath,
  });

  Object.entries(omitBy(queryParams, isNil) || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => void query.append(`${key}`, `${v}`));
    } else {
      query.append(`${key}`, `${value}`);
    }
  });

  const response = await fetch(`${url}?${query.toString()}`, {
    method: 'get',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (response.ok) {
    const result = await response.json();
    return result;
  }
  throw new Error('Error creating presigned url', { cause: await response.text() });
}
