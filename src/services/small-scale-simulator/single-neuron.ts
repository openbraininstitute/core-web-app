import { runSingleNeuronValidation } from '@/api/small-scale-simulator';
import { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  modelId: string;
};

export async function runAnalysis({ ctx, modelId }: Params) {
  const controller = new AbortController();
  const { signal } = controller;

  await runSingleNeuronValidation({ ctx, modelId, signal });

  controller.abort();
}
