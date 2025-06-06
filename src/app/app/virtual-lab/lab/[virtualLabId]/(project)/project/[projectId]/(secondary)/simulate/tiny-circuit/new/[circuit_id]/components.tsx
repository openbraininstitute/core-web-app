import { InputNumber, Input, Select } from 'antd';
import { JSONSchema } from './types';
import { atom, useAtom } from 'jotai';

import { type Object } from './page';
import { Fragment, useState } from 'react';

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

  const [globalState, setGlobalState] = useAtom(stateAtom);
  const [localState, setLocalState] = useState<{ [key: string]: Object | string }>({});
  const [selectedCategory, setSelectingCategory] = useState('');

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

  if (schema.additionalProperties?.anyOf && !selectedCategory) {
    return (
      <div className="flex flex-col items-center gap-5">
        {schema.additionalProperties.anyOf.map((o) => {
          if (!o.title) throw new Error('invalid schema, title missing');
          return (
            <Fragment key={o.title}>
              {/* eslint-disable-next-line */}
              <div
                className="min-h-[100px] w-[70%] cursor-pointer rounded-xl bg-white p-5 shadow"
                onClick={() => setSelectingCategory(o.title as string)}
              >
                <div className="text-primary-9 text-lg font-bold">{o.title}</div>
                <div className="mt-3">{o.description}</div>
              </div>
            </Fragment>
          );
        })}
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
        {selectedCategory &&
          schema.additionalProperties?.anyOf &&
          renderProperties(
            schema.additionalProperties.anyOf.find((s) => s.title === selectedCategory)?.properties!
          )}
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
