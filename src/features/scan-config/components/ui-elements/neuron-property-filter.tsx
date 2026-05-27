import { CloseOutlined, DeleteOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';

import { cn } from '@/utils/css-class';

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
    <div className="flex flex-col gap-3">
      {value.map((f, i) => {
        const handleValuesChange = (property: string, selected: string[]) =>
          onChange(value.with(i, { filter_dict: { ...f.filter_dict, [property]: selected } }));

        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable unique key available
            key={i}
            className="border border-gray-300 rounded-md relative p-3 flex flex-col gap-2 pt-2"
          >
            {i !== 0 && (
              <DeleteOutlined
                className="absolute top-1 right-1 text-red-500 cursor-pointer hover:text-red-700 text-sm"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              />
            )}
            {Object.keys(f.filter_dict).map((p, idx) => (
              <PropertyValueSelector
                index={idx + 1}
                propertyName={p}
                key={p}
                values={properties[p]}
                selected={f.filter_dict[p]}
                onValuesChange={(selected) => handleValuesChange(p, selected)}
                onDelete={() => {
                  const { [p]: _, ...rest } = f.filter_dict;
                  onChange(value.with(i, { filter_dict: rest }));
                }}
              />
            ))}
            <div className="w-full flex flex-col mt-[10px]">
              <DropdownSelect
                placeholder="Add new property"
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
          </div>
        );
      })}

      <Button
        className="p-2 rounded-full text-primary-8 font-semibold bg-transparent self-end p-5"
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

  return (
    <div className="relative w-full">
      <div
        className={cn('w-full border border-gray-300', isOpen ? 'rounded-[18px]' : 'rounded-full')}
      >
        <button
          type="button"
          className={cn(
            'w-full font-semibold px-3 py-[6px] flex justify-between',
            isOpen ? 'text-gray-300' : 'text-primary-8'
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {placeholder}
          {isOpen ? <CloseOutlined /> : <PlusOutlined />}
        </button>
        {isOpen && (
          <div>
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No options available</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-gray-100 text-primary-8 font-semibold"
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
        )}
      </div>
    </div>
  );
}

function PropertyValueSelector({
  index,
  propertyName,
  values,
  selected,
  onValuesChange,
  onDelete,
}: {
  index: number;
  propertyName: string;
  values: string[];
  selected: string[];
  onValuesChange: (selected: string[]) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onValuesChange(selected.filter((s) => s !== val));
    } else {
      onValuesChange([...selected, val]);
    }
  };

  return (
    <div className={cn(index === 1 ? 'mt-2' : '')}>
      <div className="flex items-center gap-2 w-full">
        <DeleteOutlined
          className="text-red-500 cursor-pointer hover:text-red-700 text-xs"
          onClick={onDelete}
        />
        <button
          type="button"
          className="font-semibold cursor-pointer text-primary-8"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-gray-300 mr-2">{index}.</span> {propertyName}
        </button>
        <div className="flex-1" />
        <DownOutlined className="relative right-[3px]" onClick={() => setExpanded(!expanded)} />
      </div>
      {expanded && (
        <div className="flex flex-wrap gap-2 mt-1 text-sm border-gray-300 border-1 rounded-md p-3 bg-white">
          {values.map((val) => {
            const isSelected = selected.includes(val);
            return (
              <button
                key={val}
                type="button"
                className={`rounded-full border px-3 py-1 transition-colors border-gray-200 text-primary-8 ${
                  isSelected ? 'bg-gray-300 font-semibold' : 'bg-white hover:bg-gray-200'
                }`}
                onClick={() => toggle(val)}
              >
                {val}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
