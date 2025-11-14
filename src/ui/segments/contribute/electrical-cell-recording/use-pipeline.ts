'use client';

import { useMutation } from '@tanstack/react-query';
import isNil from 'es-toolkit/compat/isNil';

import { createEtypeClassification } from '@/api/entitycore/queries/annotations/etype-classification';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { createElectricalCellRecording } from '@/api/entitycore/queries';
import { createAsset } from '@/api/entitycore/queries/assets';
import {
  ContributionSchema,
  type TElectricalCellRecordingForm,
} from '@/ui/segments/contribute/electrical-cell-recording/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EntityTypeDict } from '@/api/entitycore/types';

export function buildElectricalCellRecordingMutationKeys(sessionId: string) {
  return {
    CreateElectricalCellRecording: {
      key: ['create-electrical-cell-recording', sessionId],
      label: 'Create cell recording',
    },
    CreateContribution: {
      key: ['create-contribution', sessionId],
      label: 'Create Contribution',
    },
    CreateEtypeClassification: {
      key: ['create-mtype-classification', sessionId],
      label: 'Create E-Type Classification',
    },
    createAssets: {
      key: ['create-electrical-cell-recording-assets', sessionId],
      label: 'Create cell recording assets',
    },
  };
}

export const usePipeline = ({ sessionId }: { sessionId: string }) => {
  const keys = buildElectricalCellRecordingMutationKeys(sessionId);
  const { projectId, virtualLabId } = useWorkspace();

  const createElectricalCellRecordingAsync = useMutation({
    mutationKey: keys.CreateElectricalCellRecording.key,
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
          recording_location: [values.setup.recording_location as string],
          recording_type: values.setup.recording_type as string,
          recording_origin: values.setup.recording_origin as string,
        },
      });
    },
  });

  const createContributionAsync = useMutation({
    mutationKey: keys.CreateContribution.key,
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
    mutationKey: keys.CreateEtypeClassification.key,
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
    mutationKey: keys.createAssets.key,
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

  async function createEntity({ values }: { values: TElectricalCellRecordingForm }) {
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
    createAssets: createAssetsAsync.status,
  };

  return { createEntity, loading, error, status };
};
