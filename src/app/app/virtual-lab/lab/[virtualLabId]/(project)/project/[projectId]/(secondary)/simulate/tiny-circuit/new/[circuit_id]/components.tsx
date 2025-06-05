import { InputNumber, Input, Select } from 'antd';
import { JSONSchema } from './types';
import { atom, useAtom } from 'jotai';
import { type Object } from './page';

export default function JSONSchemaForm({
  schema,
  stateAtom,
}: {
  schema: JSONSchema;
  stateAtom: ReturnType<typeof atom<{ [key: string]: Object | string }>>;
}) {
  const skip = ['circuit', 'type']; // TODO: handle when circuit changes

  const [state, setState] = useAtom(stateAtom);

  function renderInput(k: string, v: JSONSchema) {
    const obj = { ...v, ...v.anyOf?.find((v) => v.type !== 'array') };

    if (obj.enum)
      return (
        <Select
          className="w-[150px]"
          defaultValue={v.default}
          options={obj.enum.map((v: string) => {
            return { label: v, value: v };
          })}
        />
      );
    if (obj.type === 'number' || obj.type === 'integer')
      return <InputNumber defaultValue={obj.default} />;
    if (obj.type === 'string')
      return (
        <Input
          defaultValue={obj.default}
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

  return (
    <div className="flex flex-col gap-2">
      <div className="text-primary-8 text-lg uppercase">{schema.title}</div>
      <div className="text-gray-600">{schema.description}</div>
      <div className="flex flex-col gap-5">
        {schema.properties && renderProperties(schema.properties)}
        {schema.additionalProperties?.properties &&
          renderProperties(schema.additionalProperties.properties)}
      </div>
    </div>
  );
}
