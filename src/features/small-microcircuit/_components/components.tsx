import { useEffect, useState } from 'react';
import { atom, useAtom } from 'jotai';
import { InputNumber, Input, Select, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';

import { JSONSchema } from '../types';
import { isPlainObject } from './utils';
import CircuitDetails from './circuit-details';
import Tooltip from './tooltip';
import ParameterSwep from './parameter-sweep';

import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { classNames } from '@/util/utils';

type Primitive = null | boolean | number | string;
interface Object {
  [key: string]: Primitive | Primitive[] | Object;
}

export type ConfigValue = Primitive | Primitive[] | Object;

export type Config = Record<string, Object | string>;

export function JSONSchemaForm({
  disabled,
  schema,
  stateAtom,
  config,
  circuit,
  onAddReferenceClick,
}: {
  disabled: boolean;
  config: Config;
  schema: JSONSchema;
  circuit: ICircuit | undefined | null;
  stateAtom: ReturnType<typeof atom<{ [key: string]: ConfigValue }>>;
  onAddReferenceClick: (reference: string) => void;
}) {
  const skip = ['type']; // , 'circuit'];

  const [state, setState] = useAtom(stateAtom);
  const [addingElement, setAddingElement] = useState(false);
  const [newElement, setNewElement] = useState<number | string | null>(null);

  const referenceTypesToConfigKeys: Record<string, string> = {
    NeuronSetReference: 'neuron_sets',
    TimestampsReference: 'timestamps',
  };

  const referenceTypesToTitles: Record<string, string> = {
    NeuronSetReference: 'Neuron Set',
    TimestampsReference: 'Timestamps',
  };

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
    const obj = { ...v, ...v.anyOf?.find((subv) => subv.type !== 'array') };

    if (k === 'circuit' && circuit) return <CircuitDetails circuit={circuit} />;

    if (v.is_block_reference && v.properties && typeof v.properties.type.const === 'string') {
      const referenceKey = referenceTypesToConfigKeys[v.properties.type.const];
      const referenceTitle = referenceTypesToTitles[v.properties.type.const];
      if (!referenceKey) return null;
      const referenceConfig = config[referenceKey];
      if (!isPlainObject(referenceConfig)) return null;

      const referees = Object.entries(referenceConfig).filter(([_, val]) => {
        return isPlainObject(val);
      });

      if (referees.length === 0) {
        return (
          <Button className="w-full" onClick={() => onAddReferenceClick(referenceKey)}>
            Add {referenceTitle}
          </Button>
        );
      }

      const defaultV =
        isPlainObject(state[k]) && typeof state[k].block_name === 'string'
          ? state[k].block_name
          : null;

      return (
        <Select
          className="w-full"
          disabled={disabled}
          onChange={(newV: string) => {
            if (!v.properties?.type.const || typeof v.properties.type.const !== 'string')
              throw new Error('Invalid reference definition');

            setState({
              ...state,
              [k]: {
                block_name: newV,
                type: v.properties.type.const,
                block_dict_name: referenceKey,
              },
            });
          }}
          value={defaultV}
          options={referees.map(([subkey]) => {
            return {
              label: subkey,
              value: subkey,
            };
          })}
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

    if (obj.enum)
      return (
        <Select
          disabled={disabled}
          onChange={(newV) => setState({ ...state, [k]: newV })}
          value={state[k]}
          className="w-full"
          options={obj.enum.map((subv: string) => {
            return { label: subv, value: subv };
          })}
        />
      );

    if (obj.type === 'number' || obj.type === 'integer') {
      return (
        <ParameterSwep
          k={k}
          min={obj.minimum ?? null}
          max={obj.maximum ?? null}
          disabled={disabled}
          value={state[k] as number | null | number[]}
          onChange={(value) => {
            setState({ ...state, [k]: value });
          }}
        />
      );
    }
    if (obj.type === 'string')
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
            .filter(([k]) => {
              return !skip.includes(k);
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

                  {((schema.required?.includes(k) && !state[k]) ||
                    state[k] === null ||
                    state[k] === undefined) && <span className="text-red-500">Required</span>}
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
