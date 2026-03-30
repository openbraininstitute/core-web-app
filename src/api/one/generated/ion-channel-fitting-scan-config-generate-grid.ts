import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

const baseUri = '/generated/ion-channel-fitting-scan-config-generate-grid';

export async function generateIonChannelFittingScanConfigGenerateGrid({
  ctx,
  payload,
}: {
  ctx: WorkspaceContext;
  payload: Record<string, any>;
}): Promise<string> {
  const api = await obioneApi();
  return await api.post<string>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'virtual-lab-id': ctx?.virtualLabId,
      'project-id': ctx?.projectId,
    },
    body: payload,
  });
}
