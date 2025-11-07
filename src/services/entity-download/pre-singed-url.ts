import { TEntityTypeDict } from '@/api/entitycore/types';

export async function getEntityCorePresignedUrl({
  entityType,
  virtualLabId,
  projectId,
  entityId,
  configAssetId,
}: {
  entityType: TEntityTypeDict;
  entityId: string;
  virtualLabId: string;
  projectId: string;
  configAssetId: string;
}): Promise<{ url: string; size: number }> {
  const url = `${window.location.origin}/api/entity-download/presigned-url`;
  const query = new URLSearchParams();
  query.set('entityType', entityType);
  query.set('entityId', entityId);
  query.set('virtualLabId', virtualLabId);
  query.set('projectId', projectId);
  query.set('configAssetId', configAssetId);

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
