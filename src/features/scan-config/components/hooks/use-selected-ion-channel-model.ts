import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getIonChannelModel } from '@/api/entitycore/queries/model/ion-channel-model';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { Config } from '@/features/scan-config/components/components';

function extractModelId(
  config: Config,
  selectedRootElement: string,
  selectedEntry: string
): string | null {
  const root = config[selectedRootElement];
  if (!isPlainObject(root)) return null;

  const entry = root[selectedEntry];
  if (!isPlainObject(entry)) return null;

  const model = entry.ion_channel_model;
  if (!isPlainObject(model)) return null;

  if (String(model.type) === 'IonChannelModelFromID' && typeof model.id_str === 'string') {
    return model.id_str as string;
  }

  return null;
}

export function useSelectedIonChannelModel({
  config,
  selectedEntry,
  selectedRootElement = 'ion_channel_models',
}: {
  config: Config;
  selectedRootElement: string;
  selectedEntry: string;
}) {
  const context = useWorkspace();

  const modelId = useMemo(
    () => extractModelId(config, selectedRootElement, selectedEntry),
    [config, selectedEntry, selectedRootElement]
  );

  const { data, isLoading } = useQuery<IonChannelModel>({
    queryKey: ['ion-channel-model-for-figures', { modelId, context }],
    // biome-ignore lint/style/noNonNullAssertion: query should run only if the modelId exists
    queryFn: () => getIonChannelModel({ id: modelId!, context }),
    enabled: !!modelId,
    staleTime: 5 * 60 * 1000, // 5min
    refetchOnWindowFocus: false,
  });

  return { entity: data ?? null, isLoading: !!modelId && isLoading, modelId };
}
