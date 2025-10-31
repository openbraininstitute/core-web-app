import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Input, InputNumber, Select } from 'antd';
import { atom, useAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { JSONSchema } from '../types';
import ParameterSwep from './parameter-sweep';
import Tooltip from './tooltip';
import { isPlainObject } from './utils';

import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { classNames } from '@/util/utils';
import ModelDetails from './model-details';
import PredefinedNodeset from './predefined-nodeset';
import Reference from './reference';

type Primitive = null | boolean | number | string;
interface Object {
  [key: string]: Primitive | Primitive[] | Object;
}

export type ConfigValue = Primitive | Primitive[] | Object;

export type Config = Record<string, Object | string>;

function skipParam(k: string, v: JSONSchema, referenceTypesToConfigKeys: Record<string, string>) {
  const skip = ['type'];
  if (skip.includes(k)) return true;

  // If a reference skip if not in the main config dictionary
  return !!v.is_block_reference && !referenceTypesToConfigKeys[v.properties?.type.const ?? ''];
}

function isNullableRef(schema: JSONSchema) {
  return (
    schema.anyOf?.find((s) => s.is_block_reference) && schema.anyOf.find((s) => s.type === 'null')
  );
}

function getRefDefaultLabel(schema: JSONSchema, labels: Record<string, string>) {
  if (!isNullableRef(schema)) return null;
  return labels[schema.properties?.type.const ?? ''] ?? 'Default';
}

export function JSONSchemaForm({
  disabled,
  schema,
  stateAtom,
  config,
  model,
  onAddReferenceClick,
  selectedCategory,
  virtualLabId,
  projectId,
  refLabels,
  referenceTypesToConfigKeys,
  referenceTypesToTitles,
}: {
  selectedCategory: string;
  disabled: boolean;
  config: Config;
  schema: JSONSchema;
  model: ICircuit | IMEModel | undefined | null;
  stateAtom: ReturnType<typeof atom<{ [key: string]: ConfigValue }>>;
  onAddReferenceClick: (reference: string) => void;
  virtualLabId: string;
  projectId: string;
  refLabels: Record<string, string>;
  referenceTypesToConfigKeys: Record<string, string>;
  referenceTypesToTitles: Record<string, string>;
}) {
  const [state, setState] = useAtom(stateAtom);

  const [addingElement, setAddingElement] = useState(false);
  const [newElement, setNewElement] = useState<number | string | null>(null);

  useEffect(() => {
    if (!schema.properties) return;

    const initial: Record<string, ConfigValue> = {};

    Object.entries(schema.properties).forEach(([key, value]) => {
      if (key === 'type') initial[key] = value.const ?? null;
      else initial[key] = value.default ?? null;
    });

    setState((prev) => {
      return { ...initial, ...prev };
    });
  }, [stateAtom, setState, schema.properties]);

  function renderInput(k: string, v: JSONSchema) {
    if (
      selectedCategory === 'PredefinedNeuronSet' &&
      k === 'node_set' &&
      model &&
      model.type === EntityTypeDict.Circuit
    ) {
      return (
        <PredefinedNodeset
          circuitId={model.id}
          virtualLabId={virtualLabId}
          projectId={projectId}
          stateAtom={stateAtom}
        />
      );
    }

    if (k === 'circuit' && model) return <ModelDetails model={model} />;

    if (v.is_block_reference) {
      const refType = v.properties?.type.const ?? '';
      const referenceKey = referenceTypesToConfigKeys[refType];

      const defaultV: string | null =
        isPlainObject(state[k]) && typeof state[k].block_name === 'string'
          ? state[k].block_name
          : null;

      const referenceConfig = config[referenceKey];
      if (!isPlainObject(referenceConfig)) return null;

      const referees = Object.entries(referenceConfig).filter(([_, val]) => {
        return isPlainObject(val);
      });

      return (
        <Reference
          referees={referees}
          refTitle={referenceTypesToTitles[refType]}
          onAddReferenceClick={() => onAddReferenceClick(referenceKey)}
          value={defaultV}
          disabled={disabled}
          defaultLabel={getRefDefaultLabel(v, refLabels)}
          onChange={(newV: string | null) => {
            if (!v.properties?.type.const || typeof v.properties.type.const !== 'string')
              throw new Error('Invalid reference definition');

            if (newV === null) {
              setState({ ...state, [k]: null });
              return;
            }

            setState({
              ...state,
              [k]: {
                block_name: newV,
                type: v.properties.type.const,
                block_dict_name: referenceKey,
              },
            });
          }}
        />
      );
    }

    if (k === 'neuron_ids') {
      return (
        <div className="text-primary-8 mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            {isPlainObject(state[k]) &&
              isPlainObject(state[k]) &&
              Array.isArray(state[k].elements) &&
              state[k].elements.map((e, i) => (
                // eslint-disable-next-line
                <div key={i} className="flex gap-1">
                  {e}{' '}
                  {!disabled && (
                    <CloseCircleOutlined
                      onClick={() => {
                        if (!isPlainObject(state[k]) || !Array.isArray(state[k].elements)) return;

                        if (state[k].elements.length === 1) {
                          setState({ ...state, [k]: null });
                          return;
                        }

                        state[k].elements.splice(i, 1); // delete in place

                        setState({
                          ...state,
                          [k]: {
                            type: 'NamedTuple',
                            name: 'example_id_neuron_set',
                            elements: [...state[k].elements],
                          },
                        });
                      }}
                    />
                  )}
                </div>
              ))}
          </div>

          {!addingElement && !disabled && (
            <PlusCircleOutlined onClick={() => setAddingElement(true)} className="text-primary-8" />
          )}

          {addingElement && !disabled && (
            <div className="flex gap-2">
              <InputNumber
                disabled={disabled}
                step={1}
                min={0}
                onChange={(newV) => {
                  setNewElement(newV);
                }}
              />
              {newElement !== null && (
                <CheckCircleOutlined
                  className="text-primary-8"
                  onClick={() => {
                    if (!state[k]) {
                      setState({
                        ...state,
                        [k]: {
                          type: 'NamedTuple',
                          name: 'example_id_neuron_set',
                          elements: [newElement],
                        },
                      });
                    } else if (isPlainObject(state[k]) && Array.isArray(state[k].elements)) {
                      setState({
                        ...state,
                        [k]: {
                          type: 'NamedTuple',
                          name: 'example_id_neuron_set',
                          elements: [...state[k].elements, newElement],
                        },
                      });
                    }
                  }}
                />
              )}
              <CloseCircleOutlined
                onClick={() => {
                  setAddingElement(false);
                  setNewElement(null);
                }}
                className="text-primary-8"
              />
            </div>
          )}
        </div>
      );
    }

    if (v.enum)
      return (
        <Select
          disabled={disabled}
          onChange={(newV) => setState({ ...state, [k]: newV })}
          value={state[k]}
          className="w-full"
          options={v.enum.map((subv: string) => {
            return { label: subv, value: subv };
          })}
        />
      );

    if (v.type === 'number' || v.type === 'integer') {
      return (
        <ParameterSwep
          k={k}
          min={v.minimum ?? null}
          max={v.maximum ?? null}
          disabled={disabled}
          value={state[k] as number | null | number[]}
          onChange={(value) => {
            setState({ ...state, [k]: value });
          }}
        />
      );
    }
    if (v.type === 'string')
      return (
        <Input
          disabled={disabled}
          value={typeof state[k] === 'string' ? state[k] : ''}
          className="w-full"
          onChange={(e) => {
            setState({ ...state, [k]: e.currentTarget.value });
          }}
        />
      );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-lg text-gray-500 uppercase">{schema.title}</div>
      <div className="mb-6 text-gray-500">{schema.description}</div>

      <div className="flex flex-col gap-5">
        {schema.properties &&
          Object.entries(schema.properties)
            .map(([k, v]) => {
              return [
                k,
                {
                  ...v,
                  ...v.anyOf?.find((subv) => subv.type !== 'array'),
                  ...v.anyOf?.find((subv) => subv.is_block_reference),
                },
              ] as const;
            })
            .filter(([k, v]) => {
              return !skipParam(k, v, referenceTypesToConfigKeys);
            })
            .map(([k, v]) => {
              return (
                <div key={k}>
                  <div className="flex items-end gap-3">
                    <div
                      className="text-primary-9 text-base font-semibold uppercase"
                      title={v.description}
                    >
                      {v.title}
                    </div>
                    {v.units && <div className="text-lg text-gray-500">{v.units}</div>}
                  </div>
                  <Tooltip value={v.description}>{renderInput(k, v)}</Tooltip>

                  {schema.required?.includes(k) &&
                    (state[k] === null || state[k] === undefined) && (
                      <span className="text-red-500">Required</span>
                    )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

export function Tab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
  disabled,
}: {
  tab: string;
  selectedTab: string;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full';
  children?: React.ReactNode;
  extraClass?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      type="button"
      style={disabled ? { background: '#d1d5db', cursor: 'default', color: '#9ca3af' } : undefined}
      className={classNames(
        'min-w-[150px] px-5 py-2',
        extraClass,
        rounded,
        tab === selectedTab
          ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
          : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}

export function Chevron({ rotate }: { rotate?: number }) {
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
