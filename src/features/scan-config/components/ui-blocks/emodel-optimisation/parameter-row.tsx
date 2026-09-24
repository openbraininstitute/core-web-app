'use client';

import { Checkbox, Radio } from 'antd';

import {
  hasErrorAt,
  ParameterMode,
  type TBounds,
  type TOptimizationValue,
  type TParameterMode,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { cn } from '@/utils/css-class';

import type { ErrorObject } from 'ajv';

/** True when the string parses to a finite number. Empty input is treated as "not yet a value". */
function parseFiniteNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
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
  onToggle,
  onValueChange,
}: {
  name: string;
  unit: string | null;
  checked: boolean;
  disabled?: boolean;
  /** ajv errors of the row's OptimizationValue, with paths relative to it (e.g. `/bounds/0`) */
  errors: readonly ErrorObject[];
  optimizationValue: TOptimizationValue | null;
  onToggle?: (next: boolean) => void;
  onValueChange: (next: TOptimizationValue) => void;
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
    <li className="flex flex-col gap-2 rounded border border-gray-200 bg-white p-3">
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
        </div>
      )}
    </li>
  );
}
