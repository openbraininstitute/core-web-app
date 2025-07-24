import { runCircuitSimulation as runCircuitSimulationApi } from '@/api/small-scale-simulator';
import type { Message } from '@/services/small-scale-simulator/types';
import { WorkspaceContext } from '@/types/common';
import { readNdjsonResponse } from '@/utils/response';

type Params = {
  ctx: WorkspaceContext;
  simulationId: string;
  signal?: AbortSignal;
  onMessage?: (message: Message<null>) => void;
};

export async function runSimulation({ ctx, simulationId, signal, onMessage }: Params) {
  const res = await runCircuitSimulationApi({ ctx, simulationId, signal });

  await readNdjsonResponse<Message<null>>(res, onMessage);
}
