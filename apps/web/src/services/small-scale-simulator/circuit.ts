import { runCircuitSimulationBatch } from '@/api/small-scale-simulator';
import { readNdjsonResponse } from '@/utils/response';

import type { Message } from '@/services/small-scale-simulator/types';
import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  simulationIds: string[];
  signal?: AbortSignal;
  onInit?: () => void;
  onMessage?: (message: Message<null>) => void;
};

export async function runSimulationBatch({
  ctx,
  simulationIds,
  signal,
  onInit,
  onMessage,
}: Params) {
  const res = await runCircuitSimulationBatch({ ctx, simulationIds, signal });

  onInit?.();

  await readNdjsonResponse<Message<null>>(res, onMessage);
}
