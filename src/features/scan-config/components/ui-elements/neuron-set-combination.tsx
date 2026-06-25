import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Select } from 'antd';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import Reference from './reference';

import type {
  Config,
  ConfigSchema,
  NeuronSetCombination as NeuronSetCombinationSchema,
  Reference as ReferenceSchema,
} from '@/features/scan-config/types';

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
}: {
  paramSchema: NeuronSetCombinationSchema;
  value: NeuronSetCombinationEntry[];
  onChange: (newValue: NeuronSetCombinationEntry[]) => void;
  disabled: boolean;
  config: Config;
  schema: ConfigSchema;
  /** name of this combined set's own entry, excluded from each row's dropdown */
  selfName?: string;
}) {
  // synthetic reference schema so we can reuse the existing `Reference` picker for each row.
  // `Reference` only reads `reference_types`; `anyOf` is an unused placeholder for the type cast.
  const referenceSchema = {
    reference_types: paramSchema.reference_types,
    anyOf: [],
  } as unknown as ReferenceSchema;

  // a combined set must not reference itself, so exclude its own name from every row's dropdown
  const omit = selfName ? [selfName] : [];

  const remaining = MAX_OPERATIONS - value.length;
  const canAdd = !disabled && value.length < MAX_OPERATIONS;

  return (
    <>
      <div className="flex flex-col gap-3">
        {value.map(([ref, op], i) => {
          const refName = ref?.block_name ?? null;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: order-stable list edited via index
              key={i}
              className={cn(
                'flex flex-col gap-1 border border-gray-200 p-3 rounded-md',
                'hover:border-gray-50 hover:bg-white hover:shadow-sm'
              )}
            >
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <div className="text-gray-400 text-lg">Operation {i + 1}</div>
                {!disabled && (
                  <Button
                    rounded
                    variant="icon"
                    type="button"
                    size="md"
                    className="p-0 hover:bg-gray-50"
                    onClick={() => onChange(value.toSpliced(i, 1))}
                  >
                    <DeleteOutlined className="text-red-500 " />
                  </Button>
                )}
              </div>

              <div className="text-gray-400 text-base mt-2">OPERATOR</div>
              <Select
                className="w-full"
                disabled={disabled}
                value={op}
                options={OPERATION_OPTIONS}
                onChange={(newOp: SetOperation) => onChange(value.with(i, [ref, newOp]))}
              />

              <div className="text-gray-400 text-base mt-2">NEURON SET</div>
              <Reference
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
            </div>
          );
        })}
      </div>

      {!disabled && (
        <div className="mt-2 flex flex-col items-end gap-1">
          <Button
            rounded
            type="button"
            disabled={!canAdd}
            variant="outline"
            className={cn(
              'disabled:bg-gray-200! active:bg-transparent hover:bg-gray-100! pl-4! h-10!'
              // 'rounded-full border border-gray-200 px-3 py-2 min-w-[150px] text-primary-8',
              // 'font-bold flex justify-between min-h-[40px] items-center disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            onClick={() => onChange([...value, [null, 'union']])}
          >
            Add operation
            <PlusOutlined className="text-primary-8!" />
          </Button>
          <div className="text-neutral-3 text-xs">
            {remaining} of {MAX_OPERATIONS} operations available
          </div>
        </div>
      )}
    </>
  );
}
