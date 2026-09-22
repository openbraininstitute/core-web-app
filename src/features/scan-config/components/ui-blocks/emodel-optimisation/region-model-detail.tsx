'use client';

import { useQuery } from '@tanstack/react-query';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

type Props = {
  /** the selected model (`id_str`) whose detail this drawer shows */
  modelId: string;
};

/**
 * Third column of the Parameters Selection tab: the detail view for a single assigned ion channel
 * model. Fetches the full entity (cached via TanStack Query, keyed by workspace + id) and, for now,
 * just dumps its JSON — the real parameter editor will replace this later.
 */
export function RegionModelDetail({ modelId }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };

  const {
    data: model,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: keyBuilder.entity({
      context,
      id: modelId,
      type: ExtendedEntitiesTypeDict.IonChannelModel,
    }),
    queryFn: () =>
      retrieveEntity({ type: ExtendedEntitiesTypeDict.IonChannelModel, id: modelId, ctx: context }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: Boolean(modelId),
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto p-4">
      <h3 className="text-primary-9 text-lg font-bold">
        {isPending ? 'Loading…' : (model?.name ?? 'Ion channel model')}
      </h3>
      <p className="text-sm text-gray-500">Ion channel model</p>

      {isError ? (
        <p className="mt-2 text-sm text-red-500">
          {error instanceof Error ? error.message : 'Failed to load ion channel model.'}
        </p>
      ) : isPending ? (
        <p className="mt-2 text-sm text-gray-400 italic">Loading ion channel model…</p>
      ) : (
        <pre className="mt-2 overflow-x-auto rounded border border-gray-200 bg-white p-3 text-xs text-gray-700">
          {JSON.stringify(model, null, 2)}
        </pre>
      )}
    </div>
  );
}
