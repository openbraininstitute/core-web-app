'use client';

import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Input } from 'antd';
import { useState } from 'react';

import { SweepIconButton } from '@/features/scan-config/components/ui-elements/parameter-sweep';

import type { TScanConfigUIElementDict } from '@/features/scan-config/types';

export interface IStringListProps {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  /** Disabled fields render as a plain, controls-free list (no add input, no delete buttons). */
  disabled?: boolean;
  /** Which block-element the mounting wrapper represents, for scan-config selectors. */
  blockElement: TScanConfigUIElementDict;
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
  blockElement,
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
    <div className="flex w-full flex-col gap-1" data-scan-config-block-element={blockElement}>
      {!disabled && (
        <div className="relative">
          <Input
            data-testid="scan-config-control"
            value={draft}
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
            disabled={draft.trim() === ''}
            className="absolute top-1/2 right-2 -translate-y-1/2"
            onClick={addValue}
          >
            <RiAddLine className="size-3.5" />
          </SweepIconButton>
        </div>
      )}

      {disabled && items.length === 0 && (
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
                {!disabled && (
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
