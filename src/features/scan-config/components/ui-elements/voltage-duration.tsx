import { PlusOutlined } from '@ant-design/icons';
import { RiDeleteBinLine } from '@remixicon/react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { FancyActions, FancyField } from '@/ui/molecules/fancy-input';

import ParameterSweep from './parameter-sweep';

import type { FancyChrome } from '@/ui/molecules/fancy-input';
import type { VoltageDuration as VoltageDurationSchema } from '../../types';

export interface VoltageDurationState {
  voltage: null | number | (number | null)[];
  duration: null | number | (number | null)[];
}

export function VoltageDuration({
  paramSchema,
  state,
  onChange,
  disabled,
  chrome,
}: {
  paramSchema: VoltageDurationSchema;
  state: VoltageDurationState[];
  onChange: (newValue: VoltageDurationState[]) => void;
  disabled: boolean;
  chrome?: FancyChrome;
}) {
  const { voltage, duration } = paramSchema.items.properties;
  const bounds = (field: typeof voltage) => {
    const [first] = field.anyOf;
    return {
      min: first.minimum,
      max: first.maximum,
      exclusiveMin: first.exclusiveMinimum,
      exclusiveMax: first.exclusiveMaximum,
    };
  };
  const chromeOf = (field: typeof voltage, fallback: string): FancyChrome => ({
    label: field.title ?? fallback,
    unit: field.units,
    labelInfo: field.description,
  });

  return (
    <div data-scan-config-block-element={ScanConfigUIElementDict.VoltageDuration}>
      <FancyField
        {...chrome}
        group
        disabled={disabled}
        borderActions={
          !disabled && (
            <FancyActions
              onBorder
              actions={[
                {
                  key: 'add',
                  label: 'Add level',
                  icon: <PlusOutlined />,
                  onClick: () => onChange([...state, { voltage: null, duration: null }]),
                },
              ]}
            />
          )
        }
      >
        {state.length === 0 ? (
          <p className="px-3 py-2 text-sm text-neutral-4">No levels yet. Add one with +.</p>
        ) : (
          // Levels are sections of this one field, split by a rule, not boxes inside it.
          <div className="divide-y divide-neutral-2">
            {state.map((v, i) => (
              <section
                // biome-ignore lint/suspicious/noArrayIndexKey: levels are positional
                key={i}
                aria-label={`Level ${i + 1}`}
                className="flex flex-col gap-4 p-2.5 first:pt-4"
              >
                <div className="-mb-2 flex items-center justify-between ps-1">
                  <span className="text-xs font-medium text-neutral-4">Level {i + 1}</span>
                  {!disabled && (
                    <FancyActions
                      actions={[
                        {
                          key: 'remove',
                          label: `Remove level ${i + 1}`,
                          icon: <RiDeleteBinLine className="size-3.5" />,
                          onClick: () => onChange(state.toSpliced(i, 1)),
                        },
                      ]}
                    />
                  )}
                </div>
                <ParameterSweep
                  {...bounds(voltage)}
                  chrome={chromeOf(voltage, 'Voltage')}
                  value={v.voltage}
                  disabled={disabled}
                  k={`voltage-${i}`}
                  onChange={(newV) => onChange(state.with(i, { ...v, voltage: newV }))}
                />
                <ParameterSweep
                  {...bounds(duration)}
                  chrome={chromeOf(duration, 'Duration')}
                  value={v.duration}
                  disabled={disabled}
                  k={`duration-${i}`}
                  onChange={(newV) => onChange(state.with(i, { ...v, duration: newV }))}
                />
              </section>
            ))}
          </div>
        )}
      </FancyField>
    </div>
  );
}
