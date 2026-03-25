'use client';

import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';

import type { EntityImportActions } from '@/features/entity-import/core/adapter';
import type { IImportCellState, IImportRowState } from '@/features/entity-import/core/contracts';

export interface LocationValue {
  x?: number | null;
  y?: number | null;
  z?: number | null;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? '' : String(value);
}

export function summarizeLocation(location: LocationValue | null): string {
  if (!location) {
    return '';
  }

  const values = [location.x, location.y, location.z].filter(
    (value) => value !== null && value !== undefined && !Number.isNaN(value)
  );

  if (values.length === 0) {
    return '';
  }

  return [location.x, location.y, location.z]
    .map((value) => (value === null || value === undefined || Number.isNaN(value) ? '' : value))
    .join(', ');
}

export function parseLocationSummary(summary: string): LocationValue | null {
  const parts = summary
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 3) {
    return null;
  }

  const [x, y, z] = parts.map((part) => Number(part));
  if ([x, y, z].some((value) => Number.isNaN(value))) {
    return null;
  }

  return { x, y, z };
}

interface LocationEditorProps {
  cell: IImportCellState;
  row: IImportRowState;
  fieldPath: string;
  actions: EntityImportActions;
  mode?: 'table' | 'panel';
  value?: LocationValue | null;
  onChange?: (value: LocationValue) => void;
}

const LOCATION_AXES = ['x', 'y', 'z'] as const;

export function LocationEditor({
  cell,
  row,
  fieldPath,
  actions,
  mode = 'panel',
  value,
  onChange,
}: LocationEditorProps) {
  const location =
    value ??
    (cell.parsedValue as LocationValue | null) ??
    parseLocationSummary(cell.rawValue) ??
    null;

  const emitChange = (nextLocation: LocationValue) => {
    if (onChange) {
      onChange(nextLocation);
      return;
    }

    actions.setCustomValue({
      rowId: row.id,
      fieldPath,
      rawValue: summarizeLocation(nextLocation),
      parsedValue: nextLocation,
    });
  };

  const updateCoordinate = (key: keyof LocationValue, nextValue: string) => {
    const numericValue = nextValue === '' ? null : Number(nextValue);
    const nextLocation: LocationValue = {
      x: location?.x ?? null,
      y: location?.y ?? null,
      z: location?.z ?? null,
      [key]: Number.isNaN(numericValue) ? null : numericValue,
    };

    emitChange(nextLocation);
  };

  return (
    <div
      data-testid={mode === 'table' ? 'location-editor-table' : 'location-editor-panel'}
      className={cn(
        mode === 'table'
          ? 'flex h-full min-h-[52px] w-full items-stretch overflow-hidden rounded-none border-0 bg-transparent'
          : 'grid grid-cols-3 gap-4 px-4'
      )}
    >
      {LOCATION_AXES.map((axis) => (
        <div
          key={axis}
          className={cn(
            mode === 'table'
              ? 'flex min-w-0 flex-1 flex-col justify-center border-r border-neutral-200 px-2 py-1 last:border-r-0'
              : 'block'
          )}
        >
          <label
            className={cn(
              'mb-auto flex',
              mode === 'table'
                ? 'mb-1 flex-col  gap-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400'
                : 'mb-2 flex-row  gap-1 items-center text-sm font-medium text-neutral-700'
            )}
            htmlFor={`location-${row.id}-${axis}`}
          >
            <div className=" text-primary-9">{axis.toUpperCase()}</div>
            <div className="text-neutral-400 text-[9px] leading-none">(microns)</div>
          </label>
          <Input
            id={`location-${row.id}-${axis}`}
            aria-label={`Location ${axis.toUpperCase()} row ${row.rowIndex + 1}`}
            type="number"
            className={cn(
              'text-base font-bold text-primary-9 self-end justify-self-end mt-auto',
              mode === 'table'
                ? 'h-8 min-w-0 rounded-lg border border-neutral-200 px-2 text-center shadow-none focus-visible:border-primary-6 focus-visible:ring-0'
                : 'h-11 rounded-xl text-base shadow-none focus-visible:border-primary-6 focus-visible:ring-0'
            )}
            value={formatNumber(location?.[axis] ?? null)}
            onFocus={() => actions.selectCell({ rowId: row.id, fieldPath })}
            onChange={(event) => updateCoordinate(axis, event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
