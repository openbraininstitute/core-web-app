'use client';

import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import Ajv, { AnySchema } from 'ajv';
import { atom, useAtomValue } from 'jotai';
import isEqual from 'lodash/isEqual';
import NextImage from 'next/image';
import { Fragment, Suspense, useEffect, useMemo, useState } from 'react';

import { Config, ConfigValue, JSONSchemaForm } from './_components/components';
import { useConfigAtom } from './_components/hooks/config-atom';
import { isRootCategory, resolveKey, useObioneJsonSchema } from './_components/hooks/schema';
import { useSectionRenderer } from './_components/section';
import TabsSelector from './_components/tabs-selector';
import { CATEGORIES, isAtom, ORDERING } from './_components/utils';
import { AtomsMap, JSONSchema, TabType } from './types';

import CircuitName from './_components/circuit-name';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { getCircuitSimulationResult } from '@/api/entitycore/queries/simulation/circuit-simulation-result';
import { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import authFetch from '@/authFetch';
import { useAppNotification } from '@/components/notification';
import { basePath } from '@/config';
import { ButtonCopyId } from '@/features/details-view/button-copy-id';
import EphysViewer from '@/features/ephys-viewer';
import { runCircuitSimulation } from '@/services/small-scale-simulator/circuit';
import { readAtomFamilyWithExpiration } from '@/util/atoms';
import { assertErrorMessage, classNames } from '@/util/utils';

import styles from './small-microcircuit.module.css';

export default function SimulationCampaignConfiguration({
  circuitId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
}: {
  circuitId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
}) {
  if (!!initialCampaignId !== !!initialConfig)
    throw new Error('Both or none of initialCampaignId, initialConfigId should be passed');

  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');

  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.anyOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const handleAddReferenceClick = (referenceTab: string) => {
    setConfigTab(referenceTab);
    setEditing(true);
    setSelectedCategory('');
  };

  const readOnly = initialConfig !== undefined;

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) return;
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});
  const config = useConfigAtom(schema, atomsMap);

  // Validate initial configuration
  useEffect(() => {
    if (!validate || !initialConfig) return;

    validate(initialConfig);
    if (validate?.errors) throw new Error('Invalid Simulation Campaign Configuration');
  }, [validate, initialConfig]);

  const errors = useMemo(() => {
    if (validate) validate(config);
    return validate?.errors;
  }, [validate, config]);

  useObioneJsonSchema(circuitId, notification, setSchema, setAtomsMap, initialConfig);
  const renderSection = useSectionRenderer(
    schema,
    atomsMap,
    setAtomsMap,
    configTab,
    setConfigTab,
    isRootCategory,
    resolveKey,
    config,
    campaignId,
    loading,
    errors,
    selectedItemIdx,
    setSelectedItemIdx,
    setEditing,
    setSelectedCategory,
    readOnly
  );

  if (!schema) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col space-y-5 bg-gray-100 px-10 pt-6">
      <header className={styles.header}>
        <TabsSelector tab={tab} setTab={setTab} disableSimulationTab={!campaignId || loading} />
        <CircuitName circuitId={circuitId} />
      </header>
      <div className="w-full border-t border-gray-200" />

      {tab === 'configuration' && (
        <div className={styles.threeColumns}>
          <div>
            <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto border-r border-gray-200 pr-5 pb-5">
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
                        .map((entry) => {
                          return renderSection(entry);
                        })}
                  </Fragment>
                );
              })}
            </div>
            <button
              type="button"
              className={classNames(
                'flex min-h-[50px] w-[95%] items-center justify-center rounded-full text-lg drop-shadow',
                (errors && errors.length > 0) || loading || readOnly
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
          </div>
          <div className="h-full overflow-y-auto border-r border-gray-200 px-5">
            {schema.properties &&
              schema.properties?.[configTab]?.additionalProperties?.anyOf &&
              !selectedCategory &&
              editing && (
                <div className="flex flex-col items-center gap-5">
                  {schema.properties[configTab].additionalProperties.anyOf.map((o) => {
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
                  disabled={!!campaignId || loading || readOnly}
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
                />
              )}
          </div>
          <div>
            <NextImage
              width={1000}
              height={1130}
              alt="Circuit"
              // eslint-disable-next-line
              src={basePath + '/images' + '/circuit_test_image.png'}
              className="w-full rounded-xl border border-gray-200"
            />
          </div>
        </div>
      )}

      {tab === 'simulations' && (
        <SimulationsTab campaignId={campaignId} virtualLabId={virtualLabId} projectId={projectId} />
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

const simulationsAtomFamily = readAtomFamilyWithExpiration(
  ({
    campaignId,
    virtualLabId,
    projectId,
  }: {
    campaignId: string;
    virtualLabId: string;
    projectId: string;
  }) =>
    atom<Promise<ICircuitSimulation[]>>(async () => {
      if (!campaignId) return [];

      const filters = { simulation_campaign_id: campaignId };
      const context = { virtualLabId, projectId };
      const res = await getCircuitSimulations({ filters, context });

      return res.data;
    }),
  {
    ttl: 120_000, // 2 minutes
    areEqual: isEqual,
  }
);

function SimulationsTab({ campaignId, virtualLabId, projectId }: SimulationTabProps) {
  // TODO Extend the component to support multiple simulations

  const notification = useAppNotification();

  const [execStatus, setExecStatus] = useState<Status>('created');
  const [simRequestSent, setSimRequestSent] = useState<boolean>(false);

  const simulationsAtom = simulationsAtomFamily({
    campaignId,
    virtualLabId,
    projectId,
  });

  const simulations = useAtomValue(simulationsAtom);

  const run = () => {
    try {
      runCircuitSimulation({
        ctx: { virtualLabId, projectId },
        simulationId: simulations[0].id,
        onMessage: (msg) => setExecStatus(msg.status as Status),
      });
      setSimRequestSent(true);
    } catch (error) {
      notification.error({
        message: 'Error while requesting simulation run. Please try again later',
      });
    }
  };

  const launchSimBtnLabelPrefix = simulations.length ? `(${simulations.length})` : '';

  return (
    <div className="grid min-h-0 flex-grow grid-cols-[1fr_3fr] gap-5">
      <div className="flex h-full flex-col items-center gap-5 overflow-y-auto border-r border-gray-200 pr-5">
        {simulations.map((simulation) => (
          <SimulationListItem
            key={simulation.id}
            simulation={simulation}
            execStatus={execStatus}
            // selected
            onSelect={() => {}}
          />
        ))}
        <button
          className={classNames(
            'w-full cursor-pointer rounded-3xl p-2 text-white',
            'bg-[linear-gradient(94.93deg,_#389E0D_18.84%,_#143805_116.7%)]',
            'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none'
          )}
          type="button"
          onClick={run}
          disabled={simRequestSent}
        >
          Launch simulations {launchSimBtnLabelPrefix}
        </button>
      </div>
      {simulations.length > 0 && (
        <SimulationDetails
          simulation={simulations[0]}
          execStatus={execStatus}
          virtualLabId={virtualLabId}
          projectId={projectId}
        />
      )}
    </div>
  );
}

type SimulationBlockProps = {
  simulation: ICircuitSimulation;
  execStatus?: Status;
  // selected: boolean;
  onSelect: (simulationId: string) => void;
};

function SimulationListItem({ simulation, execStatus, onSelect }: SimulationBlockProps) {
  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg bg-white p-4"
      onClick={() => onSelect(simulation.id)}
    >
      <div className="flex items-center justify-between">
        <div>{simulation.name}</div>
        <div>
          <SimulationStatusBadge status={execStatus ?? 'created'} />
          <RightOutlined className="ml-2 text-sm" />
        </div>
      </div>
    </button>
  );
}

type Status = 'created' | 'pending' | 'running' | 'done' | 'error';

const statusColorMap: Record<Status, string> = {
  created: '#434343',
  pending: '#fa8c16',
  running: '#1890ff',
  done: '#389e0d',
  error: '#f5222d',
};

function SimulationStatusBadge({ status }: { status: Status }) {
  const color = statusColorMap[status];

  return (
    <span style={{ borderColor: color, color }} className="rounded-xl border-1 px-2">
      {status}
    </span>
  );
}

const simulationResultAtomFamily = readAtomFamilyWithExpiration(
  ({
    simulationId,
    virtualLabId,
    projectId,
  }: {
    simulationId: string;
    virtualLabId: string;
    projectId: string;
  }) =>
    atom<Promise<ICircuitSimulationResult>>(async () => {
      const simulationExecutionFilters = { used__id: simulationId };
      const context = { virtualLabId, projectId };
      const res = await getCircuitSimulationExecutions({
        filters: simulationExecutionFilters,
        context,
      });

      const execution = res.data[0];
      if (!execution?.generated?.[0]) {
        throw new Error('Simulation Result not found');
      }

      const simulationResult = getCircuitSimulationResult({
        id: execution.generated[0].id,
        context,
      });

      return simulationResult;
    }),
  {
    ttl: 120_000, // 2 minutes
    areEqual: isEqual,
  }
);

type SimulationDetailsProps = {
  simulation: ICircuitSimulation;
  execStatus: Status;
  virtualLabId: string;
  projectId: string;
};

function SimulationDetails({
  simulation,
  execStatus,
  virtualLabId,
  projectId,
}: SimulationDetailsProps) {
  const color = statusColorMap[execStatus];

  return (
    <div className="bg-white p-4">
      <small className="text-gray-400">Name</small>
      <div className="mb-8 flex items-center justify-between">
        <h1 style={{ color }} className="text-3xl font-bold">
          {simulation.name}
        </h1>
        <div>
          <ButtonCopyId label="Copy simulation ID" value={simulation.id} />
        </div>
      </div>
      {execStatus === 'done' && (
        <Suspense>
          <SimulationResultTraceViewer
            key={simulation.id}
            simulationId={simulation.id}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </Suspense>
      )}
    </div>
  );
}

type SimulationResultTraceViewerProps = {
  simulationId: string;
  virtualLabId: string;
  projectId: string;
};

function SimulationResultTraceViewer({
  simulationId,
  virtualLabId,
  projectId,
}: SimulationResultTraceViewerProps) {
  const simulationResultAtom = simulationResultAtomFamily({
    simulationId,
    virtualLabId,
    projectId,
  });

  const simulationResult = useAtomValue(simulationResultAtom);

  const ctx = useMemo(() => ({ projectId, virtualLabId }), [projectId, virtualLabId]);

  return <EphysViewer resource={simulationResult} ctx={ctx} />;
}
