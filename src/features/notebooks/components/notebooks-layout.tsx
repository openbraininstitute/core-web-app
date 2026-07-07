'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { domAnimation, LazyMotion, m } from 'framer-motion';
import Image from 'next/image';
import { type ReactNode, useCallback, useState } from 'react';

import { createNotebook } from '@/api/entitycore/queries/analysis-notebook-template';
import { createAsset, downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createContribution,
  getContributions,
} from '@/api/entitycore/queries/general/contribution';
import { EntityTypeDict, isNotebook } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { listAllProjectIds } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';
import { NotebookLeftMenu } from '@/features/notebooks/components/notebook-left-menu';
import { startEmptyNotebook } from '@/services/notebooks';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useScope } from '@/ui/hooks/use-scope';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { ContributionModal } from '@/ui/segments/contribute/modal';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { TabsSelector } from '@/ui/segments/shared/scope-selector';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';

type Props = {
  children: ReactNode;
};

function handleUploadData() {
  makeSelectContributionEntityClickEvent({
    display: true,
    entityType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
    sessionId: crypto.randomUUID(),
  });
}

export function NotebooksLayout({ children }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { scope, changeScope } = useScope({ defaultScope: WorkspaceScope.Public });
  const notification = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [isGridAnimating, setIsGridAnimating] = useState(false);
  const breakpoint = useDefaultBreakpoint();
  const { mdv, setMdv } = useMiniDetailView();

  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  const onScopeChange = (value: string) => {
    makeSelectEntityClickEvent({ display: false, data: null });
    setMdv(false);
    changeScope(value as TWorkspaceScope);
  };

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });

  async function handleRunNotebook() {
    setLoading(true);
    if (virtualLabData == null) {
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
    }
    setLoading(false);
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

  return (
    <LazyMotion features={domAnimation}>
      <div
        id="notebooks-layout"
        data-testid="notebooks-layout"
        className="bg-background grid h-full w-full grid-cols-[22rem_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden [grid-template-areas:'header_header''main_main'] pr-1"
      >
        <div className="flex w-full items-center justify-between gap-4 pl-3 [grid-area:header]">
          <div className="flex min-w-0 max-w-1/2 items-center gap-2">
            <TabsSelector activeTab={scope} onValueChange={onScopeChange} />
          </div>

          <div className="flex items-center gap-4">
            {scope === WorkspaceScope.Project && (
              <Button
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
              </Button>
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

        <m.div
          id="notebooks-inner-layout"
          data-testid="notebooks-layout"
          className="bg-background border-neutral-2 mx-2 mb-2 ml-3 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] gap-4 overflow-hidden rounded-2xl border p-2 [grid-area:main]"
          initial={{
            gridTemplateColumns: '22rem 1fr',
            gridTemplateAreas: "'aside body'",
          }}
          animate={{
            gridTemplateColumns: mdv ? '3fr 2fr' : '22rem 1fr',
            gridTemplateAreas: mdv ? "'body mini-view'" : "'aside body'",
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.6 }}
          style={
            isGridAnimating
              ? { willChange: 'grid-template-columns, grid-template-areas' }
              : undefined
          }
          onAnimationStart={() => setIsGridAnimating(true)}
          onAnimationComplete={() => setIsGridAnimating(false)}
        >
          <aside
            className={cn(
              'h-full max-h-[calc(100vh-11.8rem)] min-h-0 w-full overflow-y-auto px-1 [grid-area:aside]',
              { hidden: mdv }
            )}
          >
            <NotebookLeftMenu />
          </aside>

          {children}
        </m.div>

        <ContributionModal onCreateSuccess={onNotebookCreateSuccess} />
      </div>
    </LazyMotion>
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
