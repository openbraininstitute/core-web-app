import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';
import { useMemo, useState } from 'react';
import { match } from 'ts-pattern';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ApiError } from '@/api/error';
import { runTask } from '@/api/one/runner';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { useAppNotification } from '@/components/notification';
import {
  listAllChildren as listAllSimulationChildren,
  listExecutionsBySimulationId,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import { getLatestSimulationExecution } from '@/entity-configuration/domain/simulation/status-utils';
import { resolveSimulationLaunchTarget } from '@/entity-configuration/domain/simulation/utils';
import { NodesSessionKeeper } from '@/features/circuit-nodes/hooks/nodes-session-keeper';
import { useFlag } from '@/features/feature-flags';
import { smallScalesViaLaunchSystemFlag } from '@/features/feature-flags/flags';
import { isLowCreditsError, useLowCredits } from '@/features/low-credits';
import {
  OfflineTokenConsentModal,
  useEnsureOfflineTokenConsent,
} from '@/features/offline-auth-management';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import { useCostConfirmation } from '@/features/scan-config/components/cost-confirmation-modal';
import { FileViewer, hasStatistics } from '@/features/scan-config/components/file-viewer';
import {
  SimulationFiles,
  useSimulationResultFiles,
} from '@/features/scan-config/components/simulation-files';
import { InOutFilesColumnSkeleton } from '@/features/scan-config/components/skeletons/columns';
import { errorRegistry } from '@/features/scan-config/error-registry';
import {
  ActivityCustomFileRenderer,
  isAssetBackedFile,
  type TAssetBackedFile,
} from '@/features/scan-config/types';
import {
  byReportKind,
  ReportPicker,
} from '@/features/scan-config/use-cases/simulations/report-picker';
import { ScanParameterPicker } from '@/features/scan-config/use-cases/simulations/scan-parameter-picker';
import { SimulationsResultsUiAdapter } from '@/features/scan-config/use-cases/simulations/ui-adapter';
import { useSimulationsTabState } from '@/features/scan-config/use-cases/simulations/use-simulations-tab-state';
import { SimulationReportsProvider } from '@/features/sonata-viewer/simulation-reports-context';
import { configTimeline } from '@/features/spike-viewer/config-timeline';
import { SimulationProvider } from '@/features/spike-viewer/simulation-context';
import { TaskConfigurationViewer, TaskLogsViewer } from '@/features/task-logs-stream';
import { isTerminalActivityStatus } from '@/features/task-runner';
import { invalidateProjectBalance } from '@/features/task-runner/hooks/use-balance-refresh';
import { messages } from '@/i18n/en/simulation';
import { runSimulationBatch } from '@/services/small-scale-simulator/circuit';
import { MessageType } from '@/services/small-scale-simulator/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import type { TSimulationLaunchTarget } from '@/entity-configuration/domain/simulation/utils';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type { TimelineSchema } from '@/features/spike-viewer/config-timeline';

type SimulationTabProps = {
  campaignId: string;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  isCampaignIdChanged: boolean;
  /** The neuron sets the campaign's config defines, which the output viewers list cells by. */
  neuronSetNames?: string[];
  /** The scan config's schema, which names the config's block types and settings for a reader. */
  configSchema?: TimelineSchema;
};

export default function SimulationsTab({
  campaignId,
  campaignOriginAction,
  isCampaignIdChanged,
  neuronSetNames,
  configSchema,
}: SimulationTabProps) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();
  const context = useWorkspace();

  const { data: simulations = [], isLoading: simulationsLoading } = useQuery({
    queryKey: ['scan-config-simulations', context, campaignId],
    queryFn: () =>
      listAllSimulationChildren({
        id: campaignId,
        context,
      }),
    enabled: Boolean(campaignId),
  });

  const {
    entity: model,
    entityType,
    isLoading: modelLoading,
  } = useModelQuery({
    context,
    id: simulations[0]?.entity_id,
  });

  const smallScalesViaLaunchSystem = !!useFlag(smallScalesViaLaunchSystemFlag.key);
  const launchTarget = resolveSimulationLaunchTarget({
    entityType: entityType ?? null,
    scale: get(model, 'scale', null),
    targetSimulator: get(model, 'target_simulator', null),
    smallScalesViaLaunchSystem,
  });

  const [simRequestInProgress, setSimRequestInProgress] = useState<boolean>(false);
  const [filesLoading, setFilesLoading] = useState(false);

  const { state, act, selectableSimulationIds, resolvedSelectedSimulationIds } =
    useSimulationsTabState(campaignId, simulations);
  const {
    activeSimulation: pickedSimulation,
    selectedFile,
    statusBySimulationId: localStatusMap,
    jobIdBySimulationId: jobIdMap,
  } = state;

  const activeSimulation = pickedSimulation ?? simulations[0] ?? null;
  const {
    modal: offlineTokenConsentModal,
    ensure: ensureOfflineTokenConsent,
    cancel: cancelOfflineTokenConsent,
    openConsentLink,
  } = useEnsureOfflineTokenConsent({ useCache: true });

  const simConfigAsset = activeSimulation?.assets?.find(
    (a) => a.label === AssetLabel.sonata_simulation_config
  );

  const { data: simConfig } = useQuery({
    queryKey: [
      'simulation-config',
      { simulationId: activeSimulation?.id, assetId: simConfigAsset?.id },
    ],
    queryFn: async () => {
      const req = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.Simulation,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when both are available
        entityId: activeSimulation!.id,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when both are available
        id: simConfigAsset!.id,
        asRawResponse: true,
      });
      return req.json();
    },
    enabled: !!activeSimulation && !!simConfigAsset,
  });

  // What happens when in the simulation, for the spike raster to mark.
  // The simulation's single config: its blocks as set for this simulation, which say
  // when each stimulus fires where the SONATA config only says how it is wired.
  const coordinateAsset = activeSimulation?.assets?.find(
    (a) => a.label === AssetLabel.simulation_generation_config
  );
  const { data: coordinateConfig } = useQuery({
    queryKey: [
      'simulation-coordinate-config',
      { simulationId: activeSimulation?.id, assetId: coordinateAsset?.id },
    ],
    queryFn: async () => {
      const req = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.Simulation,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when both are available
        entityId: activeSimulation!.id,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when both are available
        id: coordinateAsset!.id,
        asRawResponse: true,
      });
      return req.json();
    },
    enabled: !!activeSimulation && !!coordinateAsset,
  });
  const timeline = useMemo(
    () => configTimeline(simConfig, coordinateConfig, configSchema),
    [simConfig, coordinateConfig, configSchema]
  );

  // The simulation's node sets file: the config's neuron sets resolved, which
  // the output viewers list cells by, beside the circuit's own node sets.
  const nodeSetsAsset = activeSimulation?.assets?.find(
    (a) => a.label === AssetLabel.custom_node_sets
  );
  const { data: nodeSets } = useQuery({
    queryKey: [
      'simulation-node-sets',
      { simulationId: activeSimulation?.id, assetId: nodeSetsAsset?.id },
    ],
    queryFn: async () => {
      const req = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.Simulation,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when both are available
        entityId: activeSimulation!.id,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when both are available
        id: nodeSetsAsset!.id,
        asRawResponse: true,
      });
      return (await req.json()) as Record<string, unknown>;
    },
    enabled: !!activeSimulation && !!nodeSetsAsset,
  });
  // The simulation on show, picked by its scan parameters: in the bar over a
  // results side panel, and in the header of the viewers that place it.
  const simulationPicker =
    activeSimulation && simulations.length > 1 ? (
      <ScanParameterPicker
        simulations={simulations}
        activeSimulationId={activeSimulation.id}
        statusMap={localStatusMap}
        onChange={act.onActiveSimulationChange}
      />
    ) : null;

  // The campaign itself, for a view comparing its simulations.
  const campaign = useMemo(
    () =>
      activeSimulation && simulations.length > 1
        ? {
            simulations,
            statusMap: localStatusMap,
            activeSimulationId: activeSimulation.id,
            onSelect: act.onActiveSimulationChange,
          }
        : null,
    [activeSimulation, simulations, localStatusMap, act.onActiveSimulationChange]
  );

  // By their names' content: the template hands a new list every render.
  const neuronSetKey = neuronSetNames?.join('\n');
  const neuronSets = useMemo(() => {
    if (!nodeSets || neuronSetKey === undefined) return null;
    const names = neuronSetKey ? neuronSetKey.split('\n') : [];
    return { names: names.filter((name) => name in nodeSets), nodeSets };
  }, [nodeSets, neuronSetKey]);

  const {
    notifyLowCredits,
    reportError: reportLowCredits,
    creditsModal,
  } = useLowCredits({ context, subject: 'run the simulation' });

  const activeSimulationExecStatus = activeSimulation && localStatusMap.get(activeSimulation.id);

  // The result's reports with statistics and the inputs' spikes, to switch
  // between from the bar over the open panel.
  const [, resultFiles] = useSimulationResultFiles(
    activeSimulation?.id ?? '',
    context,
    !!activeSimulationExecStatus &&
      [ActivityStatus.ERROR, ActivityStatus.DONE].includes(activeSimulationExecStatus)
  );
  const shownReport =
    selectedFile && isAssetBackedFile(selectedFile) && hasStatistics(selectedFile)
      ? selectedFile
      : undefined;
  const reportFiles = useMemo(() => {
    const inputs: TAssetBackedFile[] = activeSimulation
      ? activeSimulation.assets
          .filter((asset) => asset.label === AssetLabel.replay_spikes)
          .map((asset) => ({
            asset,
            entity: activeSimulation,
            renderer: ActivityCustomFileRenderer.Default,
          }))
      : [];
    const reports = [...resultFiles.filter((f) => hasStatistics(f)), ...inputs].sort(byReportKind);
    return shownReport && !reports.some((f) => f.asset.id === shownReport.asset.id)
      ? [shownReport, ...reports]
      : reports;
  }, [resultFiles, activeSimulation, shownReport]);
  const activeSimulationJobIdFromLaunch = activeSimulation
    ? jobIdMap.get(activeSimulation.id)
    : undefined;

  // Only launch-system executions have an `execution_id`, so this doesn't need the flag.
  const { data: recoveredJobId } = useQuery({
    queryKey: ['scan-config-simulation-execution-id', context, activeSimulation?.id],
    queryFn: async () => {
      const executions = await listExecutionsBySimulationId({
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when activeSimulation exists
        simulationId: activeSimulation!.id,
        context,
      });
      return getLatestSimulationExecution({ executions })?.execution_id ?? null;
    },
    enabled: Boolean(activeSimulation?.id) && !activeSimulationJobIdFromLaunch,
  });

  const activeJobId = activeSimulationJobIdFromLaunch ?? recoveredJobId ?? undefined;
  const taskLogsViewerEnabled = !!activeSimulation && !!activeJobId;
  const taskLogsShouldReadSnapshot =
    !!activeSimulationExecStatus && isTerminalActivityStatus(activeSimulationExecStatus);

  const {
    onActiveSimulationChange,
    onSelectedForSimChange,
    setSimulationStatus,
    onSimulationStatusLoad,
  } = act;

  const runViaLaunchSystem = async (
    simIds: string[],
    { taskType, requiresOfflineTokenConsent }: TSimulationLaunchTarget
  ) => {
    if (requiresOfflineTokenConsent) {
      const consentResult = await ensureOfflineTokenConsent();
      if (!consentResult.ok) {
        if (consentResult.reason !== 'cancelled') {
          notification.error({
            message: 'Unexpected error occurred, please try again later',
            duration: 10,
          });
        }
        setSimRequestInProgress(false);
        return;
      }
    }

    let nSubmissions = 0;
    let lowFundsError = false;

    for (const simId of simIds) {
      try {
        const res = await runTask({
          ctx: context,
          task_type: taskType,
          config_id: simId,
        });
        log('info', res);
        act.setSimulationJobId(simId, res.job_id);
        setSimulationStatus(simId, ActivityStatus.PENDING);
        nSubmissions += 1;
      } catch (error) {
        log('error', 'Failed to submit a simulation');
        if (isLowCreditsError(error)) {
          lowFundsError = true;
        }
      }
    }
    if (nSubmissions > 0) {
      // Launching reserves credits, so refetch the balance.
      invalidateProjectBalance({ queryClient, context });
    }
    act.onLaunched();
    setSimRequestInProgress(false);
    if (lowFundsError) {
      notifyLowCredits();
    } else if (nSubmissions !== simIds.length) {
      notification.error({
        message: 'We ran into a problem submitting your simulation(s). Please try again later.',
        duration: 10,
      });
    } else {
      notification.success({
        message: 'Simulation(s) submitted successfully.',
        duration: 10,
      });
    }
  };

  // TODO Refactor
  const run = async (simIds: string[]) => {
    setSimRequestInProgress(true);
    if (launchTarget) {
      return runViaLaunchSystem(simIds, launchTarget);
    }

    try {
      await runSimulationBatch({
        ctx: context,
        simulationIds: simIds,
        onInit: () => {
          // Earliest signal the batch was accepted — credits are reserved from here.
          invalidateProjectBalance({ queryClient, context });
          simIds.forEach((simId) => {
            setSimulationStatus(simId, ActivityStatus.PENDING);
          });
          act.onLaunched();
          setSimRequestInProgress(false);
        },
        onMessage: (message) => {
          match(message)
            .with({ message_type: MessageType.STATUS }, (msg) => {
              const simId = msg.ctx?.simulation_id;
              if (simId) {
                setSimulationStatus(simId, msg.status as unknown as ActivityStatus);
              }
              if (msg.status !== 'done') return;
              const simulation = simulations.find((s) => s.id === simId);
              if (!simulation) return;
              notification.success({
                message: `Simulation ${simulation?.name} done`,
              });
            })
            .otherwise(() => null);
        },
      });
    } catch (error) {
      const defaultMsg = messages.RunningSimulationDefaultError;

      if (reportLowCredits(error)) return;

      if (error instanceof ApiError) {
        const message = getErrorMessage(error.cause?.code, errorRegistry, defaultMsg);
        return notification.error({ message, duration: 20 });
      }

      notification.error({ message: defaultMsg, duration: 20 });
    } finally {
      setSimRequestInProgress(false);
    }
  };

  const simTaskType =
    launchTarget?.taskType ??
    (entityType === EntityTypeDict.IonChannelModel
      ? ObiOneTaskTypeDict.IonChannelModelSimulationExecution
      : ObiOneTaskTypeDict.CircuitSimulation);

  const costModalItems = useMemo(
    () =>
      simulations
        .filter((s) => resolvedSelectedSimulationIds.includes(s.id))
        .map((s) => ({ id: s.id, name: s.name })),
    [simulations, resolvedSelectedSimulationIds]
  );

  const { openModal, modal: costConfirmationModal } = useCostConfirmation({
    items: costModalItems,
    taskType: simTaskType,
    workflowLabel: 'simulations',
    context,
    onConfirm: run,
  });

  // Me-models on the small-scale simulator have no cost estimator.
  const onLaunch = (simIds: string[]) => {
    if (entityType === EntityTypeDict.Memodel && !launchTarget) {
      run(simIds);
      return;
    }
    openModal();
  };

  const onToggleSelectAll = (checked: boolean) => {
    act.onToggleSelectAll(checked);
  };

  const launchSimBtnLabelPrefix = resolvedSelectedSimulationIds.length
    ? `(${resolvedSelectedSimulationIds.length})`
    : '';

  // Until the model resolves, Launch would go to the small-scale simulator.
  const loading = simulationsLoading || modelLoading;

  return (
    // The viewers are remounted for each report and simulation: the cells they
    // read stay open between them, so a population is read once.
    <NodesSessionKeeper>
      <SimulationsResultsUiAdapter
        simulationPicker={simulationPicker}
        reportPicker={
          <ReportPicker
            files={reportFiles}
            selectedAssetId={shownReport?.asset.id}
            onSelect={act.onSelectedFileChange}
            reports={simConfig?.reports}
          />
        }
        // The campaign's statistics compare its spikes or its voltages, so only those offer them.
        campaignStatistics={campaign !== null && shownReport !== undefined}
        campaignId={campaignId}
        loading={loading}
        simulations={simulations}
        activeSimulationId={activeSimulation?.id}
        selectedSimulationIds={resolvedSelectedSimulationIds}
        selectableSimulationIds={selectableSimulationIds}
        simRequestInProgress={simRequestInProgress}
        context={context}
        statusMap={localStatusMap}
        launchSimBtnLabelPrefix={launchSimBtnLabelPrefix}
        onToggleSelectAll={onToggleSelectAll}
        onActiveSimulationChange={onActiveSimulationChange}
        onSelectedForSimChange={onSelectedForSimChange}
        onSimulationStatusLoad={onSimulationStatusLoad}
        onRun={onLaunch}
        middle={
          <div className="h-full bg-white! w-full">
            {loading ? (
              <InOutFilesColumnSkeleton />
            ) : (
              !!activeSimulation &&
              activeSimulationExecStatus && (
                <SimulationFiles
                  simulation={activeSimulation}
                  execStatus={activeSimulationExecStatus}
                  selectedFile={selectedFile}
                  context={context}
                  onSelect={act.onSelectedFileChange}
                  onLoadingChange={setFilesLoading}
                  jobId={activeJobId}
                  reports={simConfig?.reports}
                />
              )
            )}
          </div>
        }
        right={
          <>
            {selectedFile?.renderer === ActivityCustomFileRenderer.TaskConfigurationViewer && (
              <TaskConfigurationViewer
                jobId={activeJobId}
                workspace={context}
                configId={activeSimulation?.id}
                enabled={taskLogsViewerEnabled}
                skipStream
                campaignOriginAction={campaignOriginAction}
                isCampaignIdChanged={isCampaignIdChanged}
              />
            )}
            {selectedFile?.renderer === ActivityCustomFileRenderer.TaskLogsViewer && (
              <TaskLogsViewer
                jobId={activeJobId}
                workspace={context}
                configId={activeSimulation?.id}
                enabled={taskLogsViewerEnabled}
                skipStream={taskLogsShouldReadSnapshot}
                campaignOriginAction={campaignOriginAction}
                isCampaignIdChanged={isCampaignIdChanged}
              />
            )}
            {selectedFile?.renderer === ActivityCustomFileRenderer.Default && (
              <SimulationReportsProvider reports={simConfig?.reports ?? null}>
                {/* The spike viewer replays over the circuit that was scanned and
                      spans its axis over the run window, neither of which is in the
                      file it is handed. Both already resolved above. */}
                <SimulationProvider
                  model={model}
                  run={simConfig?.run}
                  neuronSets={neuronSets}
                  simulationPicker={simulationPicker}
                  campaign={campaign}
                  timeline={timeline}
                >
                  <FileViewer
                    file={selectedFile}
                    className="h-full w-full"
                    context={context}
                    loading={filesLoading}
                  />
                </SimulationProvider>
              </SimulationReportsProvider>
            )}
          </>
        }
      />

      <OfflineTokenConsentModal
        open={offlineTokenConsentModal.open}
        consentUrl={offlineTokenConsentModal.consentUrl}
        onCancel={cancelOfflineTokenConsent}
        onOpenConsent={() => openConsentLink(offlineTokenConsentModal.consentUrl)}
      />

      {costConfirmationModal}

      {creditsModal}
    </NodesSessionKeeper>
  );
}
