'use client';

import { Input } from '@/ui/molecules/input';

import type { EntityImportActions } from '../../core/adapter';
import type { ImportCellState, ImportRowState } from '../../core/contracts';

export interface LocationValue {
  x?: number | null;
  y?: number | null;
  z?: number | null;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? '' : String(value);
}

function summarizeLocation(location: LocationValue | null): string {
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
  cell: ImportCellState;
  row: ImportRowState;
  fieldPath: string;
  actions: EntityImportActions;
}

export function LocationEditor({ cell, row, fieldPath, actions }: LocationEditorProps) {
  const location =
    (cell.parsedValue as LocationValue | null) ?? parseLocationSummary(cell.rawValue) ?? null;

  const updateCoordinate = (key: keyof LocationValue, nextValue: string) => {
    const numericValue = nextValue === '' ? null : Number(nextValue);
    const nextLocation: LocationValue = {
      x: location?.x ?? null,
      y: location?.y ?? null,
      z: location?.z ?? null,
      [key]: Number.isNaN(numericValue) ? null : numericValue,
    };

    actions.setCustomValue({
      rowId: row.id,
      fieldPath,
      rawValue: summarizeLocation(nextLocation),
      parsedValue: nextLocation,
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(['x', 'y', 'z'] as const).map((axis) => (
        <div key={axis} className="block">
          <label
            className="mb-2 block text-sm font-medium text-neutral-700"
            htmlFor={`location-${row.id}-${axis}`}
          >
            {axis.toUpperCase()}
          </label>
          <Input
            id={`location-${row.id}-${axis}`}
            type="number"
            className="h-11"
            value={formatNumber(location?.[axis] ?? null)}
            onChange={(event) => updateCoordinate(axis, event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
