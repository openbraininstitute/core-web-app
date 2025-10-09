'use client';

import { useMutation } from '@tanstack/react-query';
import isNil from 'lodash/isNil';

import { createMtypeClassification } from '@/api/entitycore/queries/annotations/mtype-classification';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { createCellMorphology } from '@/api/entitycore/queries';
import { createAsset } from '@/api/entitycore/queries/assets';
import {
  getMimeTypeByExtension,
  type TCellMorphologyForm,
} from '@/ui/segments/contribute/cell-morphology/helpers';
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
    mutationFn: (values: TCellMorphologyForm) => {
      const location =
        values.setup.location &&
        !isNil(values.setup.location.x) &&
        !isNil(values.setup.location.y) &&
        !isNil(values.setup.location.z)
          ? { x: values.setup.location.x, y: values.setup.location.y, z: values.setup.location.z }
          : null;

      return createCellMorphology({
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
      contribution: TCellMorphologyForm['contribution'];
    }) => {
      return Promise.all(
        contribution.map((c) =>
          createContribution({
            context: { virtualLabId, projectId },
            contributor: {
              agent_id: c.agent_id,
              role_id: c.role_id,
              entity_id: entityId,
            },
          })
        )
      );
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

  async function createEntity({ values }: { values: TCellMorphologyForm }) {
    const cellMorphology = await createCellMorphologyAsync.mutateAsync(values);
    await Promise.allSettled([
      createContributionAsync.mutateAsync({
        entityId: cellMorphology.id,
        contribution: values.contribution,
      }),
      createMtypeClassificationAsync.mutateAsync({
        entityId: cellMorphology.id,
        mtype_class_id: values.mtype_class_id,
      }),
      createAssetsAsync.mutateAsync({
        entityId: cellMorphology.id,
        assets: values.assets,
      }),
    ]);
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

  return { createEntity, loading, error, status };
};
