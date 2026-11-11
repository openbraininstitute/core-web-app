import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

const baseUri = '/declared/scan_config/grid-scan-coordinate-count';

export async function gridScanCoordinateCount({
  ctx,
  payload,
}: {
  ctx: WorkspaceContext;
  payload: Record<string, any>;
}) {
  const api = await obioneApi();
  return await api.post<Response>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'virtual-lab-id': ctx?.virtualLabId,
      'project-id': ctx?.projectId,
    },
    body: payload,
  });
}
