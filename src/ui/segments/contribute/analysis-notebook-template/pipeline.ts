'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';

import {
  createAnalysisNotebookTemplate,
  uploadNotebookTemplateFile,
} from '@/api/entitycore/queries/experimental/analysis-notebook-template';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { deleteNotebook } from '@/api/entitycore/queries/notebook';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ANALYSIS_NOTEBOOK_TEMPLATE_PROGRESS_STEPS } from '@/ui/segments/contribute/analysis-notebook-template/config';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';

import { getNotebookFiles } from './steps/assets';

import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import type { TAnalysisNotebookTemplateForm } from '@/ui/segments/contribute/analysis-notebook-template/schema';
import type {
  IMutationKeyConfig,
  IPipelineHookResult,
} from '@/ui/segments/contribute/shared/types';

export function useAnalysisNotebookTemplatePipeline({
  sessionId,
}: {
  sessionId: string;
}): IPipelineHookResult<TAnalysisNotebookTemplateForm> {
  const queryClient = useQueryClient();
  const { projectId, virtualLabId } = useWorkspace();

  const invalidateNotebookQueries = () =>
    queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKeySegment = query.queryKey[0];

        const matchesEntityCount =
          firstKeySegment === `data-entity-count-${ExtendedEntitiesTypeDict.Notebook}`;

        const matchesExtendedEntity =
          get(firstKeySegment as ExtendedEntityTypeQueryKey[0], 'context.extendedEntityType') ===
          ExtendedEntitiesTypeDict.Notebook;

        return matchesEntityCount || matchesExtendedEntity;
      },
    });

  const createNotebookAsync = useMutation({
    mutationFn: (values: TAnalysisNotebookTemplateForm) =>
      createAnalysisNotebookTemplate({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          scale: values.setup.scale,
          assignment_id: values.setup.assignment_id?.trim() || undefined,
        },
      }),
    onSettled: invalidateNotebookQueries,
  });

  const deleteNotebookAsync = useMutation({
    mutationFn: (entityId: string) =>
      deleteNotebook({
        id: entityId,
        context: { projectId, virtualLabId },
      }),
  });

  const uploadAssetsAsync = useMutation({
    mutationFn: async ({
      entityId,
      files,
    }: {
      entityId: string;
      files: { notebook: File; requirements?: File; zip?: File };
    }) => {
      await uploadNotebookTemplateFile({
        context: { projectId, virtualLabId },
        entityId,
        file: files.notebook,
        contentType: AssetContentType.ipynb,
        assetLabel: AssetLabel.jupyter_notebook,
      });

      if (files.requirements) {
        await uploadNotebookTemplateFile({
          context: { projectId, virtualLabId },
          entityId,
          file: files.requirements,
          contentType: AssetContentType.text,
          assetLabel: AssetLabel.requirements,
        });
      }

      if (files.zip) {
        await uploadNotebookTemplateFile({
          context: { projectId, virtualLabId },
          entityId,
          file: files.zip,
          contentType: AssetContentType.zip,
          assetLabel: AssetLabel.notebook_required_files,
        });
      }
    },
    onSettled: invalidateNotebookQueries,
  });

  const createContributionAsync = useMutation({
    mutationFn: ({
      entityId,
      contribution,
    }: {
      entityId: string;
      contribution: TAnalysisNotebookTemplateForm['contribution'];
    }) =>
      Promise.all(
        contribution
          .filter((c) => c.agent_id && c.role_id && ContributionSchema.safeParse(c).success)
          .map((c) =>
            createContribution({
              context: { virtualLabId, projectId },
              contributor: {
                agent_id: c.agent_id as string,
                role_id: c.role_id as string,
                entity_id: entityId,
              },
            })
          )
      ),
  });

  return {
    createEntity: async ({ values }: { values: TAnalysisNotebookTemplateForm }) => {
      const notebook = await createNotebookAsync.mutateAsync(values);
      const entityId = notebook.id;

      try {
        await uploadAssetsAsync.mutateAsync({
          entityId,
          files: getNotebookFiles() as { notebook: File; requirements?: File; zip?: File },
        });

        await createContributionAsync.mutateAsync({
          entityId,
          contribution: values.contribution,
        });
      } catch (error) {
        await deleteNotebookAsync.mutateAsync(entityId);
        throw error;
      }

      return entityId;
    },

    loading:
      createNotebookAsync.isPending ||
      uploadAssetsAsync.isPending ||
      createContributionAsync.isPending ||
      deleteNotebookAsync.isPending,

    error: (createNotebookAsync.error ||
      uploadAssetsAsync.error ||
      createContributionAsync.error) as Error | null,

    status: {
      createAnalysisNotebookTemplate: createNotebookAsync.status,
      uploadAssets: uploadAssetsAsync.status,
      createContribution: createContributionAsync.status,
    },

    mutationKeys: ANALYSIS_NOTEBOOK_TEMPLATE_PROGRESS_STEPS.reduce(
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
