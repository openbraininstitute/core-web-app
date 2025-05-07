import snakeCase from 'lodash/snakeCase';

export async function downloadArchive(entityType: string, entityIds: []) {
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
