import { runMeshSkeletonizationBatch } from '@/api/small-scale-simulator';
import { readNdjsonResponse } from '@/utils/response';

import type { Message } from '@/services/small-scale-simulator/types';
import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  configIds: string[];
  signal?: AbortSignal;
  onInit?: () => void;
  onMessage?: (message: Message<null>) => void;
};

export async function runSkeletonizationBatch({
  ctx,
  configIds,
  signal,
  onInit,
  onMessage,
}: Params) {
  const res = await runMeshSkeletonizationBatch({ ctx, configIds, signal });

  onInit?.();

  await readNdjsonResponse<Message<null>>(res, onMessage);
}
