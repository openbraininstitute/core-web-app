'use client';

import { DownOutlined, LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Dropdown } from 'antd';
import { domAnimation, LazyMotion, m } from 'framer-motion';
import Image from 'next/image';
import { type ReactNode, useCallback, useRef, useState } from 'react';

import { isNotebook } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { NotebookLeftMenu } from '@/features/notebooks/components/notebook-left-menu';
import { SessionSizePanel } from '@/features/notebooks/components/session-size-panel';
import { SyncNotebookModal } from '@/features/notebooks/components/update-notebook-modal';
import { useNotebookProfiles } from '@/features/notebooks/hooks/use-run-notebook';
import { startEmptyNotebook } from '@/services/notebooks';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { useMediaQuery } from '@/hooks/use-media-query';
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

/** The left box's width, as Reports' (research-logs-layout.tsx). */
const RAIL_WIDTH = 364;

export function NotebooksLayout({ children }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [isGridAnimating, setIsGridAnimating] = useState(false);
  const { mdv, setMdv } = useMiniDetailView();
  const phone = useMediaQuery('(max-width: 767px)', false);

  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });

  const { profiles, defaultProfile } = useNotebookProfiles();

  async function handleRunNotebook(profile?: string) {
    setLoading(true);
    if (virtualLabData == null) {
      setLoading(false);
      throw new Error(`Could not fetch virtual lab data`);
    }
    try {
      const retval = await startEmptyNotebook(
        virtualLabId,
        projectId,
        virtualLabData.compute_cell,
        profile
      );
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
  // Students (course projects that aren't the instructor's template project) don't choose a
  // session size: hide the size picker and open JupyterHub with the backend default size.
  const isCourseStudentProject = !!course && course.template_project_id !== projectId;

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

  const upload = (!course || course.template_project_id === projectId) && (
    <UploadDataButton
      className="min-w-0 flex-1"
      entityType={ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}
      // short, to share the box's top with JupyterHub, as Reports' New does with its scope toggles
      label="Upload"
      compact
    />
  );
  const jupyterHub = (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      open={sizeMenuOpen && !loading && !isCourseStudentProject}
      onOpenChange={setSizeMenuOpen}
      disabled={loading || isCourseStudentProject}
      popupRender={() => (
        <SessionSizePanel
          profiles={profiles}
          defaultProfile={defaultProfile}
          onSelect={(profile) => {
            setSizeMenuOpen(false);
            handleRunNotebook(profile);
          }}
        />
      )}
    >
      <button
        disabled={loading}
        type="button"
        className="flex h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-[#F37726] bg-white px-4 text-[13px] font-semibold text-[#F37726] transition-colors hover:bg-orange-50"
        data-testid="open-jupyterhub-button"
        onClick={isCourseStudentProject ? () => handleRunNotebook() : undefined}
      >
        <div className="truncate">JupyterHub</div>
        <span className="flex shrink-0 items-center gap-2">
          {loading ? (
            <LoadingOutlined className="size-5 text-[#F37726]" />
          ) : (
            <Image src="/images/jupyter.svg" alt="Jupyter hub" width={20} height={20} />
          )}
          {!isCourseStudentProject && <DownOutlined className="text-xs" />}
        </span>
      </button>
    </Dropdown>
  );
  // the left box, as Reports' list of logs: the ways to add one along its top, then the sections as its pills
  const aside = (
    <aside
      className={cn(
        BOX_CLASS,
        'flex min-h-0 flex-col gap-3 overflow-hidden p-3',
        phone ? 'shrink-0' : cn('h-full [grid-area:aside]', { hidden: mdv })
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        {upload}
        {jupyterHub}
      </div>
      <NotebookLeftMenu row={phone} />
    </aside>
  );

  // Laid out as Reports is (the user asked): the box down the left and the table in its own white box beside it, tops
  // and feet level with the assistant's panel; on a phone the box over the table, scrolling as one.
  return (
    <LazyMotion features={domAnimation}>
      <div
        id="notebooks-layout"
        data-testid="notebooks-layout"
        className={cn(
          'bg-background h-full w-full pr-1',
          phone ? 'no-scrollbar overflow-x-hidden overflow-y-auto' : 'overflow-hidden pt-1'
        )}
      >
        {phone ? (
          <div className="flex min-h-full flex-col gap-3 px-2 pt-2 pb-4">
            {aside}
            <div className="flex min-h-[70vh] flex-col">{children}</div>
          </div>
        ) : (
          <m.div
            id="notebooks-inner-layout"
            className="mx-2 ml-3 grid h-full w-[calc(100%-10px)] grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden p-2"
            initial={{ gridTemplateColumns: `${RAIL_WIDTH}px 1fr`, gridTemplateAreas: "'aside body'" }}
            animate={{
              gridTemplateColumns: mdv ? '3fr 2fr' : `${RAIL_WIDTH}px 1fr`,
              gridTemplateAreas: mdv ? "'body mini-view'" : "'aside body'",
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.6 }}
            style={isGridAnimating ? { willChange: 'grid-template-columns, grid-template-areas' } : undefined}
            onAnimationStart={() => setIsGridAnimating(true)}
            onAnimationComplete={() => setIsGridAnimating(false)}
          >
            {aside}
            {children}
          </m.div>
        )}
      </div>

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
    </LazyMotion>
  );
}
