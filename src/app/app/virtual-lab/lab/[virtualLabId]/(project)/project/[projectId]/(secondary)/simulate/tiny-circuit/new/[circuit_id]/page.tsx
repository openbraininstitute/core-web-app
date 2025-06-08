'use client';

import { useParams } from 'next/navigation';
import Ajv, { AnySchema } from 'ajv';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { atom, useAtom, Atom } from 'jotai';

import { LoadingOutlined, PlusCircleOutlined, WarningFilled } from '@ant-design/icons';
import { notification } from 'antd/lib';
import $RefParser from '@apidevtools/json-schema-ref-parser';

import JSONSchemaForm from './components';
import { Params, JSONSchema } from './types';
import { assertErrorMessage, classNames } from '@/util/utils';

type TabType = 'configuration' | 'simulations';

type Primitive = null | boolean | number | string;
export type Object = Primitive | Primitive[];

function isAtom<T>(val: unknown): val is Atom<T> {
  return typeof val === 'object' && val !== null && 'read' in val;
}

export default function TinyCircuitSimulation() {
  const [tab, setTab] = useState<TabType>('configuration');
  const [configTab, setConfigTab] = useState<string>('');
  const { circuit_id } = useParams<Params>();
  const [editing, setEditing] = useState(false);
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.anyOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) return;
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  const [atomsMap, setAtomsMap] = useState<{
    [key: string]:
      | ReturnType<typeof atom<Record<string, Object>>>
      | Record<string, ReturnType<typeof atom<Record<string, Object>>>>;
  }>({});

  const configAtom = useMemo(() => {
    return atom((get) => {
      const result: Record<string, Record<string, Object | Record<string, Object>> | string> = {};
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

  useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch('https://staging.openbraininstitute.org/api/obi-one/openapi.json');
        const json = await res.json();
        const dereferenced = await $RefParser.dereference(json);
        // @ts-ignore
        const theSchema = dereferenced.components.schemas.SimulationsForm as JSONSchema;
        setSchema(theSchema);

        if (!theSchema.properties) return;
        const map: {
          [key: string]:
            | ReturnType<typeof atom<Record<string, Object>>>
            | Record<string, ReturnType<typeof atom<Record<string, Object>>>>;
        } = {};

        Object.entries(theSchema.properties).forEach(([k, v]) => {
          if (!v.additionalProperties) {
            map[k] = atom<Record<string, Object>>({ type: v.properties?.type.const ?? '' });
          } else map[k] = {};
        });

        setAtomsMap(map);
      } catch (e) {
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, []);

  if (!schema) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col space-y-5 bg-gray-100 p-10">
      <div className="flex">
        <div className="text-primary-8 flex h-[40px] min-w-[100px] items-center rounded-full bg-white pl-6 text-lg">
          name
        </div>
        <div className="ml-5 inline-flex overflow-hidden rounded-full border border-gray-300">
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
          >
            Simulations
          </Tab>
        </div>
      </div>
      <div className="mt-5 grid flex-1 grid-cols-[1fr_2fr_2fr] gap-10 overflow-auto">
        <div className="flex flex-col items-center gap-5">
          {schema.properties &&
            Object.entries(schema.properties)
              .filter(([k]) => k !== 'type')
              .map(([k, v]) => (
                <Fragment key={k}>
                  <Tab
                    tab={k}
                    selectedTab={configTab}
                    onClick={() => {
                      setConfigTab(k);
                      if (!v.additionalProperties) setEditing(true);
                      else {
                        setEditing(false);
                      }
                    }}
                    extraClass="w-full flex justify-between h-[50px] items-center drop-shadow"
                  >
                    {schema.properties?.[k]?.title}
                    <div className="flex gap-1">
                      {errors?.find((error) => error.instancePath.startsWith('/' + k)) && (
                        <WarningFilled className="text-yellow-400" />
                      )}
                      <Chevron />
                    </div>
                  </Tab>
                  {v.additionalProperties && configTab === k && config[k] && (
                    <>
                      {Object.entries(config[k]).map(([subkey, subValue]) => {
                        return (
                          <Fragment key={subkey}>
                            {/* eslint-disable-next-line */}
                            <div
                              className="text-primary-8 flex h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow"
                              onClick={() => {
                                if (
                                  typeof subValue === 'object' &&
                                  !Array.isArray(subValue) &&
                                  subValue !== null
                                ) {
                                  setSelectedCategory(
                                    typeof subValue.type === 'string' ? subValue.type : ''
                                  );
                                  setSelectedItemIdx(parseInt(subkey.split('_')[1], 10));
                                }
                                setEditing(true);
                              }}
                            >
                              {subkey}
                              {errors?.find((error) =>
                                error.instancePath.startsWith(`/${k}/${subkey}`)
                              ) && <WarningFilled className="text-yellow-400" />}
                            </div>
                          </Fragment>
                        );
                      })}
                      <button
                        className="text-primary-8 flex h-[50px] w-[90%] min-w-[150px] items-center justify-between rounded-full bg-gray-100 px-5 py-2 text-sm drop-shadow"
                        type="button"
                        onClick={() => {
                          setEditing(true);
                          if (!isAtom(atomsMap[configTab])) {
                            const itemIdx = Object.keys(atomsMap[configTab]).length;
                            setSelectedItemIdx(itemIdx);
                            setSelectedCategory('');
                            setAtomsMap({
                              ...atomsMap,
                              [configTab]: {
                                ...atomsMap[configTab],
                                [`${schema.properties?.[configTab].title}_${itemIdx}`]: atom<
                                  Record<string, Object>
                                >({}),
                              },
                            });
                          }
                        }}
                      >
                        Add {v.title}
                        <PlusCircleOutlined />
                      </button>
                    </>
                  )}
                </Fragment>
              ))}
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
            (!schema.properties?.[configTab]?.additionalProperties?.anyOf || selectedCatSchema) && (
              <JSONSchemaForm
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
    </div>
  );
}

function Tab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
}: {
  tab: string;
  selectedTab: string;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full';
  children?: React.ReactNode;
  extraClass?: string;
}) {
  return (
    <button
      style={
        tab === selectedTab
          ? { backgroundImage: 'linear-gradient(to right, #003A8C, #001026)' }
          : undefined
      }
      onClick={onClick}
      type="button"
      className={classNames(
        'min-w-[150px] px-5 py-2',
        extraClass,
        rounded,
        tab === selectedTab ? 'bg-primary-8 text-white' : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}

function Chevron({ rotate }: { rotate?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
