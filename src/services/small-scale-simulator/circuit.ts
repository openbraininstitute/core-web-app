import { runCircuitSimulationBatch } from '@/api/small-scale-simulator';
import type { Message } from '@/services/small-scale-simulator/types';
import { WorkspaceContext } from '@/types/common';
import { readNdjsonResponse } from '@/utils/response';

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
