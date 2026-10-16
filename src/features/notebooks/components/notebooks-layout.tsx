'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { domAnimation, LazyMotion, m } from 'framer-motion';
import Image from 'next/image';
import { type ReactNode, useCallback, useRef, useState } from 'react';

import { isNotebook } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { NotebookLeftMenu } from '@/features/notebooks/components/notebook-left-menu';
import { SyncNotebookModal } from '@/features/notebooks/components/update-notebook-modal';
import { startEmptyNotebook } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { ContributionModal } from '@/ui/segments/contribute/modal';
import { UploadDataButton } from '@/ui/segments/explore/upload-data-button';
import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

type Props = {
  children: ReactNode;
};

export function NotebooksLayout({ children }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [isGridAnimating, setIsGridAnimating] = useState(false);
  const { mdv, setMdv } = useMiniDetailView();

  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

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

  const [syncRecord, setSyncRecord] = useState<EntityCoreObjectTypes | null>(null);
  const pendingSyncRef = useRef<EntityCoreObjectTypes | null>(null);

  useContributionEntityClickEvent(({ detail }) => {
    if (!detail.display && pendingSyncRef.current) {
      setSyncRecord(pendingSyncRef.current);
      pendingSyncRef.current = null;
    }
  });

  const onNotebookCreateSuccess = useCallback(
    async (notebook: EntityCoreObjectTypes) => {
      if (!isNotebook(notebook) || course?.template_project_id !== projectId) return;
      pendingSyncRef.current = notebook;
    },
    [projectId, course]
  );

  return (
    <LazyMotion features={domAnimation}>
      <div
        id="notebooks-layout"
        data-testid="notebooks-layout"
        className="bg-background grid h-full w-full grid-cols-[22rem_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden [grid-template-areas:'header_header''main_main'] pr-1"
      >
        <div className="flex w-full items-center justify-end gap-4 pl-3 [grid-area:header]">
          <div className="flex items-center gap-4">
            {(!course || course.template_project_id === projectId) && (
              <UploadDataButton
                className="min-w-45"
                entityType={ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}
                label="Upload notebook"
              />
            )}

            <button
              disabled={loading}
              type="button"
              className="flex h-[40px] items-center justify-between gap-2 rounded-full border border-[#F37726] bg-white px-5 text-[#F37726] transition-colors hover:bg-orange-50"
              data-testid="open-jupyterhub-button"
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
          className="bg-background border-neutral-2 mx-2 mb-2 ml-3 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] gap-4 overflow-hidden rounded-2xl border p-2 [grid-area:main]"
          initial={{
            gridTemplateColumns: '22rem 1fr',
            gridTemplateAreas: "'aside body'",
          }}
          animate={{
            gridTemplateColumns: mdv ? '3fr 2fr' : '22rem 1fr',
            gridTemplateAreas: mdv ? "'body mini-view'" : "'aside body'",
          }}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 30,
            mass: 0.6,
          }}
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
        {syncRecord && course && (
          <SyncNotebookModal
            open
            onClose={() => setSyncRecord(null)}
            record={syncRecord}
            virtualLabId={virtualLabId}
            projectId={projectId}
            courseId={course.id}
          />
        )}
      </div>
    </LazyMotion>
  );
}
