import { useRouter } from '@bprogress/next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit';
import { delay } from 'framer-motion';
import { z } from 'zod';

import {
  type ISingleNeuronSynaptome,
  SingleNeuronSynaptomeConfigurationSchema,
  type TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createSingleNeuronSynaptome } from '@/api/small-scale-simulator';
import { tryCatch } from '@/api/utils';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { messages } from '@/i18n/en/synaptome';
import useWorkspace from '@/ui/hooks/use-workspace';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { useBuildSingleNeuronSynaptomeSessionState } from '../../helpers';

export function useBuildSynaptome(sessionId: string): {
  isPending: boolean;
  buildSynaptome: () => Promise<{ entity: ISingleNeuronSynaptome } | undefined>;
} {
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const { push: navigate } = useRouter();
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const mutate = useMutation({
    mutationFn: () => buildSynaptome(virtualLabId, projectId, sessionValue),
    onSuccess: (data) => {
      notification.success({
        message: messages.CreationModelSucceed,
        onClick: () => {
          notification.destroy('model-saved');
        },
        placement: 'topRight',
        key: 'model-saved',
        duration: 3,
      });
      delay(() => {
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(ExtendedEntitiesTypeDict.SingleNeuronSynaptome)}/${data?.entity.id}`
        );
      }, 500);
    },
    onError: (error) => {
      const errorMessage =
        (error as any)?.cause?.error_code === 'INSUFFICIENT_FUNDS'
          ? messages.LowFundsError
          : messages.CreationModelFailed;
      notification.error({
        message: errorMessage,
        duration: 7,
        placement: 'topRight',
        key: 'synaptome-config',
      });
    },
    async onSettled() {
      await queryClient.invalidateQueries({
        queryKey: [
          {
            context: {
              key: `${virtualLabId}/${projectId}/data/${kebabCase(ExtendedEntitiesTypeDict.SingleNeuronSynaptome)}/project`,
            },
          },
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          keyBuilder.activities({
            virtualLabId,
            projectId,
            activity: ActivityValues.Build,
            entityType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
          }),
        ],
      });
    },
  });

  return {
    isPending: mutate.isPending,
    buildSynaptome: () => mutate.mutateAsync(),
  };
}

const mainFormSchema = z.object({
  name: z.string().nonempty().min(1),
  description: z.string().optional(),
  me_model_id: z.string().uuid(),
  seed: z.number().nonnegative(),
});

const buildSynaptome = async (
  virtualLabId: string,
  projectId: string,
  sessionValue: {
    name?: string;
    description?: string;
    memodel?: { id: string; brain_region: { id: string } };
    seed?: number;
    synapseSets?: Map<string, TSingleNeuronSynaptomeConfiguration>;
  } | null
) => {
  const mainForm = mainFormSchema.safeParse({
    name: sessionValue?.name,
    description: sessionValue?.description,
    me_model_id: sessionValue?.memodel?.id,
    seed: sessionValue?.seed,
  });
  const validationPromises = Array.from(sessionValue?.synapseSets?.entries() ?? []).map(
    ([, value]) => SingleNeuronSynaptomeConfigurationSchema.safeParseAsync(value)
  );
  const sets = (await Promise.all(validationPromises)).filter((o) => o.success);
  if (mainForm.success) {
    const { data, error } = await tryCatch(
      createSingleNeuronSynaptome({
        ctx: { virtualLabId, projectId },
        modelInfo: {
          name: mainForm.data?.name as string,
          description: mainForm.data?.description || '',
          seed: mainForm.data?.seed as number,
          memodel_id: mainForm.data?.me_model_id as string,
          brain_region_id: sessionValue?.memodel?.brain_region?.id as string,
          config: {
            synapses: sets.map((o) => o.data),
          },
        },
      })
    );
    if (error) throw new Error(messages.CreateSynaptomeEntityFailed);

    return {
      entity: data.data,
    };
  }
};
