'use client';

import { LoadingOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import Ajv, { AnySchema } from 'ajv';
import type { CheckboxProps } from 'antd';
import { Checkbox, ConfigProvider } from 'antd';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { match } from 'ts-pattern';

// James asked to only comment it out for now.
// import CircuitName from './_components/circuit-name';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import ApiError from '@/api/error';
import authFetch from '@/authFetch';
import { useAppNotification } from '@/components/notification';
import {
  modelAtomFamily,
  simExecRemoteStatusMapAtomFamily,
  simExecStatusMapAtomFamily,
  simulationsByCampaignIdAtomFamily,
} from '@/features/small-microcircuit/_components/atoms';
import {
  Config,
  ConfigValue,
  JSONSchemaForm,
} from '@/features/small-microcircuit/_components/components';
import { FileViewer } from '@/features/small-microcircuit/_components/file-viewer';
import { useConfigAtom } from '@/features/small-microcircuit/_components/hooks/config-atom';
import {
  isRootCategory,
  resolveKey,
  useObioneJsonSchema,
} from '@/features/small-microcircuit/_components/hooks/schema';
import ModelPreview from '@/features/small-microcircuit/_components/model-preview';
import { Section } from '@/features/small-microcircuit/_components/section';
import { File, SimulationFiles } from '@/features/small-microcircuit/_components/simulation-files';
import { SimulationStatusBadge } from '@/features/small-microcircuit/_components/simulation-status';
import TabsSelector from '@/features/small-microcircuit/_components/tabs-selector';
import { CATEGORIES, isAtom, ORDERING } from '@/features/small-microcircuit/_components/utils';
import errorRegistry from '@/features/small-microcircuit/error-registry';
import { AtomsMap, TabType } from '@/features/small-microcircuit/types';
import { useLastTruthyValue } from '@/hooks/hooks';
import { messages } from '@/i18n/en/simulation';
import { runSimulationBatch } from '@/services/small-scale-simulator/circuit';
import { MessageType } from '@/services/small-scale-simulator/types';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { assertErrorMessage, classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { getErrorMessage } from '@/utils/error';
import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import { ExecutionStatusColorMap } from '@/ui/segments/activity-execution/color-map';

import styles from '@/features/small-microcircuit/small-microcircuit.module.css';

export default function SimulationCampaignConfiguration({
  modelId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  readOnly,
  className,
}: {
  modelId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  readOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const modelAtom = modelAtomFamily({ id: modelId, context: { virtualLabId, projectId } });
  const model = useAtomValue(modelAtom);

  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');
  const initialConfigValidated = useRef(false);
  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});

  const { schema, refLabels, referenceTypesToConfigKeys, referenceTypesToTitles } =
    useObioneJsonSchema(model, notification, setAtomsMap, initialConfig);

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

  const isNonEmptyCategory = useCallback(
    (category: string) =>
      schema?.properties &&
      Object.entries(schema.properties).filter(
        ([k]) => k !== 'type' && ORDERING[k]?.category === category
      ).length > 0,
    [schema]
  );

  if (!schema || !refLabels || !referenceTypesToConfigKeys || !referenceTypesToTitles) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  const apiPath = match(model)
    .with({ type: EntityTypeDict.Memodel }, () => 'me-model-simulation-scan-config-generate-grid')
    .with(
      { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
      () => 'me-model-with-synapses-circuit-simulation-scan-config-generate-grid'
    )
    .with({ type: EntityTypeDict.Circuit }, () => 'circuit-simulation-scan-config-generate-grid')
    .otherwise(() => {
      throw new Error(`Unsupported model type ${model.type}`);
    });
  const apiUrl = `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/generated/${apiPath}`;

  return (
    <div className={cn('flex h-full flex-col space-y-5', className)}>
      <header className={styles.header}>
        <TabsSelector tab={tab} setTab={setTab} disableSimulationTab={!campaignId || loading} />
        <div className="flex items-center justify-center gap-8">
          {!!campaignId && <ButtonCopyId label="Copy simulation campaign ID" value={campaignId} />}
        </div>
      </header>
      <div className="relative mb-10">
        <div className="w-full border-t border-gray-200" />
        <div className="text-primary-8 absolute -top-5 left-1/2 rounded-full bg-gray-50 p-2 px-3 shadow-sm">
          <UpOutlined onClick={() => router.back()} />
        </div>
      </div>

      {tab === 'configuration' && (
        <div className={styles.threeColumns}>
          <div className={styles.scrollable}>
            <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
              {CATEGORIES.map((c) => {
                return (
                  isNonEmptyCategory(c) && (
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
                  )
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
                    const configCopy = { ...config };
                    configCopy.type = 'CircuitSimulationScanConfig';

                    const coordinateCountRes = await authFetch(
                      `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/declared/scan_config/grid-scan-coordinate-count`,
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

                    if (coordinateCountRes.status !== 200) {
                      const message = await coordinateCountRes.json();
                      notification.error({
                        message: 'An error ocurred generating the simulation campaign',
                        description: message.detail,
                      });
                      return;
                    }

                    const res = await authFetch(apiUrl, {
                      method: 'POST',
                      body: JSON.stringify(config),
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'virtual-lab-id': virtualLabId,
                        'project-id': projectId,
                      },
                    });

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
                  referenceTypesToConfigKeys={referenceTypesToConfigKeys}
                  referenceTypesToTitles={referenceTypesToTitles}
                  refLabels={refLabels}
                  key={
                    isRootCategory(schema, configTab)
                      ? configTab
                      : resolveKey(schema, configTab, selectedItemIdx)
                  }
                  selectedCategory={selectedCategory}
                  onAddReferenceClick={handleAddReferenceClick}
                  disabled={!!campaignId || loading}
                  config={config}
                  schema={selectedCatSchema ?? schema.properties[configTab]}
                  stateAtom={
                    isAtom(atomsMap[configTab])
                      ? atomsMap[configTab]
                      : atomsMap[configTab][resolveKey(schema, configTab, selectedItemIdx)]
                  }
                  model={model}
                  virtualLabId={virtualLabId}
                  projectId={projectId}
                />
              )}
          </div>
          <div className="overflow-hidden rounded-lg">
            <ModelPreview model={model} />
          </div>
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
  const setSimStatus = useSetAtom(simExecStatusMapAtom);

  const [simRequestInProgress, setSimRequestInProgress] = useState<boolean>(false);
  const [selectedSimulationIds, setSelectedSimulationIds] = useState<string[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<null | ICircuitSimulation>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

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
      .filter((simulation) => ['created', undefined].includes(statusMap?.get(simulation.id)))
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

  // TODO Refactor
  const run = async (simIds: string[]) => {
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
          <div className="flex flex-grow flex-col justify-start gap-5 overflow-y-auto">
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
          className="mb-2 h-18 w-full cursor-pointer"
          onClick={() => onSelect(simulation.id)}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold">
              {!execStatus || execStatus === EntitycoreExecutionStatus.CREATED ? (
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
