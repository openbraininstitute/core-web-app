'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';

import {
  createAnalysisNotebookTemplate,
  uploadNotebookTemplateFile,
} from '@/api/entitycore/queries/experimental/analysis-notebook-template';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { syncNotebook } from '@/ui/layouts/notebooks-layout';
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

  const createNotebookAsync = useMutation({
    mutationFn: (values: TAnalysisNotebookTemplateForm) =>
      createAnalysisNotebookTemplate({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          scale: values.setup.scale,
        },
      }),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === `data-entity-count-${ExtendedEntitiesTypeDict.Notebook}`,
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            get((query.queryKey as ExtendedEntityTypeQueryKey)[0], 'context.extendedEntityType') ===
            ExtendedEntitiesTypeDict.Notebook,
        }),
        queryClient.invalidateQueries(),
      ]);
    },
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

      await uploadAssetsAsync.mutateAsync({
        entityId,
        files: getNotebookFiles() as { notebook: File; requirements?: File; zip?: File },
      });

      await Promise.allSettled([
        createContributionAsync.mutateAsync({
          entityId,
          contribution: values.contribution,
        }),
      ]);

      return entityId;
    },

    loading:
      createNotebookAsync.isPending ||
      uploadAssetsAsync.isPending ||
      createContributionAsync.isPending,

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
