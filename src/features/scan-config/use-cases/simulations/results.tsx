import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Checkbox, ConfigProvider } from 'antd';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { match } from 'ts-pattern';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ApiError } from '@/api/error';
import { runSimulation } from '@/api/one/circuit-simulation';
import { listVirtualLabMembers } from '@/api/virtual-lab-svc/queries/member';
import { Loader } from '@/components/loader';
import { useAppNotification } from '@/components/notification';
import {
  statusByIds as getSimulationStatusByIds,
  children as listSimulationChildren,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import { hasSimConfigAsset } from '@/entity-configuration/domain/simulation/utils';
import {
  OfflineTokenConsentModal,
  useEnsureOfflineTokenConsent,
} from '@/features/offline-auth-management';
import {
  simExecRemoteStatusMapAtomFamily,
  simExecStatusMapAtomFamily,
  simulationsByCampaignIdAtomFamily,
  useModelQuery,
} from '@/features/scan-config/components/atoms';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import { SimulationFiles } from '@/features/scan-config/components/simulation-files';
import {
  ConfigListCardSkeleton,
  InOutFilesColumnSkeleton,
  LaunchActionSkeleton,
  SelectAllSkeleton,
} from '@/features/scan-config/components/skeletons/columns';
import { getLatestSimExecStatus } from '@/features/scan-config/components/utils';
import errorRegistry from '@/features/scan-config/error-registry';
import { StatusBadge, StatusBadgeSkeleton } from '@/features/scan-config/status-badge';
import { useLoadMoreOnInView } from '@/features/scan-config/use-load-more-on-in-view';
import { SimulationReportsProvider } from '@/features/sonata-viewer/simulation-reports-context';
import { executionStatusColorMap } from '@/features/task/activity-execution/color-map';
import { useLastTruthyValue } from '@/hooks/hooks';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { messages } from '@/i18n/en/simulation';
import { runSimulationBatch } from '@/services/small-scale-simulator/circuit';
import { MessageType } from '@/services/small-scale-simulator/types';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { classNames } from '@/util/utils';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import type { CheckboxProps } from 'antd';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { TActivityCustomFile } from '@/features/scan-config/types';

import styles from '@/features/scan-config/scan-config.module.css';

const LOW_FUNDS_ERROR_CODE = 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR';
const SIMULATION_LIST_PAGE_SIZE = 30;

type SimulationTabProps = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

export default function SimulationsTab({
  campaignId,
  virtualLabId,
  projectId,
}: SimulationTabProps) {
  const notification = useAppNotification();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);
  const simulationsAtom = simulationsByCampaignIdAtomFamily({
    campaignId,
    context,
  });
  const allSimulations = useLastTruthyValue(simulationsAtom);

  const {
    data: simulationsPages,
    isLoading: simulationsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['scan-config-simulations', context, campaignId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listSimulationChildren({
        id: campaignId,
        context,
        filters: {
          page: pageParam,
          page_size: SIMULATION_LIST_PAGE_SIZE,
        },
      }),
    getNextPageParam: (lastPage) =>
      lastPage.data.length < SIMULATION_LIST_PAGE_SIZE ? undefined : lastPage.pagination.page + 1,
    enabled: Boolean(campaignId),
  });

  const simulations = useMemo(
    () => simulationsPages?.pages.flatMap((page) => page.data) ?? [],
    [simulationsPages]
  );
  const visibleSimulationIds = useMemo(
    () => simulations.map((simulation) => simulation.id),
    [simulations]
  );
  const loadMoreRef = useLoadMoreOnInView({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  const { entity: model } = useModelQuery({
    context,
    id: simulations[0]?.entity_id ?? allSimulations?.[0]?.entity_id,
  });

  const simExecStatusMapAtom = simExecStatusMapAtomFamily({
    context,
    campaignId,
  });
  const fetchRemoteSimExecStatuseMap = useSetAtom(
    simExecRemoteStatusMapAtomFamily({ campaignId, context })
  );

  const fullStatusMap = useLastTruthyValue(simExecStatusMapAtom);
  const setSimStatus = useSetAtom(simExecStatusMapAtom);
  const [localStatusMap, setLocalStatusMap] = useState<Map<string, ActivityStatus>>(new Map());

  const {
    data: remoteVisibleStatusMap,
    isLoading: visibleStatusLoading,
    refetch: refetchVisibleStatusMap,
  } = useQuery({
    queryKey: ['scan-config-visible-simulation-statuses', context, visibleSimulationIds],
    queryFn: () => getSimulationStatusByIds({ simulations, context }),
    enabled: simulations.length > 0,
    refetchInterval: (query) => {
      const statuses = Array.from(query.state.data?.values() ?? []);
      return statuses.some((status) =>
        [ActivityStatus.PENDING, ActivityStatus.RUNNING].includes(status)
      )
        ? 20_000
        : false;
    },
  });

  const visibleStatusMap = useMemo(() => {
    const merged = new Map(remoteVisibleStatusMap);
    localStatusMap.forEach((localStatus, simId) => {
      const remoteStatus = merged.get(simId);
      merged.set(
        simId,
        remoteStatus ? getLatestSimExecStatus(remoteStatus, localStatus) : localStatus
      );
    });
    return merged;
  }, [localStatusMap, remoteVisibleStatusMap]);

  const [simRequestInProgress, setSimRequestInProgress] = useState<boolean>(false);
  const [selectedSimulationIds, setSelectedSimulationIds] = useState<string[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<null | ISimulation>(null);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const {
    modal: offlineTokenConsentModal,
    ensure: ensureOfflineTokenConsent,
    cancel: cancelOfflineTokenConsent,
    openConsentLink,
    prime: primeOfflineTokenConsent,
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

  const { isVirtualLabAdmin } = useWorkspaceMembership({ virtualLabId });
  const { data: membersData } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
    enabled: !!virtualLabId && !isVirtualLabAdmin,
  });
  const adminEmail = membersData?.data?.users.find((user) => user.role === 'admin')?.email;

  const activeSimulationExecStatus =
    activeSimulation &&
    (visibleStatusMap.get(activeSimulation.id) ?? fullStatusMap?.get(activeSimulation.id));

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

  const setSimulationStatus = useCallback(
    (simulationId: string, status: ActivityStatus) => {
      setSimStatus(simulationId, status);
      setLocalStatusMap((prev) => new Map(prev).set(simulationId, status));
    },
    [setSimStatus]
  );

  const selectableSimulationIds = useMemo(() => {
    return (allSimulations ?? simulations)
      .filter((simulation) =>
        [undefined, 'created', 'error'].includes(fullStatusMap?.get(simulation.id))
      )
      .filter((simulation) => hasSimConfigAsset(simulation))
      .map((s) => s.id);
  }, [allSimulations, simulations, fullStatusMap]);

  useEffect(() => {
    // Auto select all valid simulations with status "created" on page load.
    // Previously failed simulations with a valid simulation config have to be explicitly
    // re-selected by the user.
    const source = allSimulations ?? simulations;
    const simIds = source
      .filter((simulation) => [undefined, 'created'].includes(fullStatusMap?.get(simulation.id)))
      .filter((simulation) => hasSimConfigAsset(simulation))
      .map((s) => s.id);

    if (fullStatusMap && source.length > 0 && !initialSelectionDone) {
      setSelectedSimulationIds(simIds);
      setInitialSelectionDone(true);
    }
  }, [allSimulations, simulations, fullStatusMap, initialSelectionDone]);

  useEffect(() => {
    // Select first simulation from the list
    if (simulations.length > 0) {
      onActiveSimulationChange(simulations[0]);
    }
  }, [onActiveSimulationChange, simulations]);

  useEffect(() => {
    // Poll simulation statuses if there are active (running/pending) simulations
    // and no active simulation request with the status streaming
    if (simRequestInProgress) return;

    // TODO Optimize the polling when there are multiple simulation requests

    const hasActiveSimulations = fullStatusMap
      ? Array.from(fullStatusMap.values()).some((status) =>
          [ActivityStatus.PENDING, ActivityStatus.RUNNING].includes(status)
        )
      : false;

    if (!hasActiveSimulations) return;

    const intervalId = setInterval(() => {
      fetchRemoteSimExecStatuseMap();
      refetchVisibleStatusMap();
    }, 20_000);

    return () => clearInterval(intervalId);
  }, [fetchRemoteSimExecStatuseMap, refetchVisibleStatusMap, simRequestInProgress, fullStatusMap]);

  const runViaLaunchSystem = async (simIds: string[]) => {
    const consentResult = await ensureOfflineTokenConsent();
    if (!consentResult.ok) {
      if (consentResult.reason !== 'cancelled') {
        notification.error({
          message: 'Unexpected error occurred, please try again later',
          duration: 10,
        });
      }
      return;
    }

    let nSubmissions = 0;
    let lowFundsError = false;

    for (const simId of simIds) {
      try {
        const res = await runSimulation({
          ctx: { virtualLabId, projectId },
          simulationId: simId,
        });
        log('info', res);
        setSimulationStatus(simId, ActivityStatus.PENDING);
        nSubmissions += 1;
      } catch (error) {
        log('error', 'Failed to submit a simulation');
        if (error instanceof ApiError && error.cause?.code === LOW_FUNDS_ERROR_CODE) {
          lowFundsError = true;
        }
      }
    }

    if (lowFundsError) {
      const notificationKey = 'simulation-low-funds';
      notification.error({
        message: messages.LowFundsError,
        description: (
          <div className="flex flex-col gap-2">
            {isVirtualLabAdmin ? (
              <button
                type="button"
                onClick={() => {
                  notification.destroy(notificationKey);
                  setShowCreditsModal(true);
                }}
                className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 hover:underline"
              >
                Add credits
              </button>
            ) : adminEmail ? (
              <a
                href={`mailto:${adminEmail}?subject=Insufficient%20credits%20for%20simulation`}
                className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 no-underline hover:underline"
              >
                Contact Lab admin
              </a>
            ) : (
              <span className="text-sm text-gray-600">
                Contact your virtual lab administrator to request credits.
              </span>
            )}
          </div>
        ),
        key: notificationKey,
        duration: 0,
        placement: 'topRight',
      });
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
    if (model && 'scale' in model && model.scale === CircuitScaleDictionary.Microcircuit) {
      return runViaLaunchSystem(simIds);
    }

    setSimRequestInProgress(true);
    try {
      await runSimulationBatch({
        ctx: { virtualLabId, projectId },
        simulationIds: simIds,
        onInit: () => {
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

      if (error instanceof ApiError && error.cause?.code === LOW_FUNDS_ERROR_CODE) {
        const notificationKey = 'simulation-low-funds';
        return notification.error({
          message: messages.LowFundsError,
          description: (
            <div className="flex flex-col gap-2">
              {isVirtualLabAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    notification.destroy(notificationKey);
                    setShowCreditsModal(true);
                  }}
                  className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 hover:underline"
                >
                  Add credits
                </button>
              ) : adminEmail ? (
                <a
                  href={`mailto:${adminEmail}?subject=Insufficient%20credits%20for%20simulation`}
                  className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 no-underline hover:underline"
                >
                  Contact Lab admin
                </a>
              ) : (
                <span className="text-sm text-gray-600">
                  Contact your virtual lab administrator to request credits.
                </span>
              )}
            </div>
          ),
          key: notificationKey,
          duration: 0,
          placement: 'topRight',
        });
      }

      if (error instanceof ApiError) {
        const message = getErrorMessage(error.cause?.code, errorRegistry, defaultMsg);
        return notification.error({ message, duration: 20 });
      }

      notification.error({ message: defaultMsg, duration: 20 });
    } finally {
      setSimRequestInProgress(false);
    }
  };

  const onSelectedAll: CheckboxProps['onChange'] = (e) => {
    setSelectedSimulationIds(e.target.checked ? selectableSimulationIds : []);
  };

  const allSelected = useMemo(
    () =>
      selectableSimulationIds.length > 0 &&
      selectableSimulationIds.length === selectedSimulationIds.length,
    [selectableSimulationIds, selectedSimulationIds]
  );

  const launchSimBtnLabelPrefix = selectedSimulationIds.length
    ? `(${selectedSimulationIds.length})`
    : '';

  const loading = simulationsLoading;

  return (
    <div className={styles.threeColumns} id="scan-config-results">
      <div className="border-r border-gray-200 pr-4" id="scan-config-results-left-column">
        <div className="flex h-full flex-col gap-4 overflow-y-hidden">
          {loading ? (
            <SelectAllSkeleton />
          ) : (
            <Checkbox
              indeterminate={
                selectedSimulationIds.length > 0 &&
                selectedSimulationIds.length < selectableSimulationIds.length
              }
              onChange={onSelectedAll}
              checked={allSelected}
              disabled={simRequestInProgress || selectableSimulationIds.length === 0}
            >
              Select all
            </Checkbox>
          )}
          {/* List of simulations */}
          <div className="flex grow flex-col justify-start gap-5 overflow-y-auto pr-2 secondary-scrollbar">
            {loading ? (
              <ConfigListCardSkeleton />
            ) : (
              <>
                {simulations.map((simulation) => (
                  <SimulationListItem
                    key={simulation.id}
                    selected={activeSimulation?.id === simulation.id}
                    simulation={simulation}
                    execStatus={
                      visibleStatusMap.get(simulation.id) ?? fullStatusMap?.get(simulation.id)
                    }
                    statusLoading={
                      visibleStatusLoading &&
                      !visibleStatusMap.has(simulation.id) &&
                      !fullStatusMap?.has(simulation.id)
                    }
                    onSelect={() => onActiveSimulationChange(simulation)}
                    onSelectedForSimChange={onSelectedForSimChange}
                    selectedForSim={selectedSimulationIds.includes(simulation.id)}
                    selectionForSimDisabled={simRequestInProgress}
                    canBeSelectedForSim={hasSimConfigAsset(simulation)}
                  />
                ))}
                <div ref={loadMoreRef} className="flex min-h-8 items-center justify-center">
                  {isFetchingNextPage && <Loader className="text-neutral-3" />}
                </div>
              </>
            )}
          </div>
          {loading ? (
            <LaunchActionSkeleton />
          ) : (
            <button
              className={classNames(
                'min-h-[50] w-full cursor-pointer rounded-3xl p-2 text-white',
                'bg-[linear-gradient(94.93deg,#389E0D_18.84%,#143805_116.7%)] rounded-full',
                'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none'
              )}
              type="button"
              onClick={() => run(selectedSimulationIds)}
              onMouseEnter={primeOfflineTokenConsent}
              onFocus={primeOfflineTokenConsent}
              disabled={simRequestInProgress || selectedSimulationIds.length === 0}
            >
              <div className="flex justify-center gap-4">
                <span className="pl-10">Launch simulations {launchSimBtnLabelPrefix}</span>
                <div className="w-6">{simRequestInProgress && <LoadingOutlined />}</div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* List of input/output files for selected simulation */}
      <div
        className="relative border-r border-gray-200 px-4 bg-background!"
        id="scan-config-results-middle-column"
      >
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
            />
          )
        )}
      </div>

      {/* Preview for selected file */}
      <div className="relative pl-4">
        <SimulationReportsProvider reports={simConfig?.reports ?? null}>
          <FileViewer
            file={selectedFile}
            className="h-full"
            context={context}
            loading={filesLoading}
          />
        </SimulationReportsProvider>
      </div>

      <OfflineTokenConsentModal
        open={offlineTokenConsentModal.open}
        consentUrl={offlineTokenConsentModal.consentUrl}
        onCancel={cancelOfflineTokenConsent}
        onOpenConsent={() => openConsentLink(offlineTokenConsentModal.consentUrl)}
      />

      <CreditsTransferModal open={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
    </div>
  );
}

type SimulationBlockProps = {
  simulation: ISimulation;
  execStatus?: ActivityStatus;
  statusLoading?: boolean;
  onSelect: (simulationId: string) => void;
  selected?: boolean;
  onSelectedForSimChange: (simulationId: string, selected: boolean) => void;
  selectedForSim: boolean;
  selectionForSimDisabled?: boolean;
  canBeSelectedForSim?: boolean;
};

function SimulationListItem({
  simulation,
  execStatus,
  statusLoading,
  onSelect,
  selected,
  onSelectedForSimChange,
  selectedForSim,
  selectionForSimDisabled,
  canBeSelectedForSim,
}: SimulationBlockProps) {
  const color = executionStatusColorMap[execStatus ?? ActivityStatus.CREATED];

  const statusDetails = hasSimConfigAsset(simulation)
    ? undefined
    : 'There was a problem generating this simulation';

  return (
    <button
      className="flex-none cursor-pointer shadow-xs group"
      type="button"
      title={simulation.name}
      onClick={() => onSelect(simulation.id)}
    >
      <div
        className="rounded-xl px-4 pb-4 transition-colors duration-300 group group-hover:bg-gray-50!"
        style={
          {
            '--card-color': color,
            border: `2px solid ${selected ? color : 'transparent'}`,
            backgroundColor: selected ? `${color}0f` : 'white', // 6% opacity for bg color
          } as React.CSSProperties & { '--card-color': string }
        }
      >
        <div className="mb-2 flex h-18 w-full items-center justify-between">
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {!execStatus ||
            ([ActivityStatus.CREATED, ActivityStatus.ERROR].includes(execStatus) &&
              canBeSelectedForSim) ? (
              <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
                <div className="flex min-w-0 items-center" style={{ maxWidth: '100%' }}>
                  <Checkbox
                    className="mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:truncate [&_.ant-checkbox+span]:overflow-hidden [&_.ant-checkbox+span]:text-ellipsis [&_.ant-checkbox+span]:whitespace-nowrap"
                    disabled={selectionForSimDisabled}
                    onChange={(e) => onSelectedForSimChange(simulation.id, e.target.checked)}
                    checked={selectedForSim}
                    style={{ color, maxWidth: '100%', display: 'flex' }}
                  >
                    <span className="text-lg transition-colors duration-300">
                      {simulation.name}
                    </span>
                  </Checkbox>
                </div>
              </ConfigProvider>
            ) : (
              <span
                style={{ color }}
                className="block truncate text-lg transition-colors duration-300"
              >
                {simulation.name}
              </span>
            )}
          </div>
          <div className="ml-4 flex shrink-0">
            {statusLoading ? (
              <StatusBadgeSkeleton />
            ) : (
              <StatusBadge status={execStatus} details={statusDetails} />
            )}
            <RightOutlined className="ml-2 text-sm" />
          </div>
        </div>

        <ScanParams scanParams={simulation.scan_parameters} color={color} />
      </div>
    </button>
  );
}
