'use client';

import { RiArrowDownSLine } from '@remixicon/react';
import { Checkbox, Radio } from 'antd';
import { Fragment, useState } from 'react';

import {
  hasErrorAt,
  ParameterMode,
  type TBounds,
  type TDistributionOption,
  type TOptimizationValue,
  type TParameterMode,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { ErrorObject } from 'ajv';
import type { ReactNode } from 'react';

/** True when the string parses to a finite number. Empty input is treated as "not yet a value". */
function parseFiniteNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** `null` means "no distribution" (the schema's optional default); shown as the first option. */
const NO_DISTRIBUTION_LABEL = 'No distance distribution';

// Same highlighting the distance-function editor uses: `{placeholder}` tokens and known math calls.
const PLACEHOLDER_RE = /\{\w+\}/g;
const FUNCTION_RE = /\bmath\.\w+|\b(?:float|abs|min|max)\b/g;

/**
 * A read-only, syntax-highlighted rendering of a distance function, mirroring the colors of the
 * editable `DistanceFunctionInput`: `{placeholder}` tokens in blue, math/float/abs/min/max calls in
 * teal. Splits the string on both token kinds and wraps each match in a colored span.
 */
function DistanceFunctionCode({ code }: { code: string }) {
  const tokens: Array<{ start: number; end: number; className: string }> = [];
  for (const m of code.matchAll(PLACEHOLDER_RE)) {
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      className: 'font-semibold text-[#0958d9]',
    });
  }
  for (const m of code.matchAll(FUNCTION_RE)) {
    tokens.push({ start: m.index, end: m.index + m[0].length, className: 'text-[#08979c]' });
  }
  tokens.sort((a, b) => a.start - b.start);

  const parts: Array<{ text: string; className?: string; at: number }> = [];
  let cursor = 0;
  for (const token of tokens) {
    // Skip tokens overlapping an already-emitted one (a placeholder can't also be a function).
    if (token.start < cursor) continue;
    if (token.start > cursor) parts.push({ text: code.slice(cursor, token.start), at: cursor });
    parts.push({
      text: code.slice(token.start, token.end),
      className: token.className,
      at: token.start,
    });
    cursor = token.end;
  }
  if (cursor < code.length) parts.push({ text: code.slice(cursor), at: cursor });

  return (
    <pre className="mt-1 overflow-x-auto rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 font-mono text-xs whitespace-pre-wrap break-all text-gray-700">
      {parts.map((part) => (
        <Fragment key={part.at}>
          {part.className ? <span className={part.className}>{part.text}</span> : part.text}
        </Fragment>
      ))}
    </pre>
  );
}

/** One option's content: the distribution name, and its distance function as a read-only code block. */
function DistributionOptionContent({ name, fn }: { name: string; fn?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-primary-8 text-sm font-bold">{name}</span>
      {fn && <DistanceFunctionCode code={fn} />}
    </div>
  );
}

/**
 * Picker for a parameter's distance distribution, built to look like the `StringSelectionEnhanced`
 * element: a bordered trigger showing the current selection and a popover list of options. Each
 * option shows the distribution name and its python `function` as a read-only, highlighted code
 * block. A leading "No distance distribution" option maps to `null` (the schema's optional default).
 */
function DistributionPicker({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string | null;
  options: readonly TDistributionOption[];
  disabled?: boolean;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? options.find((o) => o.name === value) : undefined;

  const select = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label="Distance distribution"
          disabled={disabled}
          className={cn(
            'flex w-full items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white p-2 text-left',
            disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-300'
          )}
        >
          {value && selected ? (
            <DistributionOptionContent name={selected.name} fn={selected.function} />
          ) : value ? (
            // A stored name with no matching declared distribution: show the raw name.
            <span className="text-primary-8 text-sm font-bold">{value}</span>
          ) : (
            <span className="text-sm text-gray-500">{NO_DISTRIBUTION_LABEL}</span>
          )}
          <RiArrowDownSLine
            className={cn(
              'mt-0.5 size-4 shrink-0 text-gray-500 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-80 w-(--radix-popover-trigger-width) overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-md"
      >
        <div role="listbox" className="flex flex-col gap-1">
          <DistributionOptionRow selected={value === null} onSelect={() => select(null)}>
            <span className="text-primary-8 text-sm font-medium">{NO_DISTRIBUTION_LABEL}</span>
          </DistributionOptionRow>
          {options.map((option) => (
            <DistributionOptionRow
              key={option.name}
              selected={option.name === value}
              onSelect={() => select(option.name)}
            >
              <DistributionOptionContent name={option.name} fn={option.function} />
            </DistributionOptionRow>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A selectable row in the distribution popover; highlights when it is the current selection. */
function DistributionOptionRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'cursor-pointer rounded-lg p-2 text-left',
        selected ? 'bg-gray-100' : 'hover:bg-gray-50'
      )}
    >
      {children}
    </div>
  );
}

/**
 * A single parameter row: a checkbox to include the parameter and, once checked, a fixed/bounds
 * mode selector with the matching number input(s). Switching mode clears the other mode's field(s).
 *
 * Without `onToggle` the row has no checkbox and cannot be removed (e.g. simulation conditions).
 * An input whose value fails schema validation (e.g. empty) gets a red border; bounds that do not
 * increase also get a message saying so.
 */
export function ParameterRow({
  name,
  unit,
  checked,
  disabled,
  errors,
  optimizationValue,
  distribution,
  availableDistributions,
  onToggle,
  onValueChange,
  onDistributionChange,
}: {
  name: string;
  unit: string | null;
  checked: boolean;
  disabled?: boolean;
  /** ajv errors of the row's OptimizationValue, with paths relative to it (e.g. `/bounds/0`) */
  errors: readonly ErrorObject[];
  optimizationValue: TOptimizationValue | null;
  /** the selected distance distribution name, or `null` when none; omit entirely for parameters that have no distribution */
  distribution?: string | null;
  /** custom distributions to choose from (name + python function); omit when the parameter has no distribution */
  availableDistributions?: readonly TDistributionOption[];
  onToggle?: (next: boolean) => void;
  onValueChange: (next: TOptimizationValue) => void;
  onDistributionChange?: (next: string | null) => void;
}) {
  const mode = optimizationValue?.mode ?? ParameterMode.Fixed;
  // ObiOne's keyword on `bounds`: the upper bound must be greater than the lower one
  const boundsUnordered = errors.some((error) => error.keyword === 'strictly_increasing');
  const valueInvalid = hasErrorAt(errors, '/value');
  const lowerInvalid = boundsUnordered || hasErrorAt(errors, '/bounds/0');
  const upperInvalid = boundsUnordered || hasErrorAt(errors, '/bounds/1');
  // no focus outline on an invalid input, or it would hide the red border while typing
  const inputClass = (invalid: boolean) =>
    cn(
      'w-full rounded border border-gray-200 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50',
      invalid && 'border-red-500 focus:outline-none'
    );

  const setMode = (nextMode: TParameterMode) => {
    if (!optimizationValue || nextMode === optimizationValue.mode) return;
    // Switching mode clears the other mode's field(s). Bounds mode seeds an empty pair so each
    // input can mutate its own slot independently.
    onValueChange({
      mode: nextMode,
      value: null,
      bounds: nextMode === ParameterMode.Bounds ? [null, null] : null,
    });
  };

  const setValue = (raw: string) => {
    if (!optimizationValue) return;
    onValueChange({ ...optimizationValue, value: parseFiniteNumber(raw), bounds: null });
  };

  const setBound = (index: 0 | 1, raw: string) => {
    if (!optimizationValue) return;
    const current: TBounds = optimizationValue.bounds ?? [null, null];
    const nextBounds: TBounds = [current[0], current[1]];
    nextBounds[index] = parseFiniteNumber(raw);
    onValueChange({ ...optimizationValue, value: null, bounds: nextBounds });
  };

  return (
    <li
      data-testid={`scan-config-emodel-parameter-${name}`}
      className="flex flex-col gap-2 rounded border border-gray-200 bg-white p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-primary-8 min-w-0 truncate text-sm font-medium">{name}</span>
        <div className="flex shrink-0 items-center gap-3">
          {unit && <span className="text-xs text-gray-500">{unit}</span>}
          {onToggle && (
            <Checkbox
              checked={checked}
              disabled={disabled}
              onChange={(e) => onToggle(e.target.checked)}
            />
          )}
        </div>
      </div>

      {checked && optimizationValue && (
        <div className="flex flex-col gap-2">
          <Radio.Group
            value={mode}
            disabled={disabled}
            onChange={(e) => setMode(e.target.value as TParameterMode)}
            options={[
              { label: 'Fixed', value: ParameterMode.Fixed },
              { label: 'Bounds', value: ParameterMode.Bounds },
            ]}
          />

          {mode === ParameterMode.Fixed ? (
            <input
              type="number"
              inputMode="decimal"
              disabled={disabled}
              aria-invalid={valueInvalid}
              className={inputClass(valueInvalid)}
              placeholder="Value"
              value={optimizationValue.value ?? ''}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  disabled={disabled}
                  aria-invalid={lowerInvalid}
                  className={inputClass(lowerInvalid)}
                  placeholder="Min"
                  value={optimizationValue.bounds?.[0] ?? ''}
                  onChange={(e) => setBound(0, e.target.value)}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  disabled={disabled}
                  aria-invalid={upperInvalid}
                  className={inputClass(upperInvalid)}
                  placeholder="Max"
                  value={optimizationValue.bounds?.[1] ?? ''}
                  onChange={(e) => setBound(1, e.target.value)}
                />
              </div>
              {boundsUnordered && (
                <p className="text-xs text-red-500">Max must be greater than min.</p>
              )}
            </>
          )}

          {distribution !== undefined && availableDistributions && onDistributionChange && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Distance distribution</span>
              <DistributionPicker
                value={distribution}
                options={availableDistributions}
                disabled={disabled}
                onChange={onDistributionChange}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
