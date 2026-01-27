'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get, isNil } from 'es-toolkit/compat';
import { createElectricalCellRecording } from '@/api/entitycore/queries';
import { createEtypeClassification } from '@/api/entitycore/queries/annotations/etype-classification';
import { createAsset } from '@/api/entitycore/queries/assets';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ELECTRICAL_CELL_RECORDING_PROGRESS_STEPS } from '@/ui/segments/contribute/electrical-cell-recording/config';

import type { TElectricalCellRecordingForm } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useElectricalCellRecordingPipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TElectricalCellRecordingForm> {
  const queryClient = useQueryClient();
  const { projectId, virtualLabId } = useWorkspace();

  const createElectricalCellRecordingAsync = useMutation({
    mutationFn: (values: TElectricalCellRecordingForm) => {
      const location =
        values.setup.location &&
        !isNil(values.setup.location.x) &&
        !isNil(values.setup.location.y) &&
        !isNil(values.setup.location.z)
          ? { x: values.setup.location.x, y: values.setup.location.y, z: values.setup.location.z }
          : null;

      return createElectricalCellRecording({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          brain_region_id: values.setup.brain_region_id,
          subject_id: values.subject_id,
          license_id: values.license_id,
          experiment_date: values.setup.experiment_date as string,
          contact_email: values.setup.contact_email,
          published_in: values.setup.published_in,
          location,
          recording_location: [values.setup.recording_location],
          recording_type: values.setup.recording_type,
          recording_origin: values.setup.recording_origin,
          temperature: values.setup.temperature,
          comment: values.setup.comment,
          ljp: values.setup.ljp,
        },
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              query.queryKey.at(0) ===
              `data-entity-count-${ExtendedEntitiesTypeDict.ElectricalCellRecording}`
            );
          },
        }),
        queryClient.invalidateQueries({
          predicate(query) {
            return (
              get(
                (query.queryKey as ExtendedEntityTypeQueryKey)[0],
                'context.extendedEntityType'
              ) === ExtendedEntitiesTypeDict.ElectricalCellRecording
            );
          },
        }),
      ]);
    },
  });

  const createContributionAsync = useMutation({
    mutationFn: ({
      entityId,
      contribution,
    }: {
      entityId: string;
      contribution: TElectricalCellRecordingForm['contribution'];
    }) => {
      return Promise.all(
        contribution
          .filter((c) => ContributionSchema.safeParse(c).success)
          .map((c) =>
            createContribution({
              context: { virtualLabId, projectId },
              contributor: {
                agent_id: c.agent_id!,
                role_id: c.role_id!,
                entity_id: entityId,
              },
            })
          )
      );
    },
  });

  const createEtypeClassificationAsync = useMutation({
    mutationFn: ({
      entityId,
      etype_class_id,
    }: {
      entityId: string;
      etype_class_id: TElectricalCellRecordingForm['etype_class_id'];
    }) => {
      return createEtypeClassification({
        context: { projectId, virtualLabId },
        payload: {
          authorized_public: true,
          entity_id: entityId,
          etype_class_id,
        },
      });
    },
  });

  const createAssetsAsync = useMutation({
    mutationFn: ({
      entityId,
      assets,
    }: {
      entityId: string;
      assets: TElectricalCellRecordingForm['assets'];
    }) => {
      return Promise.all(
        Object.entries(assets).map(([, asset]) => {
          return createAsset({
            entityId,
            entityType: EntityTypeDict.ElectricalCellRecording,
            fileName: asset.name || '',
            mimeType: 'application/nwb',
            label: AssetLabel.nwb,
            payload: asset,
            ctx: { virtualLabId, projectId },
          });
        })
      );
    },
  });

  async function createEntity({
    values,
  }: {
    values: TElectricalCellRecordingForm;
  }): Promise<string> {
    const electricalCellRecording = await createElectricalCellRecordingAsync.mutateAsync(values);
    await Promise.allSettled([
      createContributionAsync.mutateAsync({
        entityId: electricalCellRecording.id,
        contribution: values.contribution,
      }),
      createEtypeClassificationAsync.mutateAsync({
        entityId: electricalCellRecording.id,
        etype_class_id: values.etype_class_id,
      }),
      createAssetsAsync.mutateAsync({
        entityId: electricalCellRecording.id,
        assets: values.assets,
      }),
    ]);
    return electricalCellRecording.id;
  }

  const loading =
    createElectricalCellRecordingAsync.isPending ||
    createContributionAsync.isPending ||
    createEtypeClassificationAsync.isPending ||
    createAssetsAsync.isPending;

  const error =
    createElectricalCellRecordingAsync.error ||
    createContributionAsync.error ||
    createEtypeClassificationAsync.error ||
    createAssetsAsync.error;

  const status = {
    createElectricalCellRecording: createElectricalCellRecordingAsync.status,
    createContribution: createContributionAsync.status,
    createEtypeClassification: createEtypeClassificationAsync.status,
    createElectricalCellRecordingAssets: createAssetsAsync.status,
  };

  return {
    createEntity,
    loading,
    error,
    status,
    mutationKeys: ELECTRICAL_CELL_RECORDING_PROGRESS_STEPS.reduce(
      (acc, step) => {
        acc[step.mutationKey] = {
          key: [step.mutationKey, sessionId],
          label: step.label,
        };
        return acc;
      },
      {} as Record<string, IMutationKeyConfig>
    ),
  };
}
