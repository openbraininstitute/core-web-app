'use client';

import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { isNil } from 'es-toolkit/compat';
import { type KeyboardEvent, useCallback, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import type { SectionListEntry } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';

export type SectionValue = number | number[];

export interface SectionListEditorProps {
  sectionLists: SectionListEntry[];
  values: Record<string, SectionValue>;
  onChange: (sectionList: string, value: SectionValue) => void;
  disabled?: boolean;
}

export function SectionListConfigEditor({
  sectionLists,
  values,
  onChange,
  disabled = false,
}: SectionListEditorProps) {
  return (
    <div className="mt-3 space-y-4 p-1">
      {sectionLists.map((entry) => (
        <SectionConfigRow
          key={entry.section_list}
          entry={entry}
          value={values[entry.section_list] ?? entry.value ?? 0}
          onChange={(v) => onChange(entry.section_list, v)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function SectionConfigRow({
  entry,
  value,
  onChange,
  disabled,
}: {
  entry: SectionListEntry;
  value: SectionValue;
  onChange: (v: SectionValue) => void;
  disabled: boolean;
}) {
  const valuesArray: number[] = Array.isArray(value) ? value : [value];
  const [min, max] = entry.limits ?? [undefined, undefined];
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [isAdding, setIsAdding] = useState(false);

  const validate = useCallback(
    (v: number): string | undefined => {
      if (!isNil(min) && v < min) return `Min: ${min}`;
      if (!isNil(max) && v > max) return `Max: ${max}`;
      return undefined;
    },
    [min, max]
  );

  const errors = valuesArray
    .map((v, i) => {
      const err = validate(v);
      return err ? `${entry.section_list}[${i}]: ${err}` : null;
    })
    .filter(Boolean);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setIsAdding(false);
      return;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num)) return;
    onChange([...valuesArray, num]);
    setDraft('');
    setIsAdding(false);
  };

  const removeBadge = (index: number) => {
    const updated = valuesArray.filter((_, i) => i !== index);
    onChange(updated.length === 1 ? updated[0] : updated.length === 0 ? 0 : updated);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft('');
      setIsAdding(false);
    }
    if (e.key === 'Backspace' && draft === '' && valuesArray.length > 0) {
      e.preventDefault();
      removeBadge(valuesArray.length - 1);
    }
  };

  const handlePlusClick = () => {
    setIsAdding(true);
    // Focus the input after it renders
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-sm font-semibold capitalize text-primary-8">
          {entry.section_list}
        </span>
        <span className="text-sm text-gray-400">
          {!isNil(entry.value)
            ? `Default: ${entry.value}${entry.units ? ` ${entry.units}` : ''}`
            : entry.units || ''}
        </span>
      </div>

      <div
        className={cn(
          'flex min-h-9 w-full items-center gap-1.5 rounded-md border px-2 py-1.5',
          'border-gray-300 bg-background transition-shadow focus-within:ring-1 focus-within:ring-gray-300/30',
          disabled && 'cursor-not-allowed opacity-50',
          errors.length > 0 && 'border-red-400 focus-within:ring-red-400/30'
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {valuesArray.map((v, i) => (
            <span
              key={`${entry.section_list}-${i}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm',
                'bg-gray-200 text-primary-8',
                validate(v) && 'bg-red-50 text-red-600'
              )}
            >
              {v}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBadge(i);
                  }}
                  className="ml-0.5 rounded-full p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
                  aria-label={`Remove ${v} from ${entry.section_list}`}
                >
                  <CloseOutlined className="text-[10px]" />
                </button>
              )}
            </span>
          ))}

          {isAdding && !disabled && (
            <input
              ref={inputRef}
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitDraft}
              min={min}
              max={max}
              step="any"
              placeholder="Value…"
              className="min-w-[60px] flex-1 border-none bg-transparent py-0.5 text-sm text-primary-8 outline-none placeholder:text-gray-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          )}
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={handlePlusClick}
            className="shrink-0 flex items-center justify-center size-6 rounded-full transition-colors hover:bg-gray-200 hover:text-primary-8"
            aria-label={`Add value for ${entry.section_list}`}
          >
            <PlusOutlined className="text-sm text-primary-9" />
          </button>
        )}
      </div>
      {errors.length > 0 && <div className="mt-1 text-xs text-red-500">{errors.join(' · ')}</div>}
    </div>
  );
}
