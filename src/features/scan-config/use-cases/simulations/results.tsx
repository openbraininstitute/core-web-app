import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  hasSimConfigAsset,
  resolveSimulationLaunchTarget,
} from '@/entity-configuration/domain/simulation/utils';
import { isLowCreditsError, useLowCredits } from '@/features/low-credits';
import {
  OfflineTokenConsentModal,
  useEnsureOfflineTokenConsent,
} from '@/features/offline-auth-management';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import { useCostConfirmation } from '@/features/scan-config/components/cost-confirmation-modal';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { SimulationFiles } from '@/features/scan-config/components/simulation-files';
import { InOutFilesColumnSkeleton } from '@/features/scan-config/components/skeletons/columns';
import { getLatestSimExecStatus } from '@/features/scan-config/components/utils';
import errorRegistry from '@/features/scan-config/error-registry';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';
import { SimulationsResultsUiAdapter } from '@/features/scan-config/use-cases/simulations/ui-adapter';
import { SimulationReportsProvider } from '@/features/sonata-viewer/simulation-reports-context';
import { TaskConfigurationViewer, TaskLogsViewer } from '@/features/task-logs-stream';
import { isTerminalActivityStatus } from '@/features/task-runner';
import { invalidateProjectBalance } from '@/features/task-runner/hooks/use-balance-refresh';
import { messages } from '@/i18n/en/simulation';
import { runSimulationBatch } from '@/services/small-scale-simulator/circuit';
import { MessageType } from '@/services/small-scale-simulator/types';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { TWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';

type SimulationTabProps = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  isCampaignIdChanged: boolean;
  /**
   * obi-one + entitycore task types for this workflow, resolved from its definition. For circuit
   * simulations the `obiOne` launch type is resolved from the circuit's `target_simulator`.
   */
  taskTypeBindings?: TWorkflowTaskTypeBindings;
};

export default function SimulationsTab({
  campaignId,
  virtualLabId,
  projectId,
  campaignOriginAction,
  isCampaignIdChanged,
  taskTypeBindings,
}: SimulationTabProps) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const { data: simulations = [], isLoading: simulationsLoading } = useQuery({
    queryKey: ['scan-config-simulations', context, campaignId],
    queryFn: () =>
      listAllSimulationChildren({
        id: campaignId,
        context,
      }),
    enabled: Boolean(campaignId),
  });

  const { entity: model, entityType } = useModelQuery({
    context,
    id: simulations[0]?.entity_id,
  });

  const scale = get(model, 'scale', null);
  const targetSimulator = get(model, 'target_simulator', null);
  const launchTarget = resolveSimulationLaunchTarget({
    entityType: entityType ?? null,
    scale,
    targetSimulator,
  });
  // Prefer the workflow definition's resolved binding; fall back to deriving it from the model so
  // simulate workflows without an explicit binding (me-model) keep working. `null` means the
  // campaign is not launchable via obi-one and goes to the small-scale simulator instead.
  const launchTaskType = taskTypeBindings?.obiOne ?? launchTarget?.taskType ?? null;
  const shouldTreatSimulationAsTask = launchTaskType !== null;
  // Defaults to asking while the model is still loading: an unnecessary prompt is an annoyance,
  // whereas a launch that needs consent and doesn't have it fails at job creation.
  const launchRequiresOfflineTokenConsent = launchTarget?.requiresOfflineTokenConsent ?? true;

  const [localStatusMap, setLocalStatusMap] = useState<Map<string, ActivityStatus>>(new Map());
  const [simRequestInProgress, setSimRequestInProgress] = useState<boolean>(false);
  const [selectedSimulationIds, setSelectedSimulationIds] = useState<string[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<null | ISimulation>(null);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [jobIdMap, setJobIdMap] = useState<Map<string, string>>(new Map());
  const {
    modal: offlineTokenConsentModal,
    ensure: ensureOfflineTokenConsent,
    cancel: cancelOfflineTokenConsent,
    openConsentLink,
  } = useEnsureOfflineTokenConsent({ useCache: true });
  const previousCampaignIdRef = useRef(campaignId);

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

  const {
    notifyLowCredits,
    reportError: reportLowCredits,
    creditsModal,
  } = useLowCredits({ context, subject: 'run the simulation' });

  const activeSimulationExecStatus = activeSimulation && localStatusMap.get(activeSimulation.id);
  const activeSimulationJobIdFromLaunch = activeSimulation
    ? jobIdMap.get(activeSimulation.id)
    : undefined;

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
    enabled:
      shouldTreatSimulationAsTask &&
      Boolean(activeSimulation?.id) &&
      !activeSimulationJobIdFromLaunch,
  });

  const activeJobId = shouldTreatSimulationAsTask
    ? (activeSimulationJobIdFromLaunch ?? recoveredJobId ?? undefined)
    : undefined;
  const taskLogsViewerEnabled = !!activeSimulation && !!activeJobId;
  const taskLogsShouldReadSnapshot =
    !!activeSimulationExecStatus && isTerminalActivityStatus(activeSimulationExecStatus);

  const onActiveSimulationChange = useCallback((simulation: ISimulation) => {
    setActiveSimulation(simulation);
  }, []);

  const onSelectedForSimChange = useCallback((simulationId: string, selected: boolean) => {
    if (selected) {
      setSelectedSimulationIds((prev) => [...prev, simulationId]);
    } else {
      setSelectedSimulationIds((prev) => prev.filter((id) => id !== simulationId));
    }
  }, []);

  const setSimulationStatus = useCallback((simulationId: string, status: ActivityStatus) => {
    setLocalStatusMap((prev) => new Map(prev).set(simulationId, status));
  }, []);

  const onSimulationStatusLoad = useCallback((simulationId: string, status: ActivityStatus) => {
    setLocalStatusMap((prev) => {
      const previous = prev.get(simulationId);
      if (previous === status) return prev;
      return new Map(prev).set(
        simulationId,
        previous ? getLatestSimExecStatus(status, previous) : status
      );
    });
  }, []);

  const selectableSimulationIds = useMemo(() => {
    return simulations
      .filter((simulation) => {
        const status = localStatusMap.get(simulation.id);
        return status === ActivityStatus.CREATED || status === ActivityStatus.ERROR;
      })
      .filter((simulation) => hasSimConfigAsset(simulation))
      .map((s) => s.id);
  }, [localStatusMap, simulations]);

  const allSimulationStatusesLoaded =
    simulations.length > 0 && simulations.every((simulation) => localStatusMap.has(simulation.id));

  useEffect(() => {
    if (previousCampaignIdRef.current === campaignId) return;

    previousCampaignIdRef.current = campaignId;

    // reset launch-selection state whenever campaign changes
    // so initial auto-selection can run for the newly loaded simulations
    setSelectedSimulationIds([]);
    setInitialSelectionDone(false);
  }, [campaignId]);

  useEffect(() => {
    // Auto select all valid simulations with status "created" on page load.
    // Previously failed simulations with a valid simulation config have to be explicitly
    // re-selected by the user.
    const simIds = simulations
      .filter((simulation) => localStatusMap.get(simulation.id) === ActivityStatus.CREATED)
      .filter((simulation) => hasSimConfigAsset(simulation))
      .map((s) => s.id);

    if (allSimulationStatusesLoaded && !initialSelectionDone) {
      setSelectedSimulationIds(simIds);
      setInitialSelectionDone(true);
    }
  }, [allSimulationStatusesLoaded, simulations, initialSelectionDone, localStatusMap]);

  useEffect(() => {
    // Select first simulation from the list
    if (simulations.length > 0) {
      onActiveSimulationChange(simulations[0]);
    }
  }, [onActiveSimulationChange, simulations]);

  const runViaLaunchSystem = async (simIds: string[]) => {
    if (launchRequiresOfflineTokenConsent) {
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

    const taskType = launchTaskType ?? ObiOneTaskTypeDict.CircuitSimulation;

    for (const simId of simIds) {
      try {
        const res = await runTask({
          ctx: { virtualLabId, projectId },
          task_type: taskType,
          config_id: simId,
        });
        log('info', res);
        setJobIdMap((prev) => new Map(prev).set(simId, res.job_id));
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
    setSelectedSimulationIds([]);
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
    if (shouldTreatSimulationAsTask) {
      return runViaLaunchSystem(simIds);
    }

    try {
      await runSimulationBatch({
        ctx: { virtualLabId, projectId },
        simulationIds: simIds,
        onInit: () => {
          // Earliest signal the batch was accepted — credits are reserved from here.
          invalidateProjectBalance({ queryClient, context });
          simIds.forEach((simId) => {
            setSimulationStatus(simId, ActivityStatus.PENDING);
          });
          setSelectedSimulationIds([]);
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

  // The obi-one task type used to estimate cost — the same one `run` launches, so the quoted price
  // matches what is reserved. Ion-channel campaigns still launch via the small-scale simulator, so
  // they have no launch type of their own but are estimable under their obi-one type.
  const simTaskType = useMemo(() => {
    if (launchTaskType) {
      return launchTaskType;
    }
    if (entityType === EntityTypeDict.IonChannelModel) {
      return ObiOneTaskTypeDict.IonChannelModelSimulationExecution;
    }
    return ObiOneTaskTypeDict.CircuitSimulation;
  }, [launchTaskType, entityType]);

  const costModalItems = useMemo(
    () =>
      simulations
        .filter((s) => selectedSimulationIds.includes(s.id))
        .map((s) => ({ id: s.id, name: s.name })),
    [simulations, selectedSimulationIds]
  );

  const { openModal, modal: costConfirmationModal } = useCostConfirmation({
    items: costModalItems,
    taskType: simTaskType,
    workflowLabel: 'simulations',
    context,
    onConfirm: run,
  });

  const onToggleSelectAll = (checked: boolean) => {
    setSelectedSimulationIds(checked ? selectableSimulationIds : []);
  };

  const launchSimBtnLabelPrefix = selectedSimulationIds.length
    ? `(${selectedSimulationIds.length})`
    : '';

  const loading = simulationsLoading;

  return (
    <>
      <SimulationsResultsUiAdapter
        campaignId={campaignId}
        loading={loading}
        simulations={simulations}
        activeSimulationId={activeSimulation?.id}
        selectedSimulationIds={selectedSimulationIds}
        selectableSimulationIds={selectableSimulationIds}
        simRequestInProgress={simRequestInProgress}
        context={context}
        statusMap={localStatusMap}
        launchSimBtnLabelPrefix={launchSimBtnLabelPrefix}
        onToggleSelectAll={onToggleSelectAll}
        onActiveSimulationChange={onActiveSimulationChange}
        onSelectedForSimChange={onSelectedForSimChange}
        onSimulationStatusLoad={onSimulationStatusLoad}
        onRun={openModal}
        middle={
          <div className="h-full bg-background! w-full">
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
                  onSelect={setSelectedFile}
                  onLoadingChange={setFilesLoading}
                  jobId={activeJobId}
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
            {selectedFile?.renderer !== ActivityCustomFileRenderer.TaskLogsViewer &&
              selectedFile?.renderer !== ActivityCustomFileRenderer.TaskConfigurationViewer && (
                <SimulationReportsProvider reports={simConfig?.reports ?? null}>
                  <FileViewer
                    file={selectedFile}
                    className="h-full w-full"
                    context={context}
                    loading={filesLoading}
                  />
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
    </>
  );
}
