import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import type { CheckboxProps } from 'antd';
import { Checkbox, ConfigProvider, Modal } from 'antd';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { match } from 'ts-pattern';

import { requestOfflineTokenConsent } from '@/api/auth-manager';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import ApiError from '@/api/error';
import { runSimulation } from '@/api/launch-system';
import { useAppNotification } from '@/components/notification';
import {
  modelAtomFamily,
  simExecRemoteStatusMapAtomFamily,
  simExecStatusMapAtomFamily,
  simulationsByCampaignIdAtomFamily,
} from '@/features/small-microcircuit/_components/atoms';
import { FileViewer } from '@/features/small-microcircuit/_components/file-viewer';
import { File, SimulationFiles } from '@/features/small-microcircuit/_components/simulation-files';
import { SimulationStatusBadge } from '@/features/small-microcircuit/_components/simulation-status';
import errorRegistry from '@/features/small-microcircuit/error-registry';
import { useLastTruthyValue } from '@/hooks/hooks';
import { messages } from '@/i18n/en/simulation';
import { useConsent } from '@/services/consent';
import { runSimulationBatch } from '@/services/small-scale-simulator/circuit';
import { MessageType } from '@/services/small-scale-simulator/types';
import { ExecutionStatusColorMap } from '@/ui/segments/activity-execution/color-map';
import { classNames } from '@/util/utils';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import styles from '@/features/small-microcircuit/small-microcircuit.module.css';

const USER_CANCELLED = 'user_cancelled';

type SimulationTabProps = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

type Consent = {
  controller: AbortController;
  url: string;
};

export default function SimulationsTab({
  campaignId,
  virtualLabId,
  projectId,
}: SimulationTabProps) {
  const notification = useAppNotification();
  const { waitForConsent } = useConsent();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);
  const simulationsAtom = simulationsByCampaignIdAtomFamily({ campaignId, context });
  const simulations = useAtomValue(simulationsAtom);

  const modelAtom = modelAtomFamily({ id: simulations[0].entity_id, context });
  const model = useAtomValue(modelAtom);

  const simulationIds = simulations.map((s) => s.id);

  const simExecStatusMapAtom = simExecStatusMapAtomFamily({ context, simulationIds });
  const fetchRemoteSimExecStatuseMap = useSetAtom(
    simExecRemoteStatusMapAtomFamily({ simulationIds, context })
  );

  const statusMap = useLastTruthyValue(simExecStatusMapAtom);
  const setSimStatus = useSetAtom(simExecStatusMapAtom);

  const [simRequestInProgress, setSimRequestInProgress] = useState<boolean>(false);
  const [selectedSimulationIds, setSelectedSimulationIds] = useState<string[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<null | ICircuitSimulation>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);

  const activeSimulationExecStatus = activeSimulation && statusMap?.get(activeSimulation.id);

  const onActiveSimulationChange = useCallback((simulation: ICircuitSimulation) => {
    setActiveSimulation(simulation);
  }, []);

  const onSelectedForSimChange = useCallback((simulationId: string, selected: boolean) => {
    if (selected) {
      setSelectedSimulationIds((prev) => [...prev, simulationId]);
    } else {
      setSelectedSimulationIds((prev) => prev.filter((id) => id !== simulationId));
    }
  }, []);

  const selectableSimulationIds = useMemo(() => {
    return simulations
      .filter((simulation) =>
        [undefined, 'created', 'error'].includes(statusMap?.get(simulation.id))
      )
      .map((s) => s.id);
  }, [simulations, statusMap]);

  useEffect(() => {
    // Auto select all simulations with status "created" on page load.
    if (statusMap && simulations && !initialSelectionDone) {
      setSelectedSimulationIds(selectableSimulationIds);
      setInitialSelectionDone(true);
    }
  }, [simulations, statusMap, initialSelectionDone, selectableSimulationIds]);

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

    const hasActiveSimulations = statusMap
      ? Array.from(statusMap.values()).some((status) =>
          [EntitycoreExecutionStatus.PENDING, EntitycoreExecutionStatus.RUNNING].includes(status)
        )
      : false;

    if (!hasActiveSimulations) return;

    const intervalId = setInterval(fetchRemoteSimExecStatuseMap, 15_000);

    return () => clearInterval(intervalId);
  }, [fetchRemoteSimExecStatuseMap, simRequestInProgress, statusMap]);

  const onConsentModalClose = () => {
    if (consent) {
      consent.controller.abort(USER_CANCELLED);
    }
    setConsent(null);
  };

  // TODO: this is a POC, refactor once confirmed viable.
  const runViaLaunchSystem = async (simulationIds: string[]) => {
    const consent = await requestOfflineTokenConsent();
    const consentUrl = consent.data.consent_url;

    if (consentUrl) {
      const controller = new AbortController();
      setConsent({ controller, url: consentUrl });
      window.open(consent.data.consent_url, '_blank');

      try {
        await waitForConsent(controller.signal);
      } catch (error) {
        if (error === USER_CANCELLED) return;

        notification.error({
          message: 'Unexpected error occured, please try again later',
          duration: 10,
        });

        return;
      }
    }

    for (const simulationId of simulationIds) {
      let nSubmissions = 0;

      try {
        const res = await runSimulation({
          ctx: { virtualLabId, projectId },
          simulationId,
        });
        log('info', res);
        setSimStatus(simulationId, EntitycoreExecutionStatus.PENDING);
        nSubmissions += 1;
      } catch {}

      if (nSubmissions !== simulationIds.length) {
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
    }
    setConsent(null);
  };

  // TODO Refactor
  const run = async (simIds: string[]) => {
    if ('scale' in model && model.scale === CircuitScaleDictionary.Microcircuit) {
      return runViaLaunchSystem(simIds);
    }

    setSimRequestInProgress(true);
    try {
      await runSimulationBatch({
        ctx: { virtualLabId, projectId },
        simulationIds: simIds,
        onInit: () => {
          simIds.forEach((simId) => setSimStatus(simId, EntitycoreExecutionStatus.PENDING));
          setSelectedSimulationIds([]);
          setSimRequestInProgress(false);
        },
        onMessage: (message) => {
          match(message)
            .with({ message_type: MessageType.STATUS }, (msg) => {
              const simId = msg.ctx?.simulation_id;
              if (simId) {
                setSimStatus(simId, msg.status as unknown as EntitycoreExecutionStatus);
              }
              if (msg.status !== 'done') return;
              const simulation = simulations.find((s) => s.id === simId);
              if (!simulation) return;
              notification.success({ message: `Simulation ${simulation?.name} done` });
            })
            .otherwise(() => null);
        },
      });
    } catch (error) {
      const defaultMsg = messages.RunningSimulationDefaultError;

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

  const loading = !statusMap;
  // TODO: Add loading skeleton animation

  return (
    <div className={styles.threeColumns}>
      <div className="border-r border-gray-200 pr-4">
        <div className="flex h-full flex-col gap-4 overflow-y-hidden">
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
          {/* List of simulations */}
          <div className="flex grow flex-col justify-start gap-5 overflow-y-auto">
            {!loading &&
              simulations.map((simulation) => (
                <SimulationListItem
                  key={simulation.id}
                  selected={activeSimulation?.id === simulation.id}
                  simulation={simulation}
                  execStatus={statusMap?.get(simulation.id)}
                  onSelect={() => onActiveSimulationChange(simulation)}
                  onSelectedForSimChange={onSelectedForSimChange}
                  selectedForSim={selectedSimulationIds.includes(simulation.id)}
                  selectionForSimDisabled={simRequestInProgress}
                />
              ))}
          </div>
          <button
            className={classNames(
              'min-h-[50] w-full cursor-pointer rounded-3xl p-2 text-white',
              'bg-[linear-gradient(94.93deg,_#389E0D_18.84%,_#143805_116.7%)]',
              'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none'
            )}
            type="button"
            onClick={() => run(selectedSimulationIds)}
            disabled={simRequestInProgress || selectedSimulationIds.length === 0}
          >
            <div className="flex justify-center gap-4">
              <span className="pl-10">Launch simulations {launchSimBtnLabelPrefix}</span>
              <div className="w-6">{simRequestInProgress && <LoadingOutlined />}</div>
            </div>
          </button>
        </div>
      </div>

      {/* List of input/output files for selected simulation */}
      <div className="relative border-r border-gray-200 px-4">
        {!!activeSimulation && activeSimulationExecStatus && (
          <SimulationFiles
            simulation={activeSimulation}
            execStatus={activeSimulationExecStatus}
            selectedFile={selectedFile}
            context={context}
            onSelect={setSelectedFile}
            onLoadingChange={setFilesLoading}
          />
        )}
      </div>

      {/* Preview for selected file */}
      <div className="relative pl-4">
        <FileViewer
          file={selectedFile}
          className="h-full"
          context={context}
          loading={filesLoading}
        />
      </div>

      <Modal
        title="Waiting for the user consent"
        open={!!consent}
        onCancel={onConsentModalClose}
        okButtonProps={{ style: { display: 'none' } }}
      >
        <p className="text-lg">
          If the authorization window did not open automatically, please click the link below to
          continue.
        </p>

        <a
          className="text-primary-9 mt-4 inline-block text-lg font-semibold"
          href={consent?.url}
          target="_blank"
        >
          Grant consent
        </a>
      </Modal>
    </div>
  );
}

type SimulationBlockProps = {
  simulation: ICircuitSimulation;
  execStatus?: EntitycoreExecutionStatus;
  onSelect: (simulationId: string) => void;
  selected?: boolean;
  onSelectedForSimChange: (simulationId: string, selected: boolean) => void;
  selectedForSim: boolean;
  selectionForSimDisabled?: boolean;
};

function SimulationListItem({
  simulation,
  execStatus,
  onSelect,
  selected,
  onSelectedForSimChange,
  selectedForSim,
  selectionForSimDisabled,
}: SimulationBlockProps) {
  const color = ExecutionStatusColorMap[execStatus ?? EntitycoreExecutionStatus.CREATED];

  return (
    <div className="flex-none">
      <div
        className="rounded-lg px-4 pb-4 transition-colors duration-300"
        style={{
          border: `2px solid ${selected ? color : 'transparent'}`,
          backgroundColor: selected ? `${color}0f` : 'white', // 6% opacity for bg color
        }}
      >
        <button
          type="button"
          title={simulation.name}
          className="mb-2 flex h-18 w-full cursor-pointer items-center justify-between"
          onClick={() => onSelect(simulation.id)}
        >
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {!execStatus || execStatus === EntitycoreExecutionStatus.CREATED ? (
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
          <div className="ml-4 flex flex-shrink-0">
            <SimulationStatusBadge status={execStatus} />
            <RightOutlined className="ml-2 text-sm" />
          </div>
        </button>

        <ScanParams scanParams={simulation.scan_parameters} color={color} />
      </div>
    </div>
  );
}

type SimulationScanParams = { [key: string]: string | number };

function ScanParams({ scanParams, color }: { scanParams: SimulationScanParams; color: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(scanParams).map(([key, value]) => (
        <div key={key} className="overflow-x-hidden">
          <div title={key} className="truncate text-ellipsis text-gray-400">
            {key.split('.').at(-1)}
          </div>
          <div
            className="truncate font-bold text-ellipsis transition-colors duration-300"
            style={{ color }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
