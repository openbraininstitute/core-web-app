import { PlusOutlined } from '@ant-design/icons';
import { RiDeleteBinLine } from '@remixicon/react';

import { Reference } from '@/features/scan-config/components/ui-elements/reference';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { FancyCombobox } from '@/ui/molecules/fancy-combobox';
import { FancyActions, FancyField } from '@/ui/molecules/fancy-input';

import type {
  Config,
  ConfigSchema,
  NeuronSetCombination as NeuronSetCombinationSchema,
  Reference as ReferenceSchema,
} from '@/features/scan-config/types';
import type { FancyChrome } from '@/ui/molecules/fancy-input';

const MAX_OPERATIONS = 5;

type SetOperation = 'union' | 'intersect' | 'diff';

interface BlockReferenceValue {
  block_name: string;
  block_dict_name: string;
}

/** each entry is a fixed 2-tuple: [neuron set reference | null, set operation] */
export type NeuronSetCombinationEntry = [BlockReferenceValue | null, SetOperation];

const OPERATION_OPTIONS: Array<{ value: SetOperation; label: string }> = [
  { value: 'union', label: 'Union' },
  { value: 'intersect', label: 'Intersect' },
  { value: 'diff', label: 'Difference' },
];

export function NeuronSetCombination({
  paramSchema,
  value,
  onChange,
  disabled,
  config,
  schema,
  selfName,
  chrome,
}: {
  paramSchema: NeuronSetCombinationSchema;
  value: NeuronSetCombinationEntry[];
  onChange: (newValue: NeuronSetCombinationEntry[]) => void;
  disabled: boolean;
  config: Config;
  schema: ConfigSchema;
  /** name of this combined set's own entry, excluded from each row's dropdown */
  selfName?: string;
  chrome?: FancyChrome;
}) {
  // synthetic reference schema so we can reuse the existing `Reference` picker for each row.
  // `Reference` only reads `reference_types` and `reference_tag`; `anyOf` is an unused placeholder
  // for the type cast.
  const referenceSchema = {
    reference_types: paramSchema.reference_types,
    reference_tag: paramSchema.reference_tag,
    anyOf: [],
  } as unknown as ReferenceSchema;

  // a combined set must not reference itself, so exclude its own name from every row's dropdown
  const omit = selfName ? [selfName] : [];

  const remaining = MAX_OPERATIONS - value.length;
  const canAdd = !disabled && value.length < MAX_OPERATIONS;

  return (
    <div data-scan-config-block-element={ScanConfigUIElementDict.NeuronSetCombination}>
      <FancyField
        {...chrome}
        group
        disabled={disabled}
        helperText={disabled ? undefined : `${remaining} of ${MAX_OPERATIONS} operations available`}
        borderActions={
          !disabled && (
            <FancyActions
              onBorder
              actions={[
                {
                  key: 'add',
                  label: 'Add operation',
                  icon: <PlusOutlined />,
                  disabled: !canAdd,
                  onClick: () => onChange([...value, [null, 'union']]),
                },
              ]}
            />
          )
        }
      >
        {value.length === 0 ? (
          <p className="px-3 py-2 text-sm text-neutral-4">No operations yet. Add one with +.</p>
        ) : (
          // Operations are sections of this one field, split by a rule, not boxes inside it.
          <div className="divide-y divide-neutral-2">
            {value.map(([ref, op], i) => {
              const refName = ref?.block_name ?? null;
              return (
                <section
                  // biome-ignore lint/suspicious/noArrayIndexKey: order-stable list edited via index
                  key={i}
                  aria-label={`Operation ${i + 1}`}
                  className="flex flex-col gap-4 p-2.5 first:pt-4"
                >
                  <div className="-mb-2 flex items-center justify-between ps-1">
                    <span className="text-xs font-medium text-neutral-4">Operation {i + 1}</span>
                    {!disabled && (
                      <FancyActions
                        actions={[
                          {
                            key: 'remove',
                            label: `Remove operation ${i + 1}`,
                            icon: <RiDeleteBinLine className="size-3.5" />,
                            onClick: () => onChange(value.toSpliced(i, 1)),
                          },
                        ]}
                      />
                    )}
                  </div>

                  <FancyCombobox
                    label="Operator"
                    disabled={disabled}
                    options={OPERATION_OPTIONS}
                    values={[op]}
                    onChange={([newOp]) =>
                      newOp && onChange(value.with(i, [ref, newOp as SetOperation]))
                    }
                  />

                  <Reference
                    chrome={{ label: 'Neuron set' }}
                    config={config}
                    schema={schema}
                    referenceSchema={referenceSchema}
                    value={refName}
                    disabled={disabled}
                    omit={omit}
                    onChange={(block_name: string | null, block_dict_name: string | null) =>
                      onChange(
                        value.with(i, [
                          // serialize exactly like the shared `Reference` field: no `type`, letting
                          // the backend apply the BlockReference default (the path base_neuron_set uses).
                          block_name === null
                            ? null
                            : { block_name, block_dict_name: block_dict_name ?? '' },
                          op,
                        ])
                      )
                    }
                  />
                </section>
              );
            })}
          </div>
        )}
      </FancyField>
    </div>
  );
}
