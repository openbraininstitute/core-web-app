'use client';

import { useParams } from 'next/navigation';
import Ajv, { AnySchema } from 'ajv';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import uniq from 'lodash/uniq';
import { atom, useAtom, Atom } from 'jotai';

import {
  CheckCircleFilled,
  DeleteOutlined,
  LoadingOutlined,
  PlusCircleOutlined,
  WarningFilled,
} from '@ant-design/icons';

import $RefParser from '@apidevtools/json-schema-ref-parser';

import {
  JSONSchemaForm,
  Chevron,
  Tab,
  type Config,
  isPlainObject,
  ConfigValue,
} from './components';
import { Params, JSONSchema } from './types';
import { assertErrorMessage, classNames } from '@/util/utils';
import { useAppNotification } from '@/components/notification';
import authFetch from '@/authFetch';

type TabType = 'configuration' | 'simulations';

function isAtom<T>(val: unknown): val is Atom<T> {
  return typeof val === 'object' && val !== null && 'read' in val;
}

const ORDERING: Record<string, { order: number; category: string }> = {
  info: {
    order: 0,
    category: '',
  },
  initialize: {
    order: 1,
    category: '',
  },
  stimuli: {
    order: 2,
    category: '',
  },
  recordings: {
    order: 3,
    category: '',
  },
  neuron_sets: {
    order: 4,
    category: 'Auxiliary',
  },
  timestamps: {
    order: 5,
    category: 'Auxiliary',
  },
};

const CATEGORIES: string[] = uniq(Object.values(ORDERING).map((o) => o.category));

export default function TinyCircuitSimulation() {
  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('');
  const { circuit_id: circuitId } = useParams<Params>();
  const [editing, setEditing] = useState(false);
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.anyOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const [loading, setLoading] = useState(false);

  console.log(loading);

  const notification = useAppNotification();

  const [campaignId, setCampaignId] = useState('');

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) return;
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  const [atomsMap, setAtomsMap] = useState<{
    [key: string]:
      | ReturnType<typeof atom<Record<string, ConfigValue>>>
      | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
  }>({});

  const configAtom = useMemo(() => {
    return atom((get) => {
      const result: Config = {};
      Object.keys(atomsMap).forEach((key) => {
        if (isAtom(atomsMap[key])) result[key] = get(atomsMap[key]);
        else {
          result[key] = {};
          Object.entries(atomsMap[key]).forEach(([subkey, v]) => {
            if (typeof result[key] === 'string') return;
            result[key][subkey] = get(v);
          });
        }
      });

      result.type = schema?.properties?.type.const ?? '';

      return result;
    });
  }, [atomsMap, schema]);

  const [config] = useAtom(configAtom);

  const errors = useMemo(() => {
    if (validate) validate(config);
    return validate?.errors;
  }, [validate, config]);

  console.log(schema);

  useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch('https://staging.openbraininstitute.org/api/obi-one/openapi.json');
        const json = await res.json();

        const dereferenced = await $RefParser.dereference(json);
        // @ts-ignore
        const theSchema = dereferenced.components.schemas.SimulationsForm as JSONSchema;

        if (!theSchema.properties) return;

        setSchema(theSchema);

        const map: {
          [key: string]:
            | ReturnType<typeof atom<Record<string, ConfigValue>>>
            | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
        } = {};

        // Setting up initial values and constants.
        Object.entries(theSchema.properties).forEach(([k, v]) => {
          if (!v.additionalProperties) {
            const initial: Record<string, ConfigValue> = {};

            if (v.properties)
              Object.entries(v.properties).forEach(([subkey, subValue]) => {
                if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                else initial[subkey] = subValue.default ?? null;
              });

            if (k === 'initialize') {
              initial.circuit = {
                type: 'ReconstructionMorphologyFromID',
                id_str: circuitId,
              };
            }

            map[k] = atom<Record<string, ConfigValue>>(initial);
          } else map[k] = {};
        });

        setAtomsMap(map);
      } catch (e) {
        console.log(assertErrorMessage(e));
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, [circuitId, notification]);

  if (!schema) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  function renderSection([k, v]: [string, JSONSchema]) {
    if (!schema?.properties) return;
    return (
      <Fragment key={k}>
        <Tab
          tab={k}
          selectedTab={configTab}
          onClick={() => {
            setConfigTab(k);
            setSelectedItemIdx(null);
            if (!v.additionalProperties) setEditing(true);
            else {
              setEditing(false);
            }
          }}
          extraClass="w-full flex justify-between h-[50px] items-center drop-shadow"
        >
          {schema.properties?.[k]?.title}
          <div className="flex gap-1">
            {errors?.find((error) => error.instancePath.startsWith('/' + k)) ? (
              <WarningFilled className="text-yellow-400" />
            ) : (
              <CheckCircleFilled className="text-green-600" />
            )}
            <Chevron rotate={v.additionalProperties ? 90 : 0} />
          </div>
        </Tab>
        {v.additionalProperties && configTab === k && config[k] && (
          <>
            {Object.entries(config[k]).map(([subkey, subValue]) => {
              const idx = parseInt(subkey.split('_')[1], 10);

              const isSelected = configTab === k && idx === selectedItemIdx;

              return (
                <Fragment key={subkey}>
                  {/* eslint-disable-next-line */}
                  <div
                    className={classNames(
                      'text-primary-8 flex h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow hover:bg-gradient-to-r hover:from-[#003A8C] hover:to-[#001026] hover:text-white',
                      isSelected ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white' : ''
                    )}
                    onClick={() => {
                      if (isPlainObject(subValue)) {
                        setSelectedCategory(typeof subValue.type === 'string' ? subValue.type : '');
                        setSelectedItemIdx(parseInt(subkey.split('_')[1], 10));
                      }
                      setEditing(true);
                    }}
                  >
                    {subkey}
                    <div className="flex gap-2">
                      {errors?.find((error) => error.instancePath.startsWith(`/${k}/${subkey}`)) ? (
                        <WarningFilled className="text-yellow-400" />
                      ) : (
                        <CheckCircleFilled className="text-green-600" />
                      )}

                      {!campaignId && !loading && (
                        <DeleteOutlined
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();

                            setSelectedCategory('');
                            setEditing(false);

                            const selectedTabAtoms = atomsMap[configTab];
                            if (!isAtom(selectedTabAtoms)) {
                              const refereeKey = `${schema.properties?.[configTab].title}_${idx}`;
                              delete selectedTabAtoms[refereeKey];

                              // Initialize case

                              if (
                                isPlainObject(config.initialize) &&
                                isPlainObject(config.initialize.node_set) &&
                                typeof config.initialize.node_set.block_name === 'string' &&
                                config.initialize.node_set.block_name === refereeKey
                              ) {
                                atomsMap.initialize = atom<Record<string, ConfigValue>>({
                                  ...config.initialize,
                                  node_set: null,
                                });
                              }

                              // Check all keys in the config
                              Object.entries(config)
                                .filter(([configK]) => configK !== 'initialize')
                                .forEach(([configK, configV]) => {
                                  if (typeof configV !== 'object') return;

                                  // Check all keys in a section (e.g stimuli, recordings)
                                  Object.entries(configV).forEach(([entryKey, entryV]) => {
                                    if (!isPlainObject(entryV)) return;

                                    // Check all values in a particular object (a single stimuli, a single timestamp, etc)
                                    Object.entries(entryV).forEach(([fieldK, field]) => {
                                      if (
                                        !isPlainObject(entryV) ||
                                        !isPlainObject(field) ||
                                        typeof field.block_name !== 'string' ||
                                        isAtom(atomsMap[configK]) || // skip top level atoms (e.g initialize)
                                        field.block_name !== refereeKey
                                      )
                                        return;

                                      // Deleting the reference to current object

                                      delete entryV[fieldK]; //eslint-disable-line

                                      // The atom that has a reference to current object
                                      atomsMap[configK][entryKey] =
                                        atom<Record<string, ConfigValue>>(entryV);
                                    });
                                  });
                                });

                              setAtomsMap({
                                ...atomsMap,
                                [configTab]: {
                                  ...selectedTabAtoms,
                                },
                              });
                            }

                            setSelectedItemIdx(null);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
            {!campaignId && !loading && (
              <button
                className="text-primary-8 flex h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow"
                type="button"
                onClick={() => {
                  setEditing(true);
                  if (!isAtom(atomsMap[configTab])) {
                    const initial: Record<string, ConfigValue> = {};

                    if (v.properties)
                      Object.entries(v.properties).forEach(([subkey, subValue]) => {
                        if (subkey === 'type') initial[subkey] = subValue.const ?? null;
                        else initial[subkey] = subValue.default ?? null;
                      });

                    const itemIndexes = Object.keys(atomsMap[configTab]).map((subkey) =>
                      parseInt(subkey.split('_')[1], 10)
                    );

                    itemIndexes.sort((a, b) => a - b);

                    const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;

                    setSelectedItemIdx(itemIdx);
                    setSelectedCategory('');
                    setAtomsMap({
                      ...atomsMap,
                      [configTab]: {
                        ...atomsMap[configTab],
                        [`${schema.properties?.[configTab].title}_${itemIdx}`]:
                          atom<Record<string, ConfigValue>>(initial),
                      },
                    });
                  }
                }}
              >
                Add {v.title}
                <PlusCircleOutlined />
              </button>
            )}
          </>
        )}
      </Fragment>
    );
  }

  return (
    <div className="flex h-screen flex-col space-y-5 bg-gray-100 p-10">
      <div className="flex">
        <div className="inline-flex overflow-hidden rounded-full border border-gray-300">
          <Tab
            tab="configuration"
            rounded="rounded-l-full"
            selectedTab={tab}
            onClick={() => setTab('configuration')}
          >
            Configuration
          </Tab>
          <Tab
            tab="simulations"
            rounded="rounded-r-full"
            selectedTab={tab}
            onClick={() => setTab('simulations')}
            disabled={!campaignId || loading}
          >
            Simulations
          </Tab>
        </div>
      </div>
      {tab === 'configuration' && (
        <div className="grid flex-1 grid-cols-[1fr_2fr_3fr] gap-10 overflow-auto">
          <div className="flex flex-col items-center gap-5">
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

            <button
              type="button"
              className={classNames(
                'mt-5 flex h-[50px] w-[100%] items-center justify-center rounded-full px-5 py-2 text-lg drop-shadow',
                (errors && errors.length > 0) || loading
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
              )}
              onClick={async () => {
                if (loading) return;
                if (!campaignId) {
                  setLoading(true);

                  try {
                    const res = await authFetch(
                      `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/generated/simulations-generate-grid`,
                      {
                        method: 'POST',
                        body: JSON.stringify(config),
                        headers: { 'Content-Type': 'application/json' },
                      }
                    );

                    if (res.status !== 200) {
                      const errorRes = await res.json();
                      notification.error({
                        message: errorRes.message ?? 'An error ocurred',
                        description: errorRes?.details?.[0].msg ?? '',
                      });
                      return;
                    }

                    console.log(await res.json());
                  } catch (e) {
                    notification.error({ message: assertErrorMessage(e) });
                    return;
                  } finally {
                    setLoading(false);
                  }

                  setCampaignId('dummy campaign Id');
                  setTab('simulations');
                  return;
                }

                setCampaignId('');
              }}
              disabled={!!(errors && errors.length > 0) || loading}
            >
              <div className="flex justify-between gap-5">
                {!campaignId ? 'Generate simulations' : 'New simulation campaign'}
                {loading && <LoadingOutlined />}
              </div>
            </button>
          </div>
          <div>
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
                          className="min-h-[100px] w-[70%] cursor-pointer rounded-xl bg-white p-5 shadow"
                          onClick={() => {
                            setSelectedCategory(o.properties?.type.const ?? '');
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
              (!schema.properties?.[configTab]?.additionalProperties?.anyOf ||
                selectedCatSchema) && (
                <JSONSchemaForm
                  disabled={!!campaignId}
                  config={config}
                  circuitId={circuitId}
                  schema={
                    selectedCatSchema ??
                    schema.properties[configTab]?.additionalProperties ??
                    schema.properties[configTab]
                  }
                  stateAtom={
                    isAtom(atomsMap[configTab])
                      ? atomsMap[configTab]
                      : atomsMap[configTab][
                          `${schema.properties?.[configTab].title}_${selectedItemIdx}`
                        ]
                  }
                />
              )}
          </div>
          <div>
            <div className="bg-primary-1 h-full w-full opacity-30" />
          </div>
        </div>
      )}
    </div>
  );
}
