'use client';

import { useMutation } from '@tanstack/react-query';

import { createMtypeClassification } from '@/api/entitycore/queries/annotations/mtype-classification';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  getMimeTypeByExtension,
  type TCellMorphologyForm,
} from '@/ui/segments/explore/contribute/cell-morphology/helpers';
import { createCellMorphology } from '@/api/entitycore/queries';
import { createAsset } from '@/api/entitycore/queries/assets';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { EntityTypeDict } from '@/api/entitycore/types';

export function buildCellMorphologyMutationKeys(sessionId: string) {
  return {
    CreateCellMorphology: {
      key: ['create-cell-morphology', sessionId],
      label: 'Create cell morphology',
    },
    CreateContribution: {
      key: ['create-contribution', sessionId],
      label: 'Create Contribution',
    },
    CreateMtypeClassification: {
      key: ['create-mtype-classification', sessionId],
      label: 'Create M-Type Classification',
    },
    createAssets: {
      key: ['create-cell-morphology-assets', sessionId],
      label: 'Create cell morphology assets',
    },
  };
}

export const usePipeline = ({ sessionId }: { sessionId: string }) => {
  const keys = buildCellMorphologyMutationKeys(sessionId);
  const { projectId, virtualLabId } = useWorkspace();

  const createCellMorphologyAsync = useMutation({
    mutationKey: keys.CreateCellMorphology.key,
    mutationFn: (values: TCellMorphologyForm) =>
      createCellMorphology({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          brain_region_id: values.setup.brain_region_id,
          subject_id: values.subject_id,
          license_id: values.license_id,
          experiment_date: values.setup.experiment_date as string,
          contact_email: null,
          published_in: null,
          location: null,
        },
      }),
  });

  const createContributionAsync = useMutation({
    mutationKey: keys.CreateContribution.key,
    mutationFn: ({
      entityId,
      contribution,
    }: {
      entityId: string;
      contribution: TCellMorphologyForm['contribution'];
    }) => {
      return createContribution({
        context: { virtualLabId, projectId },
        contributor: {
          agent_id: contribution.agent_id,
          role_id: contribution.role_id,
          entity_id: entityId,
        },
      });
    },
  });

  const createMtypeClassificationAsync = useMutation({
    mutationKey: keys.CreateMtypeClassification.key,
    mutationFn: ({
      entityId,
      mtype_class_id,
    }: {
      entityId: string;
      mtype_class_id: TCellMorphologyForm['mtype_class_id'];
    }) => {
      return createMtypeClassification({
        context: { projectId, virtualLabId },
        payload: {
          authorized_public: true,
          entity_id: entityId,
          mtype_class_id,
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
      assets: TCellMorphologyForm['assets'];
    }) => {
      return Promise.all(
        Object.entries(assets).map(([, asset]) => {
          return createAsset({
            entityId,
            entityType: EntityTypeDict.CellMorphology,
            fileName: asset.name || '',
            mimeType: getMimeTypeByExtension(asset)!,
            label: AssetLabel.morphology,
            payload: asset,
            ctx: { virtualLabId, projectId },
          });
        })
      );
    },
  });

  async function createEntityGenerator({ values }: { values: TCellMorphologyForm }) {
    const cellMorphology = await createCellMorphologyAsync.mutateAsync(values);
    await createContributionAsync.mutateAsync({
      entityId: cellMorphology.id,
      contribution: values.contribution,
    });
    await createMtypeClassificationAsync.mutateAsync({
      entityId: cellMorphology.id,
      mtype_class_id: values.mtype_class_id,
    });
    await createAssetsAsync.mutateAsync({
      entityId: cellMorphology.id,
      assets: values.assets,
    });
  }

  const loading =
    createCellMorphologyAsync.isPending ||
    createContributionAsync.isPending ||
    createMtypeClassificationAsync.isPending ||
    createAssetsAsync.isPending;

  const error =
    createCellMorphologyAsync.error ||
    createContributionAsync.error ||
    createMtypeClassificationAsync.error ||
    createAssetsAsync.error;

  const status = {
    createCellMorphology: createCellMorphologyAsync.status,
    createContribution: createContributionAsync.status,
    createMtypeClassification: createMtypeClassificationAsync.status,
    createAssets: createAssetsAsync.status,
  };

  return { createEntityGenerator, loading, error, status };
};
