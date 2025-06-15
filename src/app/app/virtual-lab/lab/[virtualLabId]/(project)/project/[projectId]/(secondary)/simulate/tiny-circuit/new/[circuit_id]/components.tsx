import { useEffect } from 'react';
import { atom, useAtom } from 'jotai';
import { InputNumber, Input, Select } from 'antd';
import { JSONSchema } from './types';

import { classNames } from '@/util/utils';

function isPlainObject<T extends object>(value: unknown): value is T {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

type Primitive = null | boolean | number | string;
export type Object = Primitive | Primitive[] | Record<string, Primitive>;

export type Config = Record<string, Record<string, Object | Record<string, Object>> | string>;

export function JSONSchemaForm({
  schema,
  stateAtom,
  circuitId,
  config,
}: {
  config: Config;
  schema: JSONSchema;
  stateAtom: ReturnType<typeof atom<{ [key: string]: Object }>>;
  circuitId: string;
}) {
  const skip = ['type'];

  const [state, setState] = useAtom(stateAtom);

  const referenceTypesToConfigKeys: Record<string, string> = {
    NeuronSetReference: 'neuron_sets',
    TimestampsReference: 'timestamps',
  };

  useEffect(() => {
    setState((prev) => {
      return { ...prev, type: schema.properties?.type.const ?? '' };
    });
  }, [stateAtom, setState, schema.properties?.type.const]);

  function renderInput(k: string, v: JSONSchema) {
    const obj = { ...v, ...v.anyOf?.find((subv) => subv.type !== 'array') };

    if (k === 'circuit') return <Input value={circuitId} disabled />;

    if (v.is_block_reference && v.properties && typeof v.properties.type.const === 'string') {
      const referenceKey = referenceTypesToConfigKeys[v.properties.type.const];
      if (!referenceKey) return null;
      const referenceConfig = config[referenceKey];
      if (!isPlainObject(referenceConfig)) return null;

      const referees = Object.entries(referenceConfig).filter(([_, val]) => {
        return isPlainObject(val);
      });

      if (referees.length === 0) {
        return `No valid ${referenceKey} found.`;
      }

      const defaultV =
        typeof state[k] === 'object' && !Array.isArray(state[k]) ? state[k]?.block_name : null;

      return (
        <Select
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
          value={typeof defaultV === 'string' ? defaultV : null}
          options={referees.map(([subkey]) => {
            return {
              label: subkey,
              value: subkey,
            };
          })}
        />
      );
    }
    // render this
    if (k === 'neuron_ids') return <Input />;

    if (obj.enum)
      return (
        <Select
          onChange={(newV) => setState({ ...state, [k]: newV })}
          value={state[k]}
          className="w-[150px]"
          options={obj.enum.map((subv: string) => {
            return { label: subv, value: subv };
          })}
        />
      );
    if (obj.type === 'number' || obj.type === 'integer')
      return (
        <InputNumber
          value={typeof state[k] === 'number' ? state[k] : null}
          onChange={(value) => {
            setState({ ...state, [k]: value });
          }}
        />
      );
    if (obj.type === 'string')
      return (
        <Input
          value={typeof state[k] === 'string' ? state[k] : ''}
          className="max-w-[300px]"
          onChange={(e) => {
            setState({ ...state, [k]: e.currentTarget.value });
          }}
        />
      );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-primary-8 text-lg uppercase">{schema.title}</div>
      <div className="text-gray-600">{schema.description}</div>
      <div className="flex flex-col gap-5">
        {schema.properties &&
          Object.entries(schema.properties)
            .filter(([k]) => {
              return !skip.includes(k);
            })
            .map(([k, v]) => {
              return (
                <div key={k}>
                  <div className="text-primary-8 text-lg uppercase">{v.title}</div>
                  {renderInput(k, v)}
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
