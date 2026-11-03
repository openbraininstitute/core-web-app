import { useQuery } from '@tanstack/react-query';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { useSessionAtomValue } from '@/hooks/hooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ICircuitExample } from '@/ui/segments/project/start/items';

/**
 * One of the homes' circuits, read in this project, as its view and the words beside it both
 * ask for it. A private one is readable only in its own project: elsewhere `readable` is false.
 * Entity Core asks for a token, so without a session — on the public landing — nothing is read and
 * the view falls back to the model's poster.
 */
export function useModelCircuit(example: ICircuitExample) {
  const workspace = useWorkspace();
  const session = useSessionAtomValue();
  const readable =
    !!session && (!example.workspace || workspace.projectId === example.workspace.projectId);
  const { data: circuit, isError } = useQuery({
    queryKey: keyBuilder.oneCircuit({ ...workspace, entityId: example.circuitId }),
    queryFn: () => getCircuit({ id: example.circuitId, context: workspace }),
    enabled: readable,
  });
  return { circuit, isError, readable, workspace };
}
