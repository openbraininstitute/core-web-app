'use client';

import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Input } from 'antd';
import { useState } from 'react';

import { SweepIconButton } from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

export interface IStringListProps {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  disabled?: boolean;
  /** render only the list of values, no controls */
  readOnly?: boolean;
  /**
   * When true, removing the last entry writes `null` (unset) instead of `[]`, for schemas where
   * the empty list and "not set" are distinct.
   */
  optional?: boolean;
}

/**
 * Do not mount directly: use the `StringListInput` or `StringListOptional` wrapper, which fix the
 * value type and the delete-last-entry behavior. Shared list-of-strings editor styled like
 * `float_parameter_sweep`; `optional` controls whether removing the last entry writes `null`
 * (unset) or keeps an empty list.
 */
export function StringListBase({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  optional = false,
}: IStringListProps) {
  const [draft, setDraft] = useState('');

  const items = value ?? [];

  const addValue = () => {
    const next = draft.trim();
    if (!next) return;
    onChange([...items, next]);
    setDraft('');
  };

  const removeAt = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length === 0 && optional ? null : next);
  };

  return (
    <div
      className="flex w-full flex-col gap-1"
      data-scan-config-block-element={ScanConfigUIElementDict.StringListInput}
    >
      {!readOnly && (
        <div className="relative">
          <Input
            data-testid="scan-config-control"
            value={draft}
            disabled={disabled}
            placeholder={optional && value === null ? 'Not set' : 'Add a value'}
            onChange={(e) => setDraft(e.target.value)}
            onPressEnter={(e) => {
              e.preventDefault();
              addValue();
            }}
            className="w-full [&_input]:pr-9"
          />

          <SweepIconButton
            label="Add a value"
            testId="scan-config-string-list-add"
            className={cn(
              'absolute top-1/2 right-2 -translate-y-1/2',
              draft.trim() === '' && 'pointer-events-none opacity-50'
            )}
            onClick={addValue}
          >
            <RiAddLine className="size-3.5" />
          </SweepIconButton>
        </div>
      )}

      {readOnly && items.length === 0 && (
        <span className="text-sm text-gray-400 italic">No values</span>
      )}

      {items.length > 0 && (
        <div className="border-neutral-2 rounded-lg border bg-white p-3">
          <div className="flex flex-col gap-1">
            {items.map((item, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: entries are positional and may repeat
                key={`${item}-${index}`}
                className="flex w-full items-center gap-1.5"
              >
                <span className="text-primary-8 min-w-0 flex-1 truncate text-sm">{item}</span>
                {!readOnly && (
                  <SweepIconButton
                    label={`Remove ${item}`}
                    testId="scan-config-string-list-remove"
                    onClick={() => removeAt(index)}
                  >
                    <RiDeleteBinLine className="size-3.5" />
                  </SweepIconButton>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StringListBase;
