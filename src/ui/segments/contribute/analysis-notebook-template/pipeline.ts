'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';

import {
  createAnalysisNotebookTemplate,
  uploadNotebookTemplateFile,
  AssetLabel,
  ContentType,
} from '@/api/entitycore/queries/experimental/analysis-notebook-template';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ExtendedEntityTypeQueryKey } from '@/ui/hooks/use-query-extended-entity-type';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getNotebookFiles } from '@/ui/segments/contribute/analysis-notebook-template/steps/assets';
import { ANALYSIS_NOTEBOOK_TEMPLATE_PROGRESS_STEPS } from '@/ui/segments/contribute/analysis-notebook-template/config';
import type { TAnalysisNotebookTemplateForm } from '@/ui/segments/contribute/analysis-notebook-template/schema';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
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

  const createAnalysisNotebookTemplateAsync = useMutation({
    mutationFn: (values: TAnalysisNotebookTemplateForm) => {
      return createAnalysisNotebookTemplate({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          scale: values.setup.scale,
        },
      });
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
        contentType: ContentType.application_x_ipynb_json,
        assetLabel: AssetLabel.jupyter_notebook,
      });

      if (files.requirements) {
        await uploadNotebookTemplateFile({
          context: { projectId, virtualLabId },
          entityId,
          file: files.requirements,
          contentType: ContentType.text_plain,
          assetLabel: AssetLabel.requirements,
        });
      }

      if (files.zip) {
        await uploadNotebookTemplateFile({
          context: { projectId, virtualLabId },
          entityId,
          file: files.zip,
          contentType: ContentType.application_zip,
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
    }) => {
      return Promise.all(
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
      );
    },
  });

  async function createEntity({
    values,
  }: {
    values: TAnalysisNotebookTemplateForm;
  }): Promise<string> {
    const notebookTemplate = await createAnalysisNotebookTemplateAsync.mutateAsync(values);

    await uploadAssetsAsync.mutateAsync({
      entityId: notebookTemplate.id,
      files: getNotebookFiles() as { notebook: File; requirements?: File; zip?: File },
    });

    await Promise.allSettled([
      createContributionAsync.mutateAsync({
        entityId: notebookTemplate.id,
        contribution: values.contribution,
      }),
    ]);

    await Promise.all([
      queryClient.invalidateQueries({
        predicate(query) {
          return (
            query.queryKey.at(0) ===
            `data-entity-count-${ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}`
          );
        },
      }),
      queryClient.invalidateQueries({
        predicate(query) {
          return (
            get(
              (query.queryKey as ExtendedEntityTypeQueryKey)[0],
              'context.extendedEntityType'
            ) === ExtendedEntitiesTypeDict.AnalysisNotebookTemplate
          );
        },
      }),
      queryClient.invalidateQueries(),
    ]);

    return notebookTemplate.id;
  }

  const loading =
    createAnalysisNotebookTemplateAsync.isPending ||
    uploadAssetsAsync.isPending ||
    createContributionAsync.isPending;

  const error =
    createAnalysisNotebookTemplateAsync.error ||
    uploadAssetsAsync.error ||
    createContributionAsync.error;

  const status = {
    createAnalysisNotebookTemplate: createAnalysisNotebookTemplateAsync.status,
    uploadAssets: uploadAssetsAsync.status,
    createContribution: createContributionAsync.status,
  };

  return {
    createEntity,
    loading,
    error,
    status,
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
