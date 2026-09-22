'use client';

import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Input } from 'antd';
import { useState } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

export interface IStringListInputProps {
  /** current list value from config */
  value: string[];
  /** writes the next list back to config */
  onChange: (value: string[]) => void;
  disabled?: boolean;
  /** when true, render only the list of values — no input, add, or delete controls */
  readOnly?: boolean;
}

/**
 * Editor for the `string_list_input` schema UI element: a free-form list of strings.
 *
 * Type a value and Add appends it to the list; the trash icon removes an entry. Every add/remove
 * writes the full next array straight to the live config via `onChange`. In `readOnly` mode it
 * renders just the list of values with no controls.
 */
export function StringListInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: IStringListInputProps) {
  const [draft, setDraft] = useState('');

  const addValue = () => {
    const next = draft.trim();
    if (!next) return;
    onChange([...value, next]);
    setDraft('');
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div
      className="flex w-full flex-col gap-2"
      data-scan-config-block-element={ScanConfigUIElementDict.StringListInput}
    >
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            disabled={disabled}
            placeholder="Add a value"
            onChange={(e) => setDraft(e.target.value)}
            onPressEnter={(e) => {
              e.preventDefault();
              addValue();
            }}
          />
          <button
            type="button"
            disabled={disabled || draft.trim() === ''}
            onClick={addValue}
            aria-label="Add value"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-200',
              'text-primary-8 bg-white transition-colors hover:bg-gray-100',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <RiAddLine className="size-4" />
          </button>
        </div>
      )}

      {readOnly && value.length === 0 && (
        <span className="text-sm text-gray-400 italic">No values</span>
      )}

      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {value.map((item, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: entries are positional and may repeat
              key={`${item}-${index}`}
              className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2"
            >
              <span className="text-primary-8 min-w-0 truncate text-sm">{item}</span>
              {!readOnly && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${item}`}
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400',
                    'transition-colors hover:bg-gray-100 hover:text-red-500',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  <RiDeleteBinLine className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
