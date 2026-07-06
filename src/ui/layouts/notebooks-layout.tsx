'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { createAsset, downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createContribution,
  getContributions,
} from '@/api/entitycore/queries/general/contribution';
import { type EntityCoreObjectTypes, EntityTypeDict, isNotebook } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { listAllProjectIds } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { startEmptyNotebook } from '@/services/notebooks';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button as UiButton } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { ContributionModal } from '@/ui/segments/contribute/modal';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import { useWorkspace } from '../hooks/use-workspace';

import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';
import type { WorkspaceContext } from '@/types/common';

export async function createNotebook({
  payload,
  context,
}: {
  payload: IAnalysisNotebookTemplate;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<IAnalysisNotebookTemplate>('/analysis-notebook-template', {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}

type Props = {
  children: ReactNode;
  active: 'public' | 'private';
};

export function NotebooksLayout({ children, active }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { virtualLabId, projectId } = useWorkspace();

  useEffect(() => {
    if (searchParams.get('upload') === 'true') {
      router.replace('private');
      makeSelectContributionEntityClickEvent({
        display: true,
        entityType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
        sessionId: crypto.randomUUID(),
      });
    }
  }, [searchParams, router]);
  const notification = useAppNotification();
  const [loading, setLoading] = useState(false);
  const breakpoint = useDefaultBreakpoint();

  const { data: virtualLabData, isPending } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });

  useQuery({
    queryKey: keyBuilder.accounting({ virtualLabId }),
    queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: false }),
    staleTime: 0,
    gcTime: 0,
  });

  const handleUploadData = () => {
    if (active === 'public') {
      router.push('private?upload=true');
    } else {
      makeSelectContributionEntityClickEvent({
        display: true,
        entityType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
        sessionId: crypto.randomUUID(),
      });
    }
  };

  async function handleRunNotebook() {
    setLoading(true);
    if (virtualLabData == null || virtualLabData == null) {
      setLoading(false);
      throw new Error(`Could not fetch virtual lab data`);
    }
    try {
      const retval = await startEmptyNotebook(virtualLabId, projectId, virtualLabData.compute_cell);
      notification.success({
        message: `Notebook starting`,
        key: 'notebook-started-successfully',
        placement: 'topRight',
      });
      window.open(retval.url, '_blank');
    } catch (error) {
      if (error instanceof Error && 'cause' in error) {
        notification.error({
          message: (error.cause as { error_code: string; hint: string }).hint,
          key: 'notebook-error',
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: `Failed to start notebook`,
          key: 'notebook-unknown-error',
          placement: 'topRight',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const course = virtualLabData?.course;

  const onNotebookCreateSuccess = useCallback(
    async (notebook: EntityCoreObjectTypes) => {
      if (!isNotebook(notebook) || course?.template_project_id !== projectId) {
        return;
      }
      try {
        const projectIds = (await listAllProjectIds(virtualLabId)).filter((id) => id !== projectId);
        await syncNotebook({ notebook, virtualLabId, projectId, targetProjectIds: projectIds });
      } catch {
        notification.warning({
          message: `Couldn't sync notebook to student projects`,
          key: 'notebook-sync-warning',
          placement: 'topRight',
        });
      }
    },
    [projectId, virtualLabId, notification.warning, course]
  );

  if (isPending)
    return (
      <div className="h-full flex justify-center items-center text-4xl">
        <LoadingOutlined />
      </div>
    );

  return (
    <div>
      <div className="mb-5 ml-5 flex items-center justify-between">
        <div className="flex">
          <NextLink
            href="public"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-l-full px-4 py-2',
              active === 'public' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Public
          </NextLink>

          <NextLink
            href="private"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-r-full px-4 py-2',
              active === 'private' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Project
          </NextLink>
        </div>
        <div className="flex gap-3">
          {active === 'private' && (
            <UiButton
              rounded
              variant="success"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              type="button"
              onClick={handleUploadData}
              className={cn(
                'relative h-12 min-w-45 overflow-hidden border border-white/20 px-6 font-semibold',
                'bg-linear-to-r from-green-600 via-green-700 to-green-700 bg-size-[200%_100%]',
                'transition-all duration-300 ease-out',
                'hover:scale-[1.02] active:scale-[0.98]',
                'disabled:cursor-not-allowed disabled:opacity-70'
              )}
            >
              <div className="flex items-center justify-between gap-5">
                <span>Upload notebook</span>
                <PlusOutlined className="ml-auto text-sm" />
              </div>
            </UiButton>
          )}

          <button
            disabled={loading}
            type="button"
            className="flex h-[40px] items-center justify-between gap-2 rounded-full border border-[#F37726] bg-white px-5 text-[#F37726] transition-colors hover:bg-orange-50"
            onClick={handleRunNotebook}
          >
            <div>Open JupyterHub</div>
            {!loading && (
              <Image src="/images/jupyter.svg" alt="Jupyter hub" width={20} height={20} />
            )}
            {loading && <LoadingOutlined className="text-[#F37726]" />}
          </button>
        </div>
      </div>

      <div
        id="notebooks-layout"
        className="bg-background border-neutral-2 ml-5 h-[calc(100vh-11rem)] rounded-2xl border p-5"
      >
        {children}
      </div>

      <ContributionModal onCreateSuccess={onNotebookCreateSuccess} />
    </div>
  );
}

async function _syncNotebook({
  notebook,
  virtualLabId,
  projectId,
  targetProjectId,
}: {
  notebook: IAnalysisNotebookTemplate;
  virtualLabId: string;
  projectId: string;
  targetProjectId: string;
}) {
  const createdNotebook = await createNotebook({
    payload: notebook,
    context: { virtualLabId, projectId: targetProjectId },
  });

  const contributions = await getContributions({
    context: { virtualLabId, projectId },
    filters: { entity__id: notebook.id },
  });

  const sourceAssets = await Promise.all(
    notebook.assets.map(async (asset) => {
      const arrayBuffer = (await downloadAsset({
        ctx: {
          virtualLabId,
          projectId,
        },
        entityType: EntityTypeDict.AnalysisNotebookTemplate,
        entityId: notebook.id,
        id: asset.id,
        asRawResponse: false,
      })) as ArrayBuffer;

      return {
        ctx: { virtualLabId, projectId: targetProjectId },
        entityType: EntityTypeDict.AnalysisNotebookTemplate,
        entityId: createdNotebook.id,
        fileName: asset.path.split('/').pop() ?? asset.id,
        payload: arrayBuffer,
        mimeType: asset.content_type,
        label: asset.label,
      };
    })
  );

  // Upload assets to new notebook

  await Promise.all(
    sourceAssets.map((asset) => {
      return createAsset(asset);
    })
  );

  // Upload contributions to new notebook

  await Promise.all(
    contributions.data.map((contributor) =>
      createContribution({
        context: { virtualLabId, projectId: targetProjectId },
        contributor: {
          agent_id: contributor.agent.id,
          entity_id: createdNotebook.id,
          role_id: contributor.role.id,
        },
      })
    )
  );
}

async function syncNotebook({
  notebook,
  virtualLabId,
  projectId,
  targetProjectIds,
}: {
  notebook: IAnalysisNotebookTemplate;
  virtualLabId: string;
  projectId: string;
  targetProjectIds: string[];
}) {
  const promises = targetProjectIds.map((id) => {
    return _syncNotebook({ notebook, virtualLabId, projectId, targetProjectId: id });
  });

  return await Promise.all(promises);
}
