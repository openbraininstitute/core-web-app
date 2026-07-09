import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LoadingOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { RiCheckFill, RiFileCopyLine, RiPlayFill } from '@remixicon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Popconfirm } from 'antd';
import { domAnimation, LazyMotion, m } from 'framer-motion';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { deleteAnalysisNotebookResult } from '@/api/entitycore/queries/analysis-notebook-result';
import {
  deleteAnalysisNotebookTemplate,
  getAnalysisNotebookTemplates,
} from '@/api/entitycore/queries/analysis-notebook-template';
import { deleteAsset, getAssets } from '@/api/entitycore/queries/assets';
import {
  deleteContribution,
  getContributions,
} from '@/api/entitycore/queries/general/contribution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { listAllProjectIds } from '@/api/virtual-lab-svc/queries/project';
import { DownloadIcon } from '@/components/icons/buttons';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { type TViewVariant, ViewVariant } from '@/constants';
import { useRunNotebook } from '@/features/notebooks/hooks/use-run-notebook';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { useMiniDetailView } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

import { SyncNotebookModal, UpdateNotebookModal } from './update-notebook-modal';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { TVirtualLab } from '@/api/virtual-lab-svc/queries/types';

function MiniActionIcon({
  label,
  theme,
  onClick,
  children,
}: {
  label: string;
  theme: TViewVariant;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          rounded
          title={label}
          className={cn(
            'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
            { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
          )}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        side="top"
        sideOffset={3}
        align="center"
        className="text-primary-8 bg-white"
        arrowClassName="bg-white"
      >
        <span>{label}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function NotebookActions<T extends EntityCoreObjectTypes>({
  record,
  dataType,
  theme = ViewVariant.Default,
  isPrivate = true,
  virtualLabData,
}: {
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
  theme?: TViewVariant;
  isPrivate?: boolean;
  virtualLabData?: TVirtualLab;
}) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();
  const { setMdv } = useMiniDetailView();
  const [, copy, , copying] = useCopyToClipboard();
  const [readmeOpen, setReadmeOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const isTemplate = dataType === ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;
  const typeParam = dataType ? resolveConcreteEntityPathParam(dataType) : '';
  const description =
    'description' in record ? (record.description as string | undefined) : undefined;
  const assets = 'assets' in record && record.assets ? (record.assets as IAsset[]) : [];

  const { run, runTargets, runningTarget, running, creditsModal } = useRunNotebook({
    id: record.id,
    assets,
  });

  const [pendingDownload, setPendingDownload] = useState(false);

  const handleDownload = async () => {
    setPendingDownload(true);
    try {
      await downloadArchive(record.type, [record.id], { virtualLabId, projectId });
    } catch {
      // download errors are surfaced by the download service
    }
    setPendingDownload(false);
  };

  const canDelete =
    isPrivate &&
    (!virtualLabData?.course || virtualLabData.course.template_project_id === projectId);

  const notebookName = 'name' in record ? (record.name as string) : '';
  const isCourseTemplateProject =
    !!virtualLabData?.course && virtualLabData.course.template_project_id === projectId;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const deleteAssetsAndContributions = async (
        entityId: string,
        ctx: { virtualLabId: string; projectId: string }
      ) => {
        const [assetsRes, contributionsRes] = await Promise.all([
          getAssets({ entityType: record.type, entityId, ctx }),
          getContributions({ context: ctx, filters: { entity__id: entityId } }),
        ]);
        await Promise.all([
          ...assetsRes.data.map((a) =>
            deleteAsset({ entityType: record.type, entityId, id: a.id, ctx })
          ),
          ...contributionsRes.data.map((c) => deleteContribution({ id: c.id, context: ctx })),
        ]);
      };

      if (isTemplate && isCourseTemplateProject) {
        // Delete matching notebooks in all other projects of this vlab
        const allProjectIds = await listAllProjectIds(virtualLabId);
        const otherProjectIds = allProjectIds.filter((id) => id !== projectId);

        await Promise.allSettled(
          otherProjectIds.map(async (pid) => {
            const ctx = { virtualLabId, projectId: pid };
            const res = await getAnalysisNotebookTemplates({
              filters: { search: notebookName },
              context: ctx,
            });
            const matches = res.data.filter((nb) => nb.name === notebookName);
            await Promise.all(
              matches.map(async (nb) => {
                await deleteAssetsAndContributions(nb.id, ctx);
                await deleteAnalysisNotebookTemplate({ id: nb.id, context: ctx });
              })
            );
          })
        ).then((results) => {
          for (const r of results) {
            if (r.status === 'rejected') {
              // biome-ignore lint/suspicious/noConsole: intentional error logging for silent failures
              console.error('[NotebookActions] failed to delete in other project', r.reason);
            }
          }
        });
      }

      // Delete assets/contributions only for templates
      if (isTemplate) {
        await deleteAssetsAndContributions(record.id, { virtualLabId, projectId });
      }

      // Delete the entity itself
      await (isTemplate ? deleteAnalysisNotebookTemplate : deleteAnalysisNotebookResult)({
        id: record.id,
        context: { virtualLabId, projectId },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate(query) {
          const first = query.queryKey[0] as
            | { context?: { extendedEntityType?: string } }
            | undefined;
          return first?.context?.extendedEntityType === record.type;
        },
      });
      setMdv(false);
      notification.success({
        message: 'Deleted successfully',
        description: `The ${isTemplate ? 'notebook' : 'result'} has been successfully deleted.`,
        placement: 'topRight',
      });
    },
    onError: (error: Error) => {
      notification.error({
        message: 'Deletion failed',
        description: error.message || 'Unknown error',
        placement: 'topRight',
        duration: 5,
      });
    },
  });

  return (
    <LazyMotion features={domAnimation}>
      <div
        data-testid="notebook-mini-actions"
        className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4"
      >
        {creditsModal}
        <Modal
          centered
          open={readmeOpen}
          footer={false}
          onCancel={() => setReadmeOpen(false)}
          width="40%"
        >
          <div>
            <h1 className="text-primary-8 text-3xl font-bold">Readme</h1>
            <div className="mt-5 text-lg text-black">{description}</div>
          </div>
        </Modal>

        <MiniActionIcon label="Copy ID" theme={theme} onClick={() => copy(record.id)}>
          {copying ? (
            <m.div
              key="checkmark"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.2 }}
            >
              <RiCheckFill className="text-accent-light size-6" />
            </m.div>
          ) : (
            <RiFileCopyLine />
          )}
        </MiniActionIcon>

        <MiniActionIcon label="Download" theme={theme} onClick={handleDownload}>
          {pendingDownload ? <LoadingOutlined spin className="text-primary-3" /> : <DownloadIcon />}
        </MiniActionIcon>

        {isTemplate && (
          <MiniActionIcon label="Readme" theme={theme} onClick={() => setReadmeOpen(true)}>
            <EyeOutlined className="text-xl" />
          </MiniActionIcon>
        )}

        {isTemplate ? (
          runTargets.map((target) => (
            <MiniActionIcon
              key={target.key}
              label={target.label}
              theme={theme}
              onClick={() => run(target)}
            >
              {runningTarget === target.key ? (
                <LoadingOutlined spin className="text-primary-3" />
              ) : (
                <target.Icon className="size-6" />
              )}
            </MiniActionIcon>
          ))
        ) : (
          <MiniActionIcon label="Run" theme={theme} onClick={() => run()}>
            {running ? (
              <LoadingOutlined spin className="text-primary-3" />
            ) : (
              <RiPlayFill className="text-xl" />
            )}
          </MiniActionIcon>
        )}

        {canDelete && (
          <MiniActionIcon label="Update" theme={theme} onClick={() => setUpdateOpen(true)}>
            <EditOutlined className="text-xl" />
          </MiniActionIcon>
        )}

        {canDelete && (
          <Popconfirm
            autoAdjustOverflow
            destroyOnHidden
            placement="topRight"
            title={
              <div className="text-primary-8 text-lg font-bold">
                Delete the {isTemplate ? 'notebook' : 'result'}
              </div>
            }
            description={
              <div>
                <div className="text-primary-8 text-sm font-bold">
                  Are you sure you want to delete this {isTemplate ? 'notebook' : 'result'}?
                </div>
                {isTemplate && isCourseTemplateProject && (
                  <div className="text-primary-8 mt-1 text-sm">
                    The corresponding notebook in all projects will also be deleted.
                  </div>
                )}
                <small className="text-primary-6 font-light">This action cannot be undone.</small>
              </div>
            }
            okText="Yes"
            cancelText="No"
            arrow={{ pointAtCenter: false }}
            onConfirm={() => deleteMutation.mutateAsync()}
            classNames={{
              body: cn(
                'max-w-70',
                '[&_.ant-popconfirm-buttons_button]:px-4',
                '[&_.ant-popconfirm-buttons_button]:rounded-full [&_.ant-popconfirm-buttons_button]:px-5',
                '[&_.ant-popconfirm-buttons_button:last-child]:bg-primary-8'
              ),
            }}
          >
            <Button
              rounded
              title="Delete"
              className={cn(
                'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
                { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
              )}
            >
              {deleteMutation.isPending ? (
                <LoadingOutlined spin className="text-primary-3" />
              ) : (
                <DeleteOutlined className="text-xl" />
              )}
            </Button>
          </Popconfirm>
        )}

        <UpdateNotebookModal
          open={updateOpen}
          onClose={() => {
            setUpdateOpen(false);
            setMdv(false);
          }}
          record={record}
          virtualLabData={virtualLabData}
        />

        {isTemplate && isCourseTemplateProject && (
          <>
            <Button
              rounded
              title="Sync to child projects"
              className={cn(
                'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
                { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
              )}
              onClick={() => setSyncOpen(true)}
            >
              <SyncOutlined className="text-xl" />
            </Button>
            <SyncNotebookModal
              open={syncOpen}
              onClose={() => setSyncOpen(false)}
              record={record}
              virtualLabId={virtualLabId}
              projectId={projectId}
            />
          </>
        )}

        <Button
          rounded
          asChild
          title="Go to details page"
          variant="default"
          className={cn(
            'hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
            { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
          )}
        >
          <Link
            href={{
              pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/view/${typeParam}/${record.id}/overview`,
            }}
          >
            View details
          </Link>
        </Button>
      </div>
    </LazyMotion>
  );
}
