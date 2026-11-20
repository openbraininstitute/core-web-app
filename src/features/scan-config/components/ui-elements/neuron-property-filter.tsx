import {
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

/**
 * `value` with a line-break opportunity after each `_` and `-`, so a long id wraps between
 * its parts (`…_cNAC_` / `971114B_…`) rather than inside a number.
 */
function wrapBetweenIdParts(value: string): ReactNode[] {
  return (
    value
      .split(/(?<=[_-])/)
      // biome-ignore lint/suspicious/noArrayIndexKey: parts of a fixed string, never reordered
      .flatMap((part, i) => (i === 0 ? [part] : [<wbr key={i} />, part]))
  );
}

export interface INeuronPropertyFilter {
  filter_dict: Record<string, string[]>;
}

export default function NeuronPropertyFilter({
  value,
  properties,
  population,
  onChange,
}: {
  value: INeuronPropertyFilter[];
  properties: Record<string, string[]>;
  population: string;
  onChange: (newValue: INeuronPropertyFilter[]) => void;
}) {
  // properties differ between populations; any previously selected filter is
  // invalid once the population changes and must be reset. Tracking the previous
  // value in a ref (rather than the render body) ensures we only reset on an
  // actual change and never wipe a filter restored from a saved config on mount.
  const prevPopulation = useRef(population);
  useEffect(() => {
    if (prevPopulation.current !== population) {
      prevPopulation.current = population;
      onChange([]);
    }
  }, [population, onChange]);

  // no properties to filter on: the status line (rendered by the block) already
  // explains why ("Select a population" / "No properties available"), so render
  // nothing here to avoid a duplicate, conflicting message.
  if (Object.keys(properties).length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {value.map((f, i) => {
        const handleValuesChange = (property: string, selected: string[]) =>
          onChange(value.with(i, { filter_dict: { ...f.filter_dict, [property]: selected } }));

        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable unique key available
            key={i}
            className={cn(
              'relative flex min-w-0 flex-col gap-3 rounded-md border border-gray-300 p-3',
              value.length > 1 && 'pt-6'
            )}
          >
            {value.length > 1 && (
              <button
                type="button"
                aria-label="Remove filter"
                className="absolute top-1.5 right-2 flex cursor-pointer items-center text-sm text-gray-400 hover:text-primary-8"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                <DeleteOutlined />
              </button>
            )}
            {Object.keys(f.filter_dict).map((p, idx) => (
              <PropertyValueSelector
                index={idx + 1}
                propertyName={p}
                key={p}
                values={properties[p] ?? []}
                selected={f.filter_dict[p]}
                onValuesChange={(selected) => handleValuesChange(p, selected)}
                onDelete={() => {
                  const { [p]: _, ...rest } = f.filter_dict;
                  onChange(value.with(i, { filter_dict: rest }));
                }}
              />
            ))}
            <div className="flex w-full flex-col">
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
        className="p-5 rounded-full text-primary-8 font-semibold bg-transparent self-end"
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
  const [expanded, setExpanded] = useState(true);

  // some populations expose empty-string values (e.g. an unset model_template);
  // drop them so they don't render as blank, unclickable pills.
  const displayValues = values.filter((val) => val.trim() !== '');

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onValuesChange(selected.filter((s) => s !== val));
    } else {
      onValuesChange([...selected, val]);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          aria-label={`Remove ${propertyName}`}
          className="flex shrink-0 cursor-pointer items-center text-xs text-gray-400 hover:text-primary-8"
          onClick={onDelete}
        >
          <DeleteOutlined />
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left font-semibold text-primary-8"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="shrink-0 text-gray-300">{index}.</span>
          <span className="truncate">{propertyName}</span>
          {expanded ? (
            <DownOutlined className="ml-auto shrink-0 text-xs" />
          ) : (
            <RightOutlined className="ml-auto shrink-0 text-xs" />
          )}
        </button>
      </div>
      {expanded && (
        // values are long ids (me_combo reaches ~150 characters, and its end tells clones
        // apart), so one full-width row each, wrapped rather than cut; the list scrolls
        // past max-h-64 instead of growing the panel. A ring, unlike a border, does not
        // change the size when the empty-selection warning colour turns on.
        <div
          className={cn(
            'flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-md bg-white p-2 text-sm',
            selected.length === 0 ? 'ring-2 ring-yellow-400' : 'ring-1 ring-neutral-200'
          )}
        >
          {displayValues.length === 0 && (
            <span className="px-1 text-gray-400">No values available</span>
          )}
          {displayValues.map((val) => {
            const isSelected = selected.includes(val);
            return (
              <button
                key={val}
                type="button"
                aria-pressed={isSelected}
                title={val}
                className={cn(
                  'w-full cursor-pointer rounded-lg px-3 py-1.5 text-left leading-snug wrap-break-word ring-1 transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-8',
                  isSelected
                    ? 'bg-primary-8 text-white ring-primary-8'
                    : 'bg-white text-primary-8 ring-neutral-200 hover:bg-neutral-100'
                )}
                onClick={() => toggle(val)}
              >
                {wrapBetweenIdParts(val)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
