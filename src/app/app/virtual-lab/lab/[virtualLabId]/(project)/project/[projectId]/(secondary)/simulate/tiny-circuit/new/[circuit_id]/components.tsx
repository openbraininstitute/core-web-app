import { InputNumber, Input, Select } from 'antd';
import { JSONSchema } from './types';
import { atom, useAtom } from 'jotai';

import { type Object } from './page';
import { useState } from 'react';

export default function JSONSchemaForm({
  schema,
  stateAtom,
  onApply,
}: {
  schema: JSONSchema;
  stateAtom: ReturnType<typeof atom<{ [key: string]: Object | string }>>;
  onApply?: () => void;
}) {
  const skip = ['circuit', 'type']; // TODO: handle when circuit changes

  console.log(schema);

  const [globalState, setGlobalState] = useAtom(stateAtom);
  const [localState, setLocalState] = useState<{ [key: string]: Object | string }>({});

  const setState = schema.additionalProperties ? setLocalState : setGlobalState;

  function renderInput(k: string, v: JSONSchema) {
    const obj = { ...v, ...v.anyOf?.find((v) => v.type !== 'array') };

    if (obj.enum)
      return (
        <Select
          className="w-[150px]"
          options={obj.enum.map((v: string) => {
            return { label: v, value: v };
          })}
        />
      );
    if (obj.type === 'number' || obj.type === 'integer') return <InputNumber />;
    if (obj.type === 'string')
      return (
        <Input
          className="max-w-[300px]"
          onChange={(e) => {
            setState((prev) => {
              return { ...prev, [k]: e.currentTarget.value };
            });
          }}
        />
      );
  }

  function renderProperties(properties: { [key: string]: JSONSchema }) {
    return Object.entries(properties)
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
      });
  }

  if (schema.additionalProperties?.anyOf) {
    return (
      <div className="flex flex-col gap-2">
        {schema.additionalProperties.anyOf.map((o) => (
          <div key={o.title} className="min-h-[50px] w-[90%] border border-gray-200">
            {o.title}
            {o.description}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-primary-8 text-lg uppercase">{schema.title}</div>
      <div className="text-gray-600">{schema.description}</div>
      <div className="flex flex-col gap-5">
        {schema.properties && renderProperties(schema.properties)}
        {schema.additionalProperties?.properties &&
          renderProperties(schema.additionalProperties.properties)}
      </div>
      {schema.additionalProperties && (
        <button
          type="button"
          onClick={() => {
            setGlobalState((prev) => {
              return {
                ...prev,
                [(schema.title ?? '') + Object.keys(globalState).length]: localState,
              };
            });
            if (onApply) onApply();
          }}
        >
          Apply
        </button>
      )}
    </div>
  );
}
