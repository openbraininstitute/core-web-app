'use client';

import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import Ajv, { AnySchema } from 'ajv';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { Checkbox, ConfigProvider } from 'antd';
import { match } from 'ts-pattern';
import {
  simExecRemoteStatusMapAtomFamily,
  simExecStatusMapAtomFamily,
  simulationsByCampaignIdAtomFamily,
} from './_components/atoms';
import CircuitPreview from './_components/circuit-preview';
import { Config, ConfigValue, JSONSchemaForm } from './_components/components';
import { FileViewer } from './_components/file-viewer';
import { useCircuit } from './_components/hooks/circuit';
import { useConfigAtom } from './_components/hooks/config-atom';
import { isRootCategory, resolveKey, useObioneJsonSchema } from './_components/hooks/schema';
import { Section } from './_components/section';
import TabsSelector from './_components/tabs-selector';
import { CATEGORIES, isAtom, ORDERING } from './_components/utils';
import { AtomsMap, JSONSchema, TabType } from './types';
// James asked to only comment it out for now.
// import CircuitName from './_components/circuit-name';

import { File, SimulationFiles } from './_components/simulation-files';
import { SimulationStatusBadge } from './_components/simulation-status';
import errorRegistry from './error-registry';
import { cn } from '@/utils/css-class';

import { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import { CircuitSimulationExecutionStatus } from '@/api/entitycore/types/entities/circuit-simulation-execution';
import ApiError from '@/api/error';
import authFetch from '@/authFetch';
import { useAppNotification } from '@/components/notification';
import { ButtonCopyId } from '@/features/details-view/button-copy-id';
import { simulationStatusColorMap } from '@/features/small-microcircuit/constants';
import { useLastTruthyValue } from '@/hooks/hooks';
import { messages } from '@/i18n/en/simulation';
import { runSimulationBatch } from '@/services/small-scale-simulator/circuit';
import { MessageType } from '@/services/small-scale-simulator/types';
import { assertErrorMessage, classNames } from '@/util/utils';
import { getErrorMessage } from '@/utils/error';

import styles from './small-microcircuit.module.css';

export default function SimulationCampaignConfiguration({
  circuitId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  readOnly,
  className,
}: {
  circuitId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  readOnly?: boolean;
  className?: string;
}) {
  const circuit = useCircuit(circuitId);
  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');
  const initialConfigValidated = useRef(false);

  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.oneOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const handleAddReferenceClick = (referenceTab: string) => {
    setConfigTab(referenceTab);
    setEditing(true);
    setSelectedCategory('');
  };

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) return;
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});
  const config = useConfigAtom(schema, atomsMap);

  // Validate initial config
  if (validate && initialConfig && !initialConfigValidated.current) {
    initialConfigValidated.current = true;
    validate(initialConfig);
    if (validate.errors) throw new Error('Invalid Simulation Campaign Configuration');
  }

  const errors = useMemo(() => {
    if (validate) validate(config);
    return validate?.errors;
  }, [validate, config]);

  useObioneJsonSchema(circuitId, notification, setSchema, setAtomsMap, initialConfig);

  if (!schema) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col space-y-5', className)}>
      <header className={styles.header}>
        <TabsSelector tab={tab} setTab={setTab} disableSimulationTab={!campaignId || loading} />
        <div className="flex items-center justify-center gap-8">
          {!!campaignId && <ButtonCopyId label="Copy simulation campaign ID" value={campaignId} />}
        </div>
      </header>
      <div className="w-full border-t border-gray-200" />

      {tab === 'configuration' && (
        <div className={styles.threeColumns}>
          <div className={styles.scrollable}>
            <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
              {CATEGORIES.map((c) => {
                return (
                  <Fragment key={c}>
                    <div className="self-start text-gray-500 uppercase">{c}</div>
                    {schema.properties &&
                      Object.entries(schema.properties)
                        .filter(([k]) => k !== 'type' && ORDERING[k]?.category === c)
                        .sort((a, b) => {
                          const order = (k: string) => ORDERING[k]?.order ?? 999;
                          return order(a[0]) - order(b[0]);
                        })
                        .map(([k, v]) => {
                          return (
                            <Section
                              key={k}
                              k={k}
                              schema={schema}
                              sectionSchema={v}
                              atomsMap={atomsMap}
                              setAtomsMap={setAtomsMap}
                              configTab={configTab}
                              setConfigTab={setConfigTab}
                              config={config}
                              campaignId={campaignId}
                              loading={loading}
                              errors={errors}
                              selectedItemIdx={selectedItemIdx}
                              setSelectedItemIdx={setSelectedItemIdx}
                              setEditing={setEditing}
                              setSelectedCategory={setSelectedCategory}
                              readOnly={readOnly}
                            />
                          );
                        })}
                  </Fragment>
                );
              })}
            </div>

            {!readOnly && (
              <button
                type="button"
                className={classNames(
                  'flex min-h-[50px] w-[95%] items-center justify-center rounded-full text-lg drop-shadow',
                  (errors && errors.length > 0) || loading
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
                )}
                onClick={async () => {
                  if (loading) return;
                  if (campaignId) {
                    setCampaignId('');
                    return;
                  }

                  setLoading(true);
                  try {
                    const res = await authFetch(
                      `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/generated/simulations-generate-grid-save`,
                      {
                        method: 'POST',
                        body: JSON.stringify(config),
                        headers: {
                          Accept: 'application/json',
                          'Content-Type': 'application/json',
                          'virtual-lab-id': virtualLabId,
                          'project-id': projectId,
                        },
                      }
                    );

                    if (res.status !== 200) {
                      const errorRes = await res.json();

                      const details =
                        res.status === 500 ? errorRes.detail : (errorRes?.details?.[0].msg ?? '');

                      notification.error({
                        message: 'An error ocurred generating the simulation campaign',
                        description: details,
                      });
                      return;
                    }

                    const returnedCampaignId = (await res.json()) as string;
                    if (returnedCampaignId === '') {
                      notification.error({
                        message: 'An error ocurred generating the simulation campaign',
                      });
                      return;
                    }

                    setCampaignId(returnedCampaignId);
                    setTab('simulations');
                  } catch (e) {
                    notification.error({ message: assertErrorMessage(e) });
                    return;
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!!(errors && errors.length > 0) || loading || readOnly}
              >
                <div className="flex justify-between gap-5">
                  {!campaignId ? 'Generate simulations' : 'New simulation campaign'}
                  {loading && <LoadingOutlined />}
                </div>
              </button>
            )}
          </div>
          <div
            className={classNames(
              styles.scrollable,
              'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
            )}
          >
            {schema.properties &&
              schema.properties?.[configTab]?.additionalProperties?.oneOf &&
              !selectedCategory &&
              editing && (
                <div className="flex flex-col items-center gap-5">
                  {schema.properties[configTab].additionalProperties.oneOf.map((o) => {
                    return (
                      <Fragment key={o.title}>
                        {/* eslint-disable-next-line */}
                        <div
                          className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 hover:bg-white"
                          onClick={() => {
                            if (isRootCategory(schema, configTab)) return;

                            setSelectedCategory(o.properties?.type.const ?? '');
                            const initial: Record<string, ConfigValue> = {};
                            if (o.properties)
                              Object.entries(o.properties).forEach(([subkey, subValue]) => {
                                if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                                else initial[subkey] = subValue.default ?? null;
                              });
                            const itemIndexes = Object.keys(atomsMap[configTab]).map((subkey) =>
                              parseInt(subkey.split('_')[1], 10)
                            );
                            itemIndexes.sort((a, b) => a - b);
                            const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                            setSelectedItemIdx(itemIdx);
                            setAtomsMap({
                              ...atomsMap,
                              [configTab]: {
                                ...atomsMap[configTab],
                                [resolveKey(schema, configTab, itemIdx)]:
                                  atom<Record<string, ConfigValue>>(initial),
                              },
                            });
                          }}
                        >
                          <div className="text-primary-9 text-lg font-bold">{o.title}</div>
                          <div className="mt-3">{o.description}</div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              )}

            {schema.properties &&
              schema.properties?.[configTab] &&
              editing &&
              (isRootCategory(schema, configTab) || selectedCatSchema) && (
                <JSONSchemaForm
                  onAddReferenceClick={handleAddReferenceClick}
                  disabled={!!campaignId || loading}
                  config={config}
                  schema={
                    selectedCatSchema ??
                    schema.properties[configTab]?.additionalProperties ??
                    schema.properties[configTab]
                  }
                  stateAtom={
                    isAtom(atomsMap[configTab])
                      ? atomsMap[configTab]
                      : atomsMap[configTab][resolveKey(schema, configTab, selectedItemIdx)]
                  }
                  circuit={circuit}
                />
              )}
          </div>
          <CircuitPreview circuit={circuit} />
        </div>
      )}

      {tab === 'simulations' && (
        <Suspense>
          <SimulationsTab
            campaignId={campaignId}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </Suspense>
      )}
    </div>
  );
}

/* ----------------------------------- Simulation related code ---------------------------------- */

type SimulationTabProps = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

function SimulationsTab({ campaignId, virtualLabId, projectId }: SimulationTabProps) {
  const notification = useAppNotification();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);
  const simulationsAtom = simulationsByCampaignIdAtomFamily({ campaignId, context });
  const simulations = useAtomValue(simulationsAtom);

  const simulationIds = simulations.map((s) => s.id);

  const simExecStatusMapAtom = simExecStatusMapAtomFamily({ context, simulationIds });
  const fetchRemoteSimExecStatuseMap = useSetAtom(
    simExecRemoteStatusMapAtomFamily({ simulationIds, context })
  );

  const statusMap = useLastTruthyValue(simExecStatusMapAtom);
  const updateStatusMap = useSetAtom(simExecStatusMapAtom);

  const [simRequestInProgress, setSimRequestInProgress] = useState<boolean>(false);
  const [simExecSelectedSimulationIds, setSimExecSelectedSimulationIds] = useState<string[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<null | ICircuitSimulation>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);

  const activeSimulationExecStatus = selectedSimulation && statusMap?.get(selectedSimulation.id);

  useEffect(() => {
    // Auto select all simulations with status "created" on page load.
    if (statusMap) {
      setSimExecSelectedSimulationIds(
        simulations
          .filter((s) => ['created', undefined].includes(statusMap.get(s.id)))
          .map((s) => s.id)
      );
    }
  }, [simulations, statusMap]);

  useEffect(() => {
    // Select first simulation from the list
    setSelectedSimulation(simulations[0]);
  }, [simulations]);

  useEffect(() => {
    // Poll simulation statuses if there are active (running/pending) simulations
    // and no active simulation request with the status streaming
    if (simRequestInProgress) return;

    const hasActiveSimulations = statusMap
      ? Array.from(statusMap.values()).some((status) =>
          [
            CircuitSimulationExecutionStatus.PENDING,
            CircuitSimulationExecutionStatus.RUNNING,
          ].includes(status)
        )
      : false;

    if (!hasActiveSimulations) return;

    const intervalId = setInterval(fetchRemoteSimExecStatuseMap, 15_000);

    return () => clearInterval(intervalId);
  }, [fetchRemoteSimExecStatuseMap, simRequestInProgress, statusMap]);

  // TODO Refactor
  const run = async () => {
    setSimRequestInProgress(true);
    try {
      await runSimulationBatch({
        ctx: { virtualLabId, projectId },
        simulationIds: simExecSelectedSimulationIds,
        onInit: () => {
          setSimRequestInProgress(false);
          setSimExecSelectedSimulationIds([]);
        },
        onMessage: (message) => {
          match(message)
            .with({ message_type: MessageType.STATUS }, (msg) => {
              // TODO: fix types
              const simId = msg.ctx?.simulation_id;
              if (simId) {
                updateStatusMap(
                  statusMap!.set(simId, msg.status as unknown as CircuitSimulationExecutionStatus)
                );
              }

              if (msg.status !== 'done') return;

              notification.success({ message: `Simulation ${simulations[0].name} done` });
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

  const launchSimBtnLabelPrefix = simExecSelectedSimulationIds.length
    ? `(${simExecSelectedSimulationIds.length})`
    : '';

  return (
    <div className={styles.threeColumns}>
      <div className="flex border-r border-gray-200 pr-4">
        {/* List of simulations */}
        <div className="flex flex-col justify-start gap-5 overflow-y-auto">
          {simulations.map((simulation) => (
            <SimulationListItem
              key={simulation.id}
              selected={selectedSimulation?.id === simulation.id}
              simulation={simulation}
              execStatus={statusMap?.get(simulation.id)}
              onSelect={() => setSelectedSimulation(simulation)}
              onSelectedForSimChange={(simulationId, selected) => {
                if (selected) {
                  setSimExecSelectedSimulationIds((prev) => [...prev, simulationId]);
                } else {
                  setSimExecSelectedSimulationIds((prev) =>
                    prev.filter((id) => id !== simulationId)
                  );
                }
              }}
              selectedForSim={simExecSelectedSimulationIds.includes(simulation.id)}
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
          onClick={run}
          disabled={simRequestInProgress || simExecSelectedSimulationIds.length === 0}
        >
          <div className="flex justify-center gap-4">
            <span className="pl-10">Launch simulations {launchSimBtnLabelPrefix}</span>
            <div className="w-6">{simRequestInProgress && <LoadingOutlined />}</div>
          </div>
        </button>
      </div>

      {/* List of input/output files for selected simulation */}
      <div className="border-r border-gray-200 px-4">
        {!!selectedSimulation && (
          <Suspense fallback={<div className="text-neutral-5 mt-4 font-semibold">Loading...</div>}>
            <SimulationFiles
              simulation={selectedSimulation}
              execStatus={activeSimulationExecStatus}
              selectedFile={selectedFile}
              context={context}
              onSelect={setSelectedFile}
            />
          </Suspense>
        )}
      </div>

      {/* Preview for selected file */}
      <div className="relative pl-4">
        <FileViewer file={selectedFile} className="h-full" context={context} />
      </div>
    </div>
  );
}

type SimulationBlockProps = {
  simulation: ICircuitSimulation;
  execStatus?: CircuitSimulationExecutionStatus;
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
  const color = simulationStatusColorMap[execStatus ?? CircuitSimulationExecutionStatus.CREATED];

  return (
    <div className="flex-none bg-white">
      <div
        className="rounded-lg p-4 transition-colors duration-300"
        style={{
          border: selected ? `2px solid ${color}` : 'none',
          backgroundColor: selected ? `${color}0f` : 'white', // 6% opacity for bg color
        }}
      >
        <button
          type="button"
          title={simulation.name}
          className="mb-2 h-18 w-full cursor-pointer"
          onClick={() => onSelect(simulation.id)}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold">
              {!execStatus || execStatus === CircuitSimulationExecutionStatus.CREATED ? (
                <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
                  <Checkbox
                    className="mr-2 transition-colors duration-300"
                    disabled={selectionForSimDisabled}
                    onChange={(e) => onSelectedForSimChange(simulation.id, e.target.checked)}
                    checked={selectedForSim}
                    style={{ color }}
                  >
                    <span className="truncate overflow-hidden text-lg whitespace-nowrap transition-colors duration-300">
                      {simulation.name}
                    </span>
                  </Checkbox>
                </ConfigProvider>
              ) : (
                <span
                  style={{ color }}
                  className="truncate overflow-hidden text-lg whitespace-nowrap transition-colors duration-300"
                >
                  {simulation.name}
                </span>
              )}
            </div>
            <div className="ml-4 flex flex-shrink-0">
              <SimulationStatusBadge status={execStatus} />
              <RightOutlined className="ml-2 text-sm" />
            </div>
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
            {key}
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
