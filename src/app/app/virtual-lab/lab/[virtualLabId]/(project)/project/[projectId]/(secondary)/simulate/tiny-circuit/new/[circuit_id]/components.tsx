import { InputNumber, Input, Select } from 'antd';
import { JSONSchema } from './types';
import { atom, useAtom } from 'jotai';

import { type Object } from './page';
import { Fragment, useEffect, useState } from 'react';
import { ConsoleSqlOutlined } from '@ant-design/icons';

export default function JSONSchemaForm({
  schema,
  stateAtom,
  selectedCategory,
  setSelectedCategory,
  selectedItemIdx,
  onApply,
}: {
  schema: JSONSchema;
  stateAtom: ReturnType<typeof atom<{ [key: string]: Object }>>;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedItemIdx: string;
  onApply?: () => void;
}) {
  const skip = ['circuit', 'type']; // TODO: handle when circuit changes

  if (!schema.title) throw new Error('Invalid schema, no title');

  const [globalState, setGlobalState] = useAtom(stateAtom);
  const [localState, setLocalState] = useState<{ [key: string]: Object }>({});
  const selectedCatSchema = schema.additionalProperties?.anyOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  useEffect(() => {
    const theSchema = selectedCatSchema ?? schema;

    const allProps: { [key: string]: JSONSchema } = {
      ...theSchema.properties,
      ...theSchema.additionalProperties?.properties,
    };
    const initialValues: { [key: string]: Object } = {};

    Object.entries(allProps).forEach(([k, v]) => {
      if (k === 'type') initialValues[k] = v.const ?? null;
      else initialValues[k] = v.default ?? null;
    });

    setLocalState(initialValues);
  }, [selectedCatSchema, schema]);

  function renderInput(k: string, v: JSONSchema) {
    const obj = { ...v, ...v.anyOf?.find((v) => v.type !== 'array') };

    const state = schema.additionalProperties
      ? (globalState[`${schema.title}_${selectedItemIdx}`] ?? {})
      : globalState;

    

    if (obj.enum)
      return (
        <Select
          onChange={(newV) =>
            setLocalState((prev) => {
              return { ...prev, [k]: newV };
            })
          }
          value={state[k]}
          className="w-[150px]"
          options={obj.enum.map((v: string) => {
            return { label: v, value: v };
          })}
        />
      );
    if (obj.type === 'number' || obj.type === 'integer')
      return (
        <InputNumber
          value={state[k]}
          onChange={(value) => {
            setLocalState((prev) => {
              return { ...prev, [k]: value };
            });
          }}
        />
      );
    if (obj.type === 'string')
      return (
        <Input
          value={state[k]}
          className="max-w-[300px]"
          onChange={(e) => {
            setLocalState((prev) => {
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
          return (
            <Fragment key={o.title}>
              {/* eslint-disable-next-line */}
              <div
                className="min-h-[100px] w-[70%] cursor-pointer rounded-xl bg-white p-5 shadow"
                onClick={() => setSelectedCategory(o.properties?.type.const as string)}
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
          renderProperties(selectedCatSchema?.properties!)}
      </div>

      <button
        type="button"
        onClick={() => {
          if (schema.additionalProperties)
            setGlobalState((prev) => {
              return {
                ...prev,
                [`${schema.title}_${selectedItemIdx || Object.keys(globalState).length}`]:
                  localState,
              };
            });
          else {
            setGlobalState(localState);
          }
          if (onApply) onApply();
        }}
      >
        Apply
      </button>
    </div>
  );
}
