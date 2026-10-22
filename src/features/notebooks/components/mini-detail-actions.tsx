import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LoadingOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { RiCheckFill, RiFileCopyLine, RiPlayFill } from '@remixicon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dropdown, Modal, Popconfirm } from 'antd';
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
import { DownloadIcon } from '@/components/icons/buttons';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { type TViewVariant, ViewVariant } from '@/constants';
import { invalidateEntityListings } from '@/features/data-grid/listing-queries';
import { studentProjectIds } from '@/features/notebooks/assignment-id-conflict';
import { useRunNotebook } from '@/features/notebooks/hooks/use-run-notebook';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive, downloadFailedNotification } from '@/services/entity-download';
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
import type { NotebookProfile } from '@/services/notebooks';

function MiniActionIcon({
  label,
  testId,
  theme,
  onClick,
  children,
}: {
  label: string;
  testId?: string;
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
          data-testid={testId}
          className={cn(
            'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
            {
              'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light,
            }
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

const FALLBACK_PROFILE_LABEL = '2 CPU, 4 GB RAM';

/**
 * Split a profile description like "4 CPU, 16 GB RAM (dedicated node)" into its
 * size line and an optional parenthetical note, so the note can be shown as a
 * separate tag and each row stays on one line.
 */
function splitDescription(description: string | null): { size: string; note: string | null } {
  if (!description) return { size: '', note: null };
  const match = description.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (match) {
    const raw = match[2].trim();
    // Sentence-case for a consistent badge label regardless of backend casing.
    const note = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : null;
    return { size: match[1].trim(), note };
  }
  return { size: description.trim(), note: null };
}

/**
 * Scrollable size picker rendered in the run-button dropdown. Clicking a size
 * runs it. When the service lists no profiles, a single hardcoded default is
 * shown that runs with no explicit profile (backend applies its own default).
 */
function SessionSizePanel({
  profiles,
  defaultProfile,
  onSelect,
}: {
  profiles: NotebookProfile[];
  defaultProfile: string | null;
  onSelect: (profileName?: string) => void;
}) {
  const hasProfiles = profiles.length > 0;

  return (
    <div className="w-60 rounded-md border border-neutral-200 bg-white p-2 shadow-xl">
      <p className="text-primary-8 mb-1.5 text-sm font-semibold">Choose session size</p>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
        {hasProfiles ? (
          profiles.map((profile) => {
            const isDefault = profile.name === defaultProfile;
            const title = profile.display_name ?? profile.name;
            // `description` is the authoritative size label; the structured
            // requests_* fields are k8s values that can differ from it.
            const { size, note } = splitDescription(profile.description);
            return (
              <button
                type="button"
                key={profile.name}
                data-testid={`notebook-profile-${profile.name}`}
                onClick={() => onSelect(profile.name)}
                className={cn(
                  'text-primary-8 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors',
                  isDefault
                    ? 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                    : 'border-neutral-200 hover:bg-neutral-100'
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 font-semibold">
                    {title}
                    {isDefault && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-600">
                        Default
                      </span>
                    )}
                    {note && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        {note}
                      </span>
                    )}
                  </span>
                  {size && (
                    <span className="truncate text-xs whitespace-nowrap text-neutral-500">
                      {size}
                    </span>
                  )}
                </span>
                <RiPlayFill className="size-4 shrink-0 text-neutral-500" />
              </button>
            );
          })
        ) : (
          // No profiles from the service: run the backend default (no profile arg).
          <button
            type="button"
            data-testid="notebook-profile-default-fallback"
            onClick={() => onSelect(undefined)}
            className="text-primary-8 flex items-center justify-between gap-2 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-left transition-colors hover:bg-blue-100"
          >
            <span className="flex flex-col">
              <span className="flex items-center gap-2 font-semibold">
                {FALLBACK_PROFILE_LABEL}
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-600">
                  Default
                </span>
              </span>
            </span>
            <RiPlayFill className="size-4 shrink-0 text-neutral-500" />
          </button>
        )}
      </div>
    </div>
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

  const { run, runTargets, runningTarget, running, creditsModal, profiles, defaultProfile } =
    useRunNotebook({
      id: record.id,
      assets,
    });

  const [pendingDownload, setPendingDownload] = useState(false);

  const handleDownload = async () => {
    setPendingDownload(true);
    try {
      await downloadArchive(record.type, [record.id], {
        virtualLabId,
        projectId,
      });
    } catch (error) {
      notification.error(downloadFailedNotification(error));
    }
    setPendingDownload(false);
  };

  const canDelete =
    isPrivate &&
    !!virtualLabData &&
    (!virtualLabData.course || virtualLabData.course.template_project_id === projectId);

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

      if (isTemplate && isCourseTemplateProject && virtualLabData?.course) {
        // Delete matching notebooks in all enrolled students' projects first
        const otherProjectIds = await studentProjectIds({
          courseId: virtualLabData.course.id,
          templateProjectId: projectId,
        });

        const results = await Promise.allSettled(
          otherProjectIds.map(async (pid) => {
            const ctx = { virtualLabId, projectId: pid };
            const res = await getAnalysisNotebookTemplates({
              filters: { name: notebookName },
              context: ctx,
            });
            const matches = res.data.filter((nb) => nb.name === notebookName);
            await Promise.all(
              matches.map(async (nb) => {
                await deleteAssetsAndContributions(nb.id, ctx);
                await deleteAnalysisNotebookTemplate({
                  id: nb.id,
                  context: ctx,
                });
              })
            );
          })
        );

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          throw new Error(
            `Failed to delete notebook in ${failures.length} child project(s). Parent notebook was not deleted.`
          );
        }
      }

      // Delete assets/contributions only for templates
      if (isTemplate) {
        await deleteAssetsAndContributions(record.id, {
          virtualLabId,
          projectId,
        });
      }

      // Delete the entity itself
      await (isTemplate ? deleteAnalysisNotebookTemplate : deleteAnalysisNotebookResult)({
        id: record.id,
        context: { virtualLabId, projectId },
      });
    },
    onSuccess: async () => {
      await invalidateEntityListings(queryClient, record.type);
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
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                duration: 0.2,
              }}
            >
              <RiCheckFill className="text-accent-light size-6" />
            </m.div>
          ) : (
            <RiFileCopyLine />
          )}
        </MiniActionIcon>

        <MiniActionIcon
          label="Download"
          testId="notebook-download-button"
          theme={theme}
          onClick={handleDownload}
        >
          {pendingDownload ? <LoadingOutlined spin className="text-primary-3" /> : <DownloadIcon />}
        </MiniActionIcon>

        {isTemplate && (
          <MiniActionIcon label="Readme" theme={theme} onClick={() => setReadmeOpen(true)}>
            <EyeOutlined className="text-xl" />
          </MiniActionIcon>
        )}

        {isTemplate ? (
          runTargets.map((target) => (
            <Dropdown
              key={target.key}
              trigger={['click']}
              popupRender={() => (
                <SessionSizePanel
                  profiles={profiles}
                  defaultProfile={defaultProfile}
                  onSelect={(profileName) => run(target, profileName)}
                />
              )}
            >
              {/* Plain Button (not MiniActionIcon) so antd Dropdown can attach
                  its click trigger to a real DOM element. */}
              <Button
                rounded
                title={target.label}
                data-testid={`notebook-run-${target.key}-button`}
                className={cn(
                  'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
                  {
                    'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light,
                  }
                )}
              >
                {runningTarget === target.key ? (
                  <LoadingOutlined spin className="text-primary-3" />
                ) : (
                  <target.Icon className="size-6" />
                )}
              </Button>
            </Dropdown>
          ))
        ) : (
          <MiniActionIcon
            label="Run"
            testId="notebook-run-button"
            theme={theme}
            onClick={() => run()}
          >
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
                {
                  'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light,
                }
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

        {isTemplate && isCourseTemplateProject && virtualLabData?.course && (
          <>
            <Button
              rounded
              title="Sync notebook to students"
              className={cn(
                'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
                {
                  'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light,
                }
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
              courseId={virtualLabData.course.id}
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
            {
              'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light,
            }
          )}
        >
          <Link
            href={{
              pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/view/${typeParam}/${record.id}/overview`,
            }}
            data-testid="notebook-view-details-link"
          >
            View details
          </Link>
        </Button>
      </div>
    </LazyMotion>
  );
}
