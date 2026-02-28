'use client';

import { isNil } from 'es-toolkit/compat';
import { useCallback, useEffect, useState } from 'react';

import { renderMathInText } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers';
import { cn } from '@/utils/css-class';

import type { SectionListEntry } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';

// TODO: re-enable array support when multi-value sweep when obi-one enabled it
// export type SectionValue = number | number[];
export type SectionValue = number;

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
          value={values[entry.section_list] ?? null}
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
  value: SectionValue | null;
  onChange: (v: SectionValue) => void;
  disabled: boolean;
}) {
  const [min, max] = entry.limits ?? [undefined, undefined];
  const [draft, setDraft] = useState(value !== null ? String(value) : '');

  // sync draft when the external value changes (e.g. variable selection reset)
  useEffect(() => {
    setDraft(value !== null ? String(value) : '');
  }, [value]);

  const validate = useCallback(
    (v: number): string | undefined => {
      if (!isNil(min) && v < min) return `Min: ${min}`;
      if (!isNil(max) && v > max) return `Max: ${max}`;
      return undefined;
    },
    [min, max]
  );

  const error = value !== null ? validate(value) : undefined;

  const commitValue = () => {
    const num = Number(draft);
    if (draft.trim() === '' || Number.isNaN(num)) {
      // reset to last valid value if empty or invalid
      setDraft(value !== null ? String(value) : '');
      return;
    }
    onChange(num);
  };

  // TODO: re-enable multi-value support when sweep is needed
  // const valuesArray: number[] = Array.isArray(value) ? value : [value];
  // const [draft, setDraft] = useState('');
  // const inputRef = useRef<HTMLInputElement>(null);
  // const [isAdding, setIsAdding] = useState(false);
  // const commitDraft = () => { ... };
  // const removeBadge = (index: number) => { ... };
  // const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { ... };
  // const handlePlusClick = () => { ... };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-gray-300 ',
            'bg-white px-2.5 py-0.5 text-sm font-semibold text-primary-8'
          )}
        >
          {entry.section_list}
        </span>
        <span className="text-sm text-gray-400">
          {!isNil(entry.value)
            ? `Default: ${entry.value}${entry.units ? ` ${renderMathInText(entry.units)}` : ''}`
            : renderMathInText(entry.units) || ''}
        </span>
      </div>

      <div
        className={cn(
          'flex min-h-9 w-full items-center gap-1.5 rounded-md border px-2 py-1.5',
          'border-gray-300 bg-background transition-shadow focus-within:ring-1 focus-within:ring-primary-9',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-red-400 focus-within:ring-red-400/30'
        )}
      >
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitValue();
            }
          }}
          disabled={disabled}
          min={min}
          max={max}
          step="any"
          placeholder="Enter value…"
          className={cn(
            'min-w-15 flex-1 border-none bg-transparent py-0.5 text-base font-bold ',
            'text-primary-8 outline-none placeholder:text-label placeholder:font-light ',
            '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]'
          )}
        />
      </div>
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}
