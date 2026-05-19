import { Button, Select } from 'antd';
import { get } from 'es-toolkit/compat';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

export interface INeuronPropertyFilter {
  filter_dict: Record<string, string[]>;
}

export default function NeuronPropertyFilter({
  value,
  properties,
  onChange,
}: {
  value: INeuronPropertyFilter[];
  properties: Record<string, string[]>;
  onChange: (newValue: INeuronPropertyFilter[]) => void;
}) {
  if (Object.keys(properties).length === 0)
    return <div className="text-gray-500">Select a population</div>;

  return (
    <div>
      {value.map((f, i) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: no stable unique key available
          <div key={i}>
            {Object.keys(f.filter_dict).map((p) => (
              <div key={p}>{p}</div>
            ))}
            <Select
              value={null}
              placeholder="Add a property"
              options={Object.keys(properties)
                .filter((key) => !(key in f.filter_dict))
                .map((key) => ({ label: key, value: key }))}
              onChange={(selectedKey: string) => {
                const updated = [...value];
                updated[i] = {
                  filter_dict: { ...updated[i].filter_dict, [selectedKey]: [] },
                };
                onChange(updated);
              }}
            />
          </div>
        );
      })}

      <Button
        onClick={() => {
          onChange([...value, { filter_dict: {} }]);
        }}
      >
        Add a filter
      </Button>
    </div>
  );
}
