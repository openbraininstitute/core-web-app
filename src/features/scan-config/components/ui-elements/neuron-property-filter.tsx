import { CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useRef } from 'react';

import { FancyCombobox, FancyMultiSelect } from '@/ui/molecules/fancy-combobox';
import { FancyActions, FancyField } from '@/ui/molecules/fancy-input';

import type { FancyChrome } from '@/ui/molecules/fancy-input';

export interface INeuronPropertyFilter {
  filter_dict: Record<string, string[]>;
}

export default function NeuronPropertyFilter({
  value,
  properties,
  population,
  onChange,
  disabled = false,
  chrome,
}: {
  value: INeuronPropertyFilter[];
  properties: Record<string, string[]>;
  population: string;
  onChange: (newValue: INeuronPropertyFilter[]) => void;
  disabled?: boolean;
  chrome?: FancyChrome;
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

  // Nothing to filter on: say why inside the field instead of leaving an empty frame.
  if (Object.keys(properties).length === 0) {
    return (
      <FancyField {...chrome} disabled={disabled}>
        <p className="px-3 py-2 text-sm text-neutral-4">
          {population
            ? 'This population has no properties to filter on.'
            : 'Select a population first.'}
        </p>
      </FancyField>
    );
  }

  const setFilter = (i: number, filter_dict: Record<string, string[]>) =>
    onChange(value.with(i, { filter_dict }));

  return (
    <FancyField
      {...chrome}
      group
      disabled={disabled}
      borderActions={
        <FancyActions
          onBorder
          disabled={disabled}
          actions={[
            {
              key: 'add-filter',
              label: 'Add a filter',
              icon: <PlusOutlined />,
              onClick: () => onChange([...value, { filter_dict: {} }]),
            },
          ]}
        />
      }
    >
      {/* Filters are sections of this one field, split by a rule; the heading only appears
          once there is more than one to tell apart. */}
      <div className="divide-y divide-neutral-2">
        {value.map((f, i) => {
          const unused = Object.keys(properties).filter((key) => !(key in f.filter_dict));
          return (
            <section
              // biome-ignore lint/suspicious/noArrayIndexKey: filters are positional
              key={i}
              aria-label={`Filter ${i + 1}`}
              className="flex flex-col gap-4 p-2.5 first:pt-4"
            >
              {value.length > 1 && (
                <div className="-mb-2 flex items-center justify-between ps-1">
                  <span className="text-xs font-medium text-neutral-4">Filter {i + 1}</span>
                  <FancyActions
                    disabled={disabled}
                    actions={[
                      {
                        key: 'remove-filter',
                        label: `Remove filter ${i + 1}`,
                        icon: <DeleteOutlined />,
                        onClick: () => onChange(value.filter((_, idx) => idx !== i)),
                      },
                    ]}
                  />
                </div>
              )}
              {Object.keys(f.filter_dict).map((p) => {
                const selected = f.filter_dict[p];
                return (
                  <FancyMultiSelect
                    key={p}
                    label={p}
                    disabled={disabled}
                    searchable
                    maxBadges={6}
                    // Some populations expose empty-string values; they'd render as blank rows.
                    options={(properties[p] ?? [])
                      .filter((v) => v.trim() !== '')
                      .map((v) => ({ value: v, label: v }))}
                    values={selected}
                    onChange={(next) => setFilter(i, { ...f.filter_dict, [p]: next })}
                    variant={selected.length === 0 ? 'warning' : 'default'}
                    helperText={selected.length === 0 ? 'Pick at least one value' : undefined}
                    emptyLabel="No values available"
                    borderActions={
                      <FancyActions
                        onBorder
                        disabled={disabled}
                        actions={[
                          {
                            key: 'remove-property',
                            label: `Remove ${p}`,
                            icon: <CloseOutlined />,
                            onClick: () => {
                              const { [p]: _, ...rest } = f.filter_dict;
                              setFilter(i, rest);
                            },
                          },
                        ]}
                      />
                    }
                  />
                );
              })}
              {unused.length > 0 && (
                <FancyCombobox
                  disabled={disabled}
                  placeholder="Add a property…"
                  options={unused.map((key) => ({ value: key, label: key }))}
                  values={[]}
                  onChange={([key]) => key && setFilter(i, { ...f.filter_dict, [key]: [] })}
                />
              )}
            </section>
          );
        })}
      </div>
    </FancyField>
  );
}
