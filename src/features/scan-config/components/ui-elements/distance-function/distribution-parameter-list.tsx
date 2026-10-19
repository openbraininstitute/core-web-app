'use client';

import { Radio } from 'antd';
import { useEffect } from 'react';

import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import {
  ParameterMode,
  type TBounds,
  type TOptimizationValue,
  type TParameterMode,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { functionParameterNames } from '@/features/scan-config/components/ui-elements/distance-function/function-parameters';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

import type { ConfigValue } from '@/features/scan-config/types';

/** One `{ name, value }` entry: a parameter name and its fixed/bounds optimisation value. */
export type TDistributionParameter = {
  name: string;
  value: TOptimizationValue;
};

export interface DistributionParameterListProps {
  /** rows to render, already reconciled against the function (one per parameter, in order) */
  rows: readonly TDistributionParameter[];
  /** rows currently in the config, used to detect when `rows` needs to be written back */
  stored: readonly TDistributionParameter[];
  /** emits the full row set with one row's value changed */
  onChange: (next: TDistributionParameter[]) => void;
  disabled?: boolean;
  errorPath?: string;
}

function parseFiniteNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Reads one stored entry's OptimizationValue into the UI view, tolerating partial/old shapes. */
function readValue(raw: ConfigValue): TOptimizationValue {
  const v = isPlainObject(raw) ? raw : {};
  const mode = v.mode === ParameterMode.Bounds ? ParameterMode.Bounds : ParameterMode.Fixed;
  const value = typeof v.value === 'number' ? v.value : null;
  const bounds =
    Array.isArray(v.bounds) && v.bounds.length === 2
      ? ([
          typeof v.bounds[0] === 'number' ? v.bounds[0] : null,
          typeof v.bounds[1] === 'number' ? v.bounds[1] : null,
        ] as TBounds)
      : null;
  return { mode, value, bounds };
}

/** Reads the stored config array (`[{ name, value }]`) into the UI rows, dropping malformed entries. */
export function readParameterRows(raw: ConfigValue): TDistributionParameter[] {
  if (!Array.isArray(raw)) return [];
  return (raw as ConfigValue[]).flatMap((entry) => {
    if (!isPlainObject(entry) || typeof entry.name !== 'string') return [];
    return [{ name: entry.name, value: readValue(entry.value) }];
  });
}

/**
 * The rows to show for a function and its stored values: one per extra `{placeholder}`, in the
 * function's order. A name still present keeps its stored value, a new name gets an empty one, a
 * removed name drops out. Pure, so the dispatcher derives this during render; the list writes it
 * back to the config whenever the set of names differs from what is stored.
 */
export function distributionParameterRows(
  functionText: string,
  stored: readonly TDistributionParameter[]
): TDistributionParameter[] {
  const byName = new Map(stored.map((row) => [row.name, row.value]));
  return functionParameterNames(functionText).map((name) => ({
    name,
    value: byName.get(name) ?? { mode: ParameterMode.Fixed, value: null, bounds: null },
  }));
}

/** A one-line human message for the first incomplete/invalid row, or null when every row is valid. */
export function distributionParameterError(rows: readonly TDistributionParameter[]): string | null {
  for (const { name, value } of rows) {
    if (value.mode === ParameterMode.Fixed) {
      if (value.value === null) return `Set a value for "${name}".`;
    } else {
      const [lo, hi] = value.bounds ?? [null, null];
      if (lo === null || hi === null) return `Set both bounds for "${name}".`;
      if (hi <= lo) return `Max must be greater than min for "${name}".`;
    }
  }
  return null;
}

export function DistributionParameterList({
  rows,
  stored,
  onChange,
  disabled = false,
  errorPath,
}: DistributionParameterListProps) {
  useFieldError(errorPath, distributionParameterError(rows) ?? undefined);

  // The function changed the parameter set: write the reconciled rows back to the config.
  const rowNames = rows.map((row) => row.name).join('\0');
  const storedNames = stored.map((row) => row.name).join('\0');
  useEffect(() => {
    if (rowNames !== storedNames) onChange([...rows]);
  }, [rowNames, storedNames, rows, onChange]);

  const setRow = (index: number, nextValue: TOptimizationValue) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, value: nextValue } : row)));
  };

  const inputClass = (invalid: boolean) =>
    cn(
      'w-full rounded border border-gray-200 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50',
      invalid && 'border-red-500 focus:outline-none'
    );

  if (rows.length === 0) {
    return (
      <p
        data-testid="scan-config-control"
        data-scan-config-block-element={ScanConfigUIElementDict.DistributionParameterList}
        className="text-sm text-gray-500"
      >
        No parameters. Add a {'{placeholder}'} to the function to declare one.
      </p>
    );
  }

  return (
    <ul
      data-testid="scan-config-control"
      data-scan-config-block-element={ScanConfigUIElementDict.DistributionParameterList}
      className="flex flex-col gap-2"
    >
      {rows.map((row, index) => {
        const { name, value: optimizationValue } = row;
        const mode = optimizationValue.mode;
        const [lo, hi] = optimizationValue.bounds ?? [null, null];
        const boundsUnordered = lo !== null && hi !== null && hi <= lo;

        const setMode = (nextMode: TParameterMode) => {
          if (nextMode === mode) return;
          setRow(index, {
            mode: nextMode,
            value: null,
            bounds: nextMode === ParameterMode.Bounds ? [null, null] : null,
          });
        };
        const setValue = (raw: string) =>
          setRow(index, { ...optimizationValue, value: parseFiniteNumber(raw), bounds: null });
        const setBound = (boundIndex: 0 | 1, raw: string) => {
          const current: TBounds = optimizationValue.bounds ?? [null, null];
          const nextBounds: TBounds = [current[0], current[1]];
          nextBounds[boundIndex] = parseFiniteNumber(raw);
          setRow(index, { ...optimizationValue, value: null, bounds: nextBounds });
        };

        return (
          <li
            key={name}
            data-testid={`scan-config-distribution-parameter-${name}`}
            className="flex flex-col gap-2 rounded border border-gray-200 bg-white p-3"
          >
            <span className="text-primary-8 min-w-0 truncate text-sm font-medium">{name}</span>
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
                aria-invalid={optimizationValue.value === null}
                aria-label={`${name} value`}
                className={inputClass(optimizationValue.value === null)}
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
                    aria-invalid={lo === null || boundsUnordered}
                    aria-label={`${name} min`}
                    className={inputClass(lo === null || boundsUnordered)}
                    placeholder="Min"
                    value={lo ?? ''}
                    onChange={(e) => setBound(0, e.target.value)}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    disabled={disabled}
                    aria-invalid={hi === null || boundsUnordered}
                    aria-label={`${name} max`}
                    className={inputClass(hi === null || boundsUnordered)}
                    placeholder="Max"
                    value={hi ?? ''}
                    onChange={(e) => setBound(1, e.target.value)}
                  />
                </div>
                {boundsUnordered && (
                  <p className="text-xs text-red-500">Max must be greater than min.</p>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
