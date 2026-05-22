import { Button } from 'antd';
import { useState } from 'react';

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
        const handleValuesChange = (property: string, selected: string[]) =>
          onChange(value.with(i, { filter_dict: { ...f.filter_dict, [property]: selected } }));

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: no stable unique key available
          <div key={i} className="border border-gray-300 rounded-md">
            {Object.keys(f.filter_dict).map((p) => (
              <PropertyValueSelector
                propertyName={p}
                key={p}
                values={properties[p]}
                selected={f.filter_dict[p]}
                onValuesChange={(selected) => handleValuesChange(p, selected)}
              />
            ))}
            <DropdownSelect
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

function DropdownSelect({
  placeholder,
  options,
  onChange,
}: {
  placeholder: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="rounded border border-dashed border-gray-400 px-3 py-1 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-700"
        onClick={() => setIsOpen(true)}
      >
        {placeholder}
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="rounded border border-gray-300 bg-white shadow-sm">
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400">No options available</div>
        ) : (
          options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function PropertyValueSelector({
  propertyName,
  values,
  selected,
  onValuesChange,
}: {
  propertyName: string;
  values: string[];
  selected: string[];
  onValuesChange: (selected: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onValuesChange(selected.filter((s) => s !== val));
    } else {
      onValuesChange([...selected, val]);
    }
  };

  return (
    <div>
      {propertyName}
      <div className="flex flex-wrap gap-2">
        {values.map((val) => {
          const isSelected = selected.includes(val);
          return (
            <button
              key={val}
              type="button"
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
              onClick={() => toggle(val)}
            >
              {val}
            </button>
          );
        })}
      </div>
    </div>
  );
}
