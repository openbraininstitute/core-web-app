'use client';

import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  LeftOutlined,
  LoadingOutlined as LoadingIcon,
  PlusOutlined,
  RightOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { capitalize } from 'es-toolkit/compat';
import { useEffect, useMemo, useState } from 'react';

import { getAnalysisNotebookTemplates } from '@/api/entitycore/queries/analysis-notebook-template';
import { deleteAsset, downloadAsset, getAssets } from '@/api/entitycore/queries/assets';
import { uploadNotebookTemplateFile } from '@/api/entitycore/queries/experimental/analysis-notebook-template';
import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import {
  createContribution,
  deleteContribution,
  getContributions,
} from '@/api/entitycore/queries/general/contribution';
import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { getRoles } from '@/api/entitycore/queries/general/role';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { listAllProjectIds } from '@/api/virtual-lab-svc/queries/project';
import { useAppNotification } from '@/components/notification';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { Modal } from '@/ui/molecules/modal';
import { SelectPopover } from '@/ui/molecules/select-popover';
import { AssetUpload } from '@/ui/segments/contribute/shared/components/asset-upload';
import { AgentType } from '@/ui/segments/contribute/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { Agent, IAsset, IContributor } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { IRole } from '@/api/entitycore/types/shared/role';
import type { TVirtualLab } from '@/api/virtual-lab-svc/queries/types';
import type { TAgentType } from '@/ui/segments/contribute/shared/types';

interface UpdateNotebookModalProps {
  open: boolean;
  onClose: () => void;
  record: EntityCoreObjectTypes;
  virtualLabData?: TVirtualLab;
}

type WorkspaceContext = { virtualLabId: string; projectId: string };

/**
 * Syncs a template notebook's assets and contributions to all child project notebooks.
 * For assets: wipes child assets and re-uploads from template (guarantees content match).
 * For contributions: diffs by agent+role (delete extra, create missing).
 */
async function syncChildProjects({
  virtualLabId,
  templateProjectId,
  templateEntityId,
  entityType,
  notebookName,
  onProgress,
}: {
  virtualLabId: string;
  templateProjectId: string;
  templateEntityId: string;
  entityType: EntityCoreObjectTypes['type'];
  notebookName: string;
  onProgress?: (completed: number, total: number) => void;
}) {
  const templateCtx: WorkspaceContext = { virtualLabId, projectId: templateProjectId };

  // Get template's current state (source of truth)
  const [templateAssets, templateContribs] = await Promise.all([
    getAssets({ entityType, entityId: templateEntityId, ctx: templateCtx }),
    getContributions({ context: templateCtx, filters: { entity__id: templateEntityId } }),
  ]);

  // Download all template asset files
  const templateFiles = await Promise.all(
    templateAssets.data.map(async (asset) => {
      const response = await downloadAsset({
        ctx: templateCtx,
        entityType,
        entityId: templateEntityId,
        id: asset.id,
        asRawResponse: true,
      });
      const blob = await response.blob();
      const file = new File([blob], asset.path, { type: asset.content_type });
      return { file, contentType: asset.content_type as AssetContentType, label: asset.label };
    })
  );

  const allProjectIds = await listAllProjectIds(virtualLabId);
  const childProjectIds = allProjectIds.filter((id) => id !== templateProjectId);
  const total = childProjectIds.length;
  let completed = 0;
  let failures = 0;

  onProgress?.(0, total);

  for (const pid of childProjectIds) {
    try {
      const childCtx: WorkspaceContext = { virtualLabId, projectId: pid };
      const res = await getAnalysisNotebookTemplates({
        filters: { search: notebookName },
        context: childCtx,
      });
      const match = res.data.find((nb) => nb.name === notebookName);
      if (!match) {
        completed++;
        onProgress?.(completed, total);
        continue;
      }

      // Assets: wipe and re-upload
      const childAssets = await getAssets({ entityType, entityId: match.id, ctx: childCtx });
      await Promise.all(
        childAssets.data.map((a) =>
          deleteAsset({ entityType, entityId: match.id, id: a.id, ctx: childCtx })
        )
      );
      for (const { file, contentType, label } of templateFiles) {
        await uploadNotebookTemplateFile({
          context: childCtx,
          entityId: match.id,
          file,
          contentType,
          assetLabel: label,
        });
      }

      // Contributions: diff
      const childContribs = await getContributions({
        context: childCtx,
        filters: { entity__id: match.id },
      });

      const toDelete = childContribs.data.filter(
        (cc) =>
          !templateContribs.data.some(
            (tc) => tc.agent.id === cc.agent.id && tc.role.id === cc.role.id
          )
      );
      await Promise.all(toDelete.map((c) => deleteContribution({ id: c.id, context: childCtx })));

      const toCreate = templateContribs.data.filter(
        (tc) =>
          !childContribs.data.some((cc) => cc.agent.id === tc.agent.id && cc.role.id === tc.role.id)
      );
      await Promise.all(
        toCreate.map((tc) =>
          createContribution({
            context: childCtx,
            contributor: { agent_id: tc.agent.id, role_id: tc.role.id, entity_id: match.id },
          })
        )
      );
    } catch (_) {
      failures++;
    }
    completed++;
    onProgress?.(completed, total);
  }

  if (failures > 0) {
    throw new Error(`Failed to sync ${failures} child project(s)`);
  }
}

const ASSET_FILE_CONFIGS = [
  {
    key: 'notebook' as const,
    label: 'Jupyter Notebook',
    accept: ['.ipynb', '.IPYNB'],
    acceptLabel: 'ipynb',
    contentType: AssetContentType.ipynb,
    assetLabel: AssetLabel.jupyter_notebook,
    validate: (file: File): string | null => {
      if (!file.name.endsWith('.ipynb')) return 'File must have .ipynb extension';
      return null;
    },
  },
  {
    key: 'requirements' as const,
    label: 'Requirements File',
    accept: ['.txt', '.TXT'],
    acceptLabel: 'txt',
    contentType: AssetContentType.text,
    assetLabel: AssetLabel.requirements,
    validate: (file: File): string | null => {
      if (file.name !== 'requirements.txt') return 'File must be named requirements.txt';
      return null;
    },
  },
  {
    key: 'zip' as const,
    label: 'Supporting Files',
    accept: ['.zip', '.ZIP'],
    acceptLabel: 'zip',
    contentType: AssetContentType.zip,
    assetLabel: AssetLabel.notebook_required_files,
    validate: (file: File): string | null => {
      if (!file.name.endsWith('.zip')) return 'File must have .zip extension';
      return null;
    },
  },
] as const;

const QUERY_FN_MAPPING = {
  [AgentType.Person.key]: getPersons,
  [AgentType.Organization.key]: getOrganizations,
  [AgentType.Consortium.key]: getConsortia,
} as const;

const AGENT_TYPE_OPTIONS = Object.entries(AgentType).map(([, value]) => ({
  label: value.label,
  value: value.key,
}));

type PendingContribution = {
  agent_type: TAgentType;
  agent_id: string;
  role_id: string;
};

const STEPS = [
  { key: 'setup', label: 'Setup' },
  { key: 'assets', label: 'Assets' },
  { key: 'contribution', label: 'Contribution' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export function SyncNotebookModal({
  open,
  onClose,
  record,
  virtualLabId,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  record: EntityCoreObjectTypes;
  virtualLabId: string;
  projectId: string;
}) {
  const notification = useAppNotification();
  const [syncProgress, setSyncProgress] = useState<{ completed: number; total: number } | null>(
    null
  );
  const [syncWarning, setSyncWarning] = useState(false);

  const name = 'name' in record ? (record.name as string) : '';

  const startSync = async () => {
    setSyncProgress({ completed: 0, total: 0 });
    setSyncWarning(false);
    try {
      await syncChildProjects({
        virtualLabId,
        templateProjectId: projectId,
        templateEntityId: record.id,
        entityType: record.type,
        notebookName: name,
        onProgress: (completed, total) => setSyncProgress({ completed, total }),
      });
      notification.success({
        message: 'Child projects synced successfully',
        placement: 'topRight',
      });
      handleClose();
    } catch (_) {
      setSyncWarning(true);
    }
  };

  function handleClose() {
    setSyncProgress(null);
    setSyncWarning(false);
    onClose();
  }

  // Start sync when modal opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally trigger only on open
  useEffect(() => {
    if (open) {
      startSync();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      position="center"
      className="h-auto w-120 rounded-2xl"
      bodyClassName="flex flex-col items-center justify-center gap-6 p-8"
      overlayClassName="bg-primary-9/80 backdrop-blur-sm!"
      onClose={handleClose}
      closable={false}
      title={
        <div className="flex w-full items-center justify-between gap-2">
          <h3 className="text-primary-9 text-2xl font-bold">Sync Child Projects</h3>
          {syncWarning && (
            <Button
              variant="icon"
              className="text-primary-9 hover:text-primary-6 hover:bg-background ml-auto size-8 bg-white text-lg"
              onClick={handleClose}
            >
              <CloseOutlined />
            </Button>
          )}
        </div>
      }
    >
      {syncProgress && (
        <SyncProgressWheel
          completed={syncProgress.completed}
          total={syncProgress.total}
          warning={syncWarning}
        />
      )}
      {syncWarning && (
        <p className="text-orange-600 text-center text-sm">
          Failed to propagate to all child projects. Try to re-sync later.
        </p>
      )}
      {syncWarning && (
        <Button
          type="button"
          variant="outline"
          rounded
          size="lg"
          className="text-primary-9 border-primary-9 px-10 font-bold"
          onClick={handleClose}
        >
          Close
        </Button>
      )}
    </Modal>
  );
}

export function UpdateNotebookModal({
  open,
  onClose,
  record,
  virtualLabData,
}: UpdateNotebookModalProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const queryClient = useQueryClient();
  const ctx = { virtualLabId, projectId };

  const [activeStep, setActiveStep] = useState<StepKey>('setup');
  const [assetsToRemove, setAssetsToRemove] = useState<IAsset[]>([]);
  const [newAssetFiles, setNewAssetFiles] = useState<
    Map<string, { file: File; config: (typeof ASSET_FILE_CONFIGS)[number] }>
  >(new Map());
  const [contributionsToRemove, setContributionsToRemove] = useState<IContributor[]>([]);
  const [newContributions, setNewContributions] = useState<PendingContribution[]>([]);

  const name = 'name' in record ? (record.name as string) : '';

  const { data: existingAssets, isLoading: assetsLoading } = useQuery({
    queryKey: ['update-notebook-assets', record.id],
    queryFn: () => getAssets({ entityType: record.type, entityId: record.id, ctx }),
    enabled: open,
  });

  const { data: existingContributions, isLoading: contributionsLoading } = useQuery({
    queryKey: ['update-notebook-contributions', record.id],
    queryFn: () => getContributions({ context: ctx, filters: { entity__id: record.id } }),
    enabled: open,
  });

  const visibleAssets = (existingAssets?.data ?? []).filter(
    (a) => !assetsToRemove.some((r) => r.id === a.id)
  );

  const visibleContributions = (existingContributions?.data ?? []).filter(
    (c) => !contributionsToRemove.some((r) => r.id === c.id)
  );

  const [progressSteps, setProgressSteps] = useState<
    Array<{
      key: string;
      label: string;
      status: 'idle' | 'pending' | 'success' | 'error' | 'warning';
    }>
  >([]);

  // Sync phase state (separate progress wheel)
  const [syncProgress, setSyncProgress] = useState<{ completed: number; total: number } | null>(
    null
  );
  const [syncWarning, setSyncWarning] = useState(false);

  const isCourseTemplate =
    !!virtualLabData?.course && virtualLabData.course.template_project_id === projectId;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const steps: typeof progressSteps = [];
      if (assetsToRemove.length > 0)
        steps.push({ key: 'remove-assets', label: 'Removing assets', status: 'idle' });
      if (newAssetFiles.size > 0)
        steps.push({ key: 'upload-assets', label: 'Uploading assets', status: 'idle' });
      if (contributionsToRemove.length > 0)
        steps.push({
          key: 'remove-contributions',
          label: 'Removing contributions',
          status: 'idle',
        });
      if (newContributions.filter((c) => c.agent_id && c.role_id).length > 0)
        steps.push({ key: 'add-contributions', label: 'Adding contributions', status: 'idle' });

      setProgressSteps(steps);

      const markStep = (key: string, status: 'pending' | 'success' | 'error' | 'warning') =>
        setProgressSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status } : s)));

      const runStep = async (key: string, label: string, fn: () => Promise<unknown>) => {
        markStep(key, 'pending');
        try {
          await fn();
          markStep(key, 'success');
        } catch (_) {
          markStep(key, 'error');
          throw new Error(`Failed while: ${label}`);
        }
      };

      if (assetsToRemove.length > 0) {
        await runStep('remove-assets', 'Removing assets', () =>
          Promise.all(
            assetsToRemove.map((a) =>
              deleteAsset({ entityType: record.type, entityId: record.id, id: a.id, ctx })
            )
          )
        );
      }

      if (newAssetFiles.size > 0) {
        await runStep('upload-assets', 'Uploading assets', async () => {
          for (const [, { file, config }] of newAssetFiles) {
            await uploadNotebookTemplateFile({
              context: ctx,
              entityId: record.id,
              file,
              contentType: config.contentType,
              assetLabel: config.assetLabel,
            });
          }
        });
      }

      if (contributionsToRemove.length > 0) {
        await runStep('remove-contributions', 'Removing contributions', () =>
          Promise.all(
            contributionsToRemove.map((c) => deleteContribution({ id: c.id, context: ctx }))
          )
        );
      }

      const validNewContributions = newContributions.filter((c) => c.agent_id && c.role_id);
      if (validNewContributions.length > 0) {
        await runStep('add-contributions', 'Adding contributions', () =>
          Promise.all(
            validNewContributions.map((c) =>
              createContribution({
                context: ctx,
                contributor: { agent_id: c.agent_id, role_id: c.role_id, entity_id: record.id },
              })
            )
          )
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const first = query.queryKey[0] as
            | { context?: { extendedEntityType?: string } }
            | undefined;
          return first?.context?.extendedEntityType === record.type;
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['update-notebook-assets', record.id] });
      await queryClient.invalidateQueries({
        queryKey: ['update-notebook-contributions', record.id],
      });
      notification.success({ message: 'Notebook updated successfully', placement: 'topRight' });

      // Start sync phase if course template
      if (isCourseTemplate) {
        setSyncProgress({ completed: 0, total: 0 });
        try {
          await syncChildProjects({
            virtualLabId,
            templateProjectId: projectId,
            templateEntityId: record.id,
            entityType: record.type,
            notebookName: name,
            onProgress: (completed, total) => setSyncProgress({ completed, total }),
          });
          notification.success({
            message: 'Child projects synced successfully',
            placement: 'topRight',
          });
          handleClose();
        } catch (_) {
          setSyncWarning(true);
        }
      } else {
        handleClose();
      }
    },
  });

  function handleClose() {
    setActiveStep('setup');
    setAssetsToRemove([]);
    setNewAssetFiles(new Map());
    setContributionsToRemove([]);
    setNewContributions([]);
    setProgressSteps([]);
    setSyncProgress(null);
    setSyncWarning(false);
    submitMutation.reset();
    onClose();
  }

  const activeStepIndex = STEPS.findIndex((s) => s.key === activeStep);
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === STEPS.length - 1;

  const hasChanges =
    assetsToRemove.length > 0 ||
    newAssetFiles.size > 0 ||
    contributionsToRemove.length > 0 ||
    newContributions.length > 0;

  const hasNotebookAsset =
    visibleAssets.some((a) => a.label === AssetLabel.jupyter_notebook) ||
    newAssetFiles.has('notebook');

  const hasAtLeastOneContribution =
    visibleContributions.length > 0 || newContributions.some((c) => c.agent_id && c.role_id);

  const canSubmit = hasChanges && hasNotebookAsset && hasAtLeastOneContribution;

  return (
    <Modal
      open={open}
      position="center"
      className="h-full max-h-[calc(100vh-6rem)] min-h-100 w-200 rounded-2xl"
      bodyClassName="flex flex-col h-[calc(100%-48px)] min-h-0 max-h-full overflow-hidden p-0 relative"
      overlayClassName="bg-primary-9/80 backdrop-blur-sm!"
      headerClassName={cn('w-full rounded-t-2xl pb-2', '[&_#modal-title]:w-full')}
      onClose={handleClose}
      closable={false}
      title={
        <div className="flex w-full items-center justify-between gap-2">
          <h3 className="text-primary-9 text-2xl font-bold">Update Notebook</h3>
          <Button
            variant="icon"
            className="text-primary-9 hover:text-primary-6 hover:bg-background ml-auto size-8 bg-white text-lg"
            onClick={handleClose}
          >
            <CloseOutlined />
          </Button>
        </div>
      }
    >
      <div className="relative mx-auto flex h-full w-full flex-col px-6 py-2">
        {/* Step navigation */}
        {!submitMutation.isPending && !submitMutation.isError && !syncProgress && (
          <div className="mb-2 shrink-0">
            <nav className="flex items-center gap-1">
              {STEPS.map((step, index) => (
                <div key={step.key} className="flex items-center gap-1">
                  <Button
                    borderless
                    rounded
                    type="button"
                    variant="outline"
                    className={cn(
                      'active:text-primary-6 text-label active:bg-neutral-1 bg-transparent px-2 text-base shadow-none',
                      { 'text-primary-6 font-bold': activeStep === step.key }
                    )}
                    onClick={() => setActiveStep(step.key)}
                  >
                    {step.label}
                  </Button>
                  {index < STEPS.length - 1 && <RightOutlined className="text-primary-9 size-2" />}
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* Step content */}
        <div className="border-neutral-2 secondary-scrollbar h-full max-h-full min-h-0 flex-1 overflow-auto rounded-md border p-6">
          {/* Sync phase progress */}
          {syncProgress && (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <SyncProgressWheel
                completed={syncProgress.completed}
                total={syncProgress.total}
                warning={syncWarning}
              />
              {syncWarning && (
                <p className="text-orange-600 text-center text-sm">
                  Failed to propagate to all child projects. Try to re-sync later.
                </p>
              )}
            </div>
          )}

          {/* Upload phase progress */}
          {!syncProgress &&
            (submitMutation.isPending || submitMutation.isError) &&
            progressSteps.length > 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <ProgressWheel steps={progressSteps} />
                {submitMutation.isError && (
                  <p className="text-red-600 text-center text-sm">
                    Error while{' '}
                    {progressSteps.find((s) => s.status === 'error')?.label.toLowerCase()}. Please
                    try again later or contact support if the issue persists.
                  </p>
                )}
              </div>
            )}

          {!syncProgress &&
            !submitMutation.isPending &&
            !submitMutation.isError &&
            activeStep === 'setup' && (
              <div>
                <span className="text-primary-9 mb-1 block text-sm font-semibold">Name</span>
                <div className="bg-neutral-1 text-primary-8 h-12 rounded-full px-4 leading-[3rem]">
                  {name}
                </div>
              </div>
            )}

          {!syncProgress &&
            !submitMutation.isPending &&
            !submitMutation.isError &&
            activeStep === 'assets' && (
              <AssetsStep
                assetsLoading={assetsLoading}
                visibleAssets={visibleAssets}
                newAssetFiles={newAssetFiles}
                onRemoveAsset={(asset) => setAssetsToRemove((prev) => [...prev, asset])}
                onAddAssetFile={(key, file, config) => {
                  setNewAssetFiles((prev) => {
                    const next = new Map(prev);
                    next.set(key, { file, config });
                    return next;
                  });
                }}
                onRemoveNewAsset={(key) => {
                  setNewAssetFiles((prev) => {
                    const next = new Map(prev);
                    next.delete(key);
                    return next;
                  });
                }}
              />
            )}

          {!syncProgress &&
            !submitMutation.isPending &&
            !submitMutation.isError &&
            activeStep === 'contribution' && (
              <ContributionsStep
                contributionsLoading={contributionsLoading}
                visibleContributions={visibleContributions}
                newContributions={newContributions}
                onRemoveContribution={(contrib) =>
                  setContributionsToRemove((prev) => [...prev, contrib])
                }
                onAddNewContribution={() =>
                  setNewContributions((prev) => [
                    ...prev,
                    { agent_type: '' as TAgentType, agent_id: '', role_id: '' },
                  ])
                }
                onUpdateNewContribution={(idx, updated) =>
                  setNewContributions((prev) => prev.map((c, i) => (i === idx ? updated : c)))
                }
                onRemoveNewContribution={(idx) =>
                  setNewContributions((prev) => prev.filter((_, i) => i !== idx))
                }
              />
            )}
        </div>

        {/* Footer navigation */}
        <div className="mt-auto flex w-full shrink-0 items-center justify-between gap-2 py-3">
          {submitMutation.isError || syncWarning ? (
            <Button
              type="button"
              variant="outline"
              rounded
              size="lg"
              className="text-primary-9 border-primary-9 mx-auto px-10 font-bold"
              onClick={handleClose}
            >
              Close
            </Button>
          ) : !syncProgress ? (
            <>
              <Button
                rounded
                variant="outline"
                className="text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb size-12"
                size="lg"
                type="button"
                onClick={() => setActiveStep(STEPS[activeStepIndex - 1].key)}
                disabled={isFirstStep}
              >
                <LeftOutlined />
              </Button>

              <Button
                type="button"
                variant="success"
                rounded
                size="lg"
                disabled={!canSubmit || submitMutation.isPending}
                onClick={() => submitMutation.mutateAsync()}
                className={cn('px-10 font-bold', {
                  'bg-neutral-3! text-neutral-5! border-neutral-3!':
                    !canSubmit || submitMutation.isPending,
                })}
              >
                {submitMutation.isPending ? 'Saving...' : 'Confirm'}
              </Button>

              <Button
                rounded
                variant="outline"
                type="button"
                size="lg"
                className="text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb size-12"
                onClick={() => setActiveStep(STEPS[activeStepIndex + 1].key)}
                disabled={isLastStep}
              >
                <RightOutlined />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function AssetsStep({
  assetsLoading,
  visibleAssets,
  newAssetFiles,
  onRemoveAsset,
  onAddAssetFile,
  onRemoveNewAsset,
}: {
  assetsLoading: boolean;
  visibleAssets: IAsset[];
  newAssetFiles: Map<string, { file: File; config: (typeof ASSET_FILE_CONFIGS)[number] }>;
  onRemoveAsset: (asset: IAsset) => void;
  onAddAssetFile: (key: string, file: File, config: (typeof ASSET_FILE_CONFIGS)[number]) => void;
  onRemoveNewAsset: (key: string) => void;
}) {
  if (assetsLoading) return <p className="text-sm text-gray-500">Loading assets...</p>;

  return (
    <div>
      {visibleAssets.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {visibleAssets.map((asset) => (
            <div
              key={asset.id}
              className="border-neutral-2 flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <span className="text-primary-8 text-sm font-medium">{asset.path}</span>
                <span className="text-primary-5 ml-2 text-xs">{asset.label}</span>
              </div>
              <Button
                type="button"
                variant="icon"
                size="sm"
                className="hover:text-destructive text-primary-5"
                onClick={() => onRemoveAsset(asset)}
              >
                <DeleteOutlined />
              </Button>
            </div>
          ))}
        </div>
      )}

      {ASSET_FILE_CONFIGS.map((config) => {
        const hasExisting = visibleAssets.some((a) => a.label === config.assetLabel);
        const hasNew = newAssetFiles.has(config.key);
        if (hasExisting) return null;

        return (
          <div key={config.key} className="mb-4">
            <span className="text-primary-8 mb-1 block text-sm font-medium">
              {config.label}
              {hasNew && <span className="text-green-600 ml-2 text-xs">(new file staged)</span>}
            </span>
            {hasNew ? (
              <div className="border-neutral-2 flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{newAssetFiles.get(config.key)?.file.name}</span>
                <Button
                  type="button"
                  variant="icon"
                  size="sm"
                  className="hover:text-destructive text-primary-5"
                  onClick={() => onRemoveNewAsset(config.key)}
                >
                  <DeleteOutlined />
                </Button>
              </div>
            ) : (
              <AssetUpload
                maxFiles={1}
                multiple={false}
                accept={[...config.accept]}
                acceptLabel={config.acceptLabel}
                onValidateFile={config.validate}
                onFilesChange={(files) => {
                  const file = files[0]?.file instanceof File ? (files[0].file as File) : undefined;
                  if (file) onAddAssetFile(config.key, file, config);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContributionsStep({
  contributionsLoading,
  visibleContributions,
  newContributions,
  onRemoveContribution,
  onAddNewContribution,
  onUpdateNewContribution,
  onRemoveNewContribution,
}: {
  contributionsLoading: boolean;
  visibleContributions: IContributor[];
  newContributions: PendingContribution[];
  onRemoveContribution: (contrib: IContributor) => void;
  onAddNewContribution: () => void;
  onUpdateNewContribution: (idx: number, value: PendingContribution) => void;
  onRemoveNewContribution: (idx: number) => void;
}) {
  if (contributionsLoading)
    return <p className="text-sm text-gray-500">Loading contributions...</p>;

  return (
    <div>
      {visibleContributions.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {visibleContributions.map((contrib) => (
            <div
              key={contrib.id}
              className="border-neutral-2 flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <span className="text-primary-8 text-sm font-medium">
                  {contrib.agent.pref_label}
                </span>
                <span className="text-primary-5 ml-2 text-xs">{capitalize(contrib.role.name)}</span>
              </div>
              <Button
                type="button"
                variant="icon"
                size="sm"
                className="hover:text-destructive text-primary-5"
                onClick={() => onRemoveContribution(contrib)}
              >
                <DeleteOutlined />
              </Button>
            </div>
          ))}
        </div>
      )}

      {newContributions.map((contrib, idx) => (
        <NewContributionRow
          key={idx}
          value={contrib}
          onChange={(updated) => onUpdateNewContribution(idx, updated)}
          onRemove={() => onRemoveNewContribution(idx)}
        />
      ))}

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          rounded
          size="lg"
          onClick={onAddNewContribution}
          className={cn(
            'text-primary-6 bg-background hover:bg-neutral-1',
            'hover:border-primary-7 hover:text-primary-7 w-max',
            'not-disabled:bg-primary-9 not-disabled:text-white!',
            'not-disabled:hover:bg-primary-8'
          )}
        >
          <span>Add contribution</span>
          <PlusOutlined />
        </Button>
      </div>
    </div>
  );
}

function ProgressWheel({
  steps,
}: {
  steps: Array<{
    key: string;
    label: string;
    status: 'idle' | 'pending' | 'success' | 'error' | 'warning';
  }>;
}) {
  const completed = steps.filter((s) => s.status === 'success' || s.status === 'warning').length;
  const hasError = steps.some((s) => s.status === 'error');
  const hasWarning = steps.some((s) => s.status === 'warning');
  const progress = steps.length > 0 ? (completed / steps.length) * 100 : 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <>
      <div className="relative">
        <svg
          className="h-48 w-48 -rotate-90 transform"
          viewBox="0 0 128 128"
          role="img"
          aria-label="Upload progress"
        >
          <circle cx="64" cy="64" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="none" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke={hasError ? '#dc2626' : hasWarning ? '#ea580c' : '#003a8c'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn('text-2xl font-bold select-none', {
              'text-red-600': hasError,
              'text-orange-600': hasWarning && !hasError,
              'text-primary-8': !hasError && !hasWarning,
            })}
          >
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-2">
            {step.status === 'pending' && <LoadingIcon className="text-primary-6 animate-spin" />}
            {step.status === 'success' && <CheckOutlined className="text-teal-600" />}
            {step.status === 'error' && <CloseOutlined className="text-red-600" />}
            {step.status === 'warning' && <WarningOutlined className="text-orange-600" />}
            {step.status === 'idle' && <div className="bg-primary-8 ml-1 size-3 rounded-full" />}
            <span
              className={cn('select-none text-sm', {
                'text-primary-6': step.status === 'pending',
                'font-bold text-teal-600': step.status === 'success',
                'font-bold text-red-600': step.status === 'error',
                'font-bold text-orange-600': step.status === 'warning',
              })}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function SyncProgressWheel({
  completed,
  total,
  warning,
}: {
  completed: number;
  total: number;
  warning: boolean;
}) {
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <>
      <div className="relative">
        <svg
          className="h-48 w-48 -rotate-90 transform"
          viewBox="0 0 128 128"
          role="img"
          aria-label="Sync progress"
        >
          <circle cx="64" cy="64" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="none" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke={warning ? '#ea580c' : '#003a8c'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn('text-2xl font-bold select-none', {
              'text-orange-600': warning,
              'text-primary-8': !warning,
            })}
          >
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <p
        className={cn('text-center text-sm select-none', {
          'text-orange-600': warning,
          'text-primary-6': !warning,
        })}
      >
        Syncing child projects ({completed}/{total})
      </p>
    </>
  );
}

function NewContributionRow({
  value,
  onChange,
  onRemove,
}: {
  value: PendingContribution;
  onChange: (v: PendingContribution) => void;
  onRemove: () => void;
}) {
  const AgentRoleDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter, IRole>({
        id: 'update-agent-role-selector',
        dataKey: keyBuilder.roles({ roleType: 'contributor' }),
        queryFn: getRoles,
        getOptionLabel: (l) => capitalize(l.name),
        getOptionValue: (l) => l.id,
        placeholder: 'Select a role...',
        searchPlaceholder: 'Search role...',
        clsx: { trigger: 'rounded-full h-10', content: 'z-[99999]' },
        searchable: false,
      }),
    []
  );

  const AgentDropdown = useMemo(() => {
    if (!value.agent_type) return null;
    const queryFn = QUERY_FN_MAPPING[value.agent_type as keyof typeof QUERY_FN_MAPPING];
    if (!queryFn) return null;
    return AsyncSelectFormItem<PaginationFilter, Agent>({
      id: `update-agent-${value.agent_type}-selector`,
      dataKey: keyBuilder.agents({ agentType: value.agent_type }),
      queryFn,
      getOptionLabel: (l) => l.pref_label,
      getOptionValue: (l) => l.id,
      placeholder: 'Select...',
      searchPlaceholder: 'Search...',
      clsx: { trigger: 'rounded-full h-10', content: 'z-[99999]' },
      searchable: true,
      searchField: 'pref_label__ilike',
    });
  }, [value.agent_type]);

  return (
    <Card className="relative mb-2 gap-0 p-4 shadow-sm!" borderless>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <span className="text-xs font-medium text-primary-6">Type</span>
          <SelectPopover
            options={AGENT_TYPE_OPTIONS}
            placeholder="Select type..."
            searchable={false}
            selectedValue={value.agent_type || undefined}
            onSelect={(opt) =>
              onChange({ ...value, agent_type: opt?.value as TAgentType, agent_id: '' })
            }
            clsx={{ trigger: 'rounded-full h-10 w-full', content: 'z-[99999]' }}
          />
        </div>
        <div className="flex-1">
          <span className="text-xs font-medium text-primary-6">Role</span>
          <AgentRoleDropdown
            value={value.role_id || undefined}
            onChange={(v: string | undefined) => onChange({ ...value, role_id: v ?? '' })}
          />
        </div>
        <Button
          type="button"
          variant="icon"
          size="sm"
          className="hover:text-destructive text-primary-5 mt-4"
          onClick={onRemove}
        >
          <DeleteOutlined />
        </Button>
      </div>
      {value.agent_type && AgentDropdown && (
        <div className="mt-2">
          <span className="text-xs font-medium text-primary-6">Name</span>
          <AgentDropdown
            value={value.agent_id || undefined}
            onChange={(v: string | undefined) => onChange({ ...value, agent_id: v ?? '' })}
          />
        </div>
      )}
    </Card>
  );
}
