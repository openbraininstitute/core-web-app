'use client';

import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { useState } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { FancyField, FancyInput } from '@/ui/molecules/fancy-input';

import type { FancyChrome } from '@/ui/molecules/fancy-input';

export interface IStringListInputProps {
  /** current list value from config */
  value: string[];
  /** writes the next list back to config */
  onChange: (value: string[]) => void;
  disabled?: boolean;
  /** when true, render only the list of values — no input, add, or delete controls */
  readOnly?: boolean;
  chrome?: FancyChrome;
}

/**
 * Editor for the `string_list_input` schema UI element: a free-form list of strings.
 *
 * Type a value and press Enter or + to append it; every entry is a nested input inside the same
 * field, editable in place and removable. Every change writes the full next array straight to the
 * live config via `onChange`. In `readOnly` mode it renders just the list of values.
 */
export function StringListInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  chrome,
}: IStringListInputProps) {
  const [draft, setDraft] = useState('');

  const addValue = () => {
    const next = draft.trim();
    if (!next) return;
    onChange([...value, next]);
    setDraft('');
  };

  if (readOnly) {
    return (
      <div data-scan-config-block-element={ScanConfigUIElementDict.StringListInput}>
        <FancyField {...chrome} disabled={disabled}>
          <ul className="flex flex-col gap-1 px-3 py-2 text-sm text-primary-9">
            {value.length === 0 && <li className="text-neutral-4 italic">No values</li>}
            {value.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: entries are positional and may repeat
              <li key={`${item}-${index}`} className="truncate">
                {item}
              </li>
            ))}
          </ul>
        </FancyField>
      </div>
    );
  }

  return (
    <div data-scan-config-block-element={ScanConfigUIElementDict.StringListInput}>
      <FancyInput
        {...chrome}
        value={draft}
        disabled={disabled}
        placeholder="Add a value"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          addValue();
        }}
        actions={[
          {
            key: 'add',
            label: 'Add value',
            icon: <RiAddLine className="size-4" />,
            onClick: addValue,
          },
        ]}
      >
        {value.length > 0 &&
          value.map((item, index) => (
            <FancyInput
              // biome-ignore lint/suspicious/noArrayIndexKey: entries are positional and may repeat
              key={index}
              aria-label={`Value ${index + 1}`}
              value={item}
              disabled={disabled}
              onChange={(e) => onChange(value.map((v, i) => (i === index ? e.target.value : v)))}
              actions={[
                {
                  key: 'remove',
                  label: `Remove ${item}`,
                  icon: <RiDeleteBinLine className="size-4" />,
                  onClick: () => onChange(value.filter((_, i) => i !== index)),
                },
              ]}
            />
          ))}
      </FancyInput>
    </div>
  );
}
