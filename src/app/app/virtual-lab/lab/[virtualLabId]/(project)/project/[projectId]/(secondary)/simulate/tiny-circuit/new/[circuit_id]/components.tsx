import { useEffect } from 'react';
import { atom, useAtom } from 'jotai';
import { InputNumber, Input, Select } from 'antd';
import { JSONSchema } from './types';
import { type Object } from './page';

export default function JSONSchemaForm({
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
