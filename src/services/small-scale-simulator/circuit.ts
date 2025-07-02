import { CircuitSimulationExecutionStatus } from '@/api/entitycore/types/entities/circuit-simulation-execution';
import { runCircuitSimulation as runCircuitSimulationApi } from '@/api/small-scale-simulator';
import { WorkspaceContext } from '@/types/common';
import { readNdjsonResponse } from '@/utils/response';

type Message = {
  status: CircuitSimulationExecutionStatus;
  extra?: string;
};

type Params = {
  ctx: WorkspaceContext;
  simulationId: string;
  signal?: AbortSignal;
  onMessage?: (message: Message) => void;
};

export async function runCircuitSimulation({ ctx, simulationId, signal, onMessage }: Params) {
  const res = await runCircuitSimulationApi({ ctx, simulationId, signal });

  readNdjsonResponse<Message>(res, onMessage);
}
