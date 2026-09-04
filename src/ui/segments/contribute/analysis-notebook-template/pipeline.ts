'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteAnalysisNotebookTemplate,
  getAnalysisNotebookTemplates,
  updateAnalysisNotebookTemplate,
} from '@/api/entitycore/queries/analysis-notebook-template';
import {
  createAnalysisNotebookTemplate,
  uploadNotebookTemplateFile,
} from '@/api/entitycore/queries/experimental/analysis-notebook-template';
import { createContribution } from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { invalidateEntityListings } from '@/features/data-grid/listing-queries';
import { clearAssignmentIdFromStudentCopies } from '@/features/notebooks/assignment-id-conflict';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ANALYSIS_NOTEBOOK_TEMPLATE_PROGRESS_STEPS } from '@/ui/segments/contribute/analysis-notebook-template/config';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { getNotebookFiles } from './steps/assets';

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
  const notification = useAppNotification();
  const { projectId, virtualLabId } = useWorkspace();

  const invalidateNotebookQueries = () =>
    invalidateEntityListings(queryClient, ExtendedEntitiesTypeDict.AnalysisNotebookTemplate);

  const { data: virtualLab } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });

  const courseId =
    virtualLab?.course?.template_project_id === projectId ? virtualLab.course.id : undefined;

  const createNotebookAsync = useMutation({
    mutationFn: ({
      values,
      assignmentId,
    }: {
      values: TAnalysisNotebookTemplateForm;
      assignmentId?: string;
    }) =>
      createAnalysisNotebookTemplate({
        context: { projectId, virtualLabId },
        payload: {
          name: values.setup.name,
          description: values.setup.description,
          scale: values.setup.scale,
          assignment_id: assignmentId,
        },
      }),
    onSettled: invalidateNotebookQueries,
  });

  const deleteNotebookAsync = useMutation({
    mutationFn: (entityId: string) =>
      deleteAnalysisNotebookTemplate({
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
    onSettled: invalidateNotebookQueries,
  });

  const claimAssignmentIdAsync = useMutation({
    mutationFn: async ({
      entityId,
      assignmentId,
      consentedConflictId,
    }: {
      entityId: string;
      assignmentId: string;
      consentedConflictId: string;
    }) => {
      const context = { projectId, virtualLabId };
      const matches = await getAnalysisNotebookTemplates({
        filters: { assignment_id: assignmentId, page_size: 1 },
        context,
      });
      const conflict = matches.data?.[0];

      // The user consented to releasing one named notebook, so refuse if the ID has moved to
      // another one since. Nothing to release is fine — the ID is simply free again.
      if (conflict && conflict.id !== consentedConflictId) {
        throw new Error(`${conflict.name} now uses this assignment ID`);
      }

      if (conflict) {
        await updateAnalysisNotebookTemplate({
          id: conflict.id,
          payload: { assignment_id: null },
          context,
        });

        if (courseId) {
          await clearAssignmentIdFromStudentCopies({
            virtualLabId,
            courseId,
            templateProjectId: projectId,
            notebookName: conflict.name,
          });
        }
      }

      // Release before claiming: a failed claim leaves the ID unheld, which shows up as a missing
      // assignment, where a failed release would leave two holders and silently grade either.
      await updateAnalysisNotebookTemplate({
        id: entityId,
        payload: { assignment_id: assignmentId },
        context,
      });
    },
    onSettled: invalidateNotebookQueries,
  });

  return {
    createEntity: async ({ values }: { values: TAnalysisNotebookTemplateForm }) => {
      const assignmentId = values.setup.assignment_id?.trim() || undefined;
      const consentedConflictId = values.setup.assignment_conflict_id;
      // Take the ID off the other notebook only once this one is complete: the rollback below
      // deletes it on failure, and a release that ran first would have stripped the other
      // notebook for nothing.
      const releasingConflict = Boolean(assignmentId && consentedConflictId);

      const notebook = await createNotebookAsync.mutateAsync({
        values,
        assignmentId: releasingConflict ? undefined : assignmentId,
      });
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

      // The notebook itself is complete by now, so a failed hand-over is reported rather than
      // thrown — deleting a fully uploaded notebook over an assignment ID would cost more.
      if (releasingConflict) {
        try {
          await claimAssignmentIdAsync.mutateAsync({
            entityId,
            assignmentId: assignmentId as string,
            consentedConflictId: consentedConflictId as string,
          });
        } catch (error) {
          notification.warning({
            message: 'Notebook created without its assignment ID',
            description: error instanceof Error ? error.message : undefined,
            placement: 'topRight',
          });
        }
      }

      return notebook;
    },

    loading:
      createNotebookAsync.isPending ||
      uploadAssetsAsync.isPending ||
      createContributionAsync.isPending ||
      claimAssignmentIdAsync.isPending ||
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
