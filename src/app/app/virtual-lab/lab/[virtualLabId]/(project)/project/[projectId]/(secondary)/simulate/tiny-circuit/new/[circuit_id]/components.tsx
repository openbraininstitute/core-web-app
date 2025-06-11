import { useEffect } from 'react';
import { atom, useAtom } from 'jotai';
import { InputNumber, Input, Select } from 'antd';
import { JSONSchema } from './types';
import { type Object } from './page';
import { classNames } from '@/util/utils';

export function JSONSchemaForm({
  schema,
  stateAtom,
}: {
  schema: JSONSchema;
  stateAtom: ReturnType<typeof atom<{ [key: string]: Object }>>;
}) {
  const skip = ['circuit', 'type']; // TODO: handle when circuit changes

  const [state, setState] = useAtom(stateAtom);

  useEffect(() => {
    setState((prev) => {
      return { ...prev, type: schema.properties?.type.const ?? '' };
    });
  }, [stateAtom, setState, schema.properties?.type.const]);

  function renderInput(k: string, v: JSONSchema) {
    const obj = { ...v, ...v.anyOf?.find((subv) => subv.type !== 'array') };

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
