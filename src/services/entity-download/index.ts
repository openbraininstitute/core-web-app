import snakeCase from 'lodash/snakeCase';

import { EntityTypeValue } from '@/api/entitycore/types';

export async function downloadArchive(entityType: EntityTypeValue, entityIds: string[]) {
  const searchParams = new URLSearchParams();
  entityIds.forEach((id) => searchParams.append('entityIds', id));

  const entityTypeRouteSegment = snakeCase(entityType);

  const url = `/api/entity-download/${entityTypeRouteSegment}?${searchParams.toString()}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = '';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
