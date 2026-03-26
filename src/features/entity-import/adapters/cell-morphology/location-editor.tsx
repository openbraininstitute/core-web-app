'use client';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';

import type { IEntityImportActions } from '@/features/entity-import/core/adapter';
import type { IImportCellState, IImportRowState } from '@/features/entity-import/core/contracts';

export interface LocationValue {
  x?: number | null;
  y?: number | null;
  z?: number | null;
}

function normalizeCoordinateValue(value: unknown): number | null | undefined {
  if (value === null || value === undefined) {
    return value as null | undefined;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  return undefined;
}

export function normalizeLocationValue(value: unknown): LocationValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const x = normalizeCoordinateValue(candidate.x);
  const y = normalizeCoordinateValue(candidate.y);
  const z = normalizeCoordinateValue(candidate.z);

  if (x === undefined && y === undefined && z === undefined) {
    return null;
  }

  return {
    x: x ?? null,
    y: y ?? null,
    z: z ?? null,
  };
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
  actions: IEntityImportActions;
  mode?: 'table' | 'panel';
  value?: LocationValue | null;
  onChange?: (value: LocationValue) => void;
}

const LOCATION_AXES = ['x', 'y', 'z'] as const;

function resolveLocationValue(parsedValue: unknown, rawValue: string): LocationValue | null {
  return normalizeLocationValue(parsedValue) ?? parseLocationSummary(rawValue) ?? null;
}

export function LocationEditor({
  cell,
  row,
  fieldPath,
  actions,
  mode = 'panel',
  value,
  onChange,
}: LocationEditorProps) {
  const location = value ?? resolveLocationValue(cell.parsedValue, cell.rawValue) ?? null;
  const correctionDraft = mode === 'table' ? cell.correctionDraft : null;
  const previousLocation = correctionDraft
    ? resolveLocationValue(correctionDraft.previousParsedValue, correctionDraft.previousRawValue)
    : null;
  const stagedLocation = correctionDraft
    ? (normalizeLocationValue(
        (correctionDraft.suggestion.metadata as { parsedValue?: unknown } | undefined)?.parsedValue
      ) ?? resolveLocationValue(null, correctionDraft.suggestion.label))
    : null;

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

  if (mode === 'table' && correctionDraft) {
    return (
      <div
        data-testid="location-editor-table"
        className="flex h-full min-h-[96px] w-full flex-col overflow-hidden bg-transparent"
      >
        <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
          {LOCATION_AXES.map((axis) => (
            <div
              key={axis}
              className="flex min-w-0 flex-1 flex-col border-r border-neutral-200 px-2 py-1.5 last:border-r-0"
            >
              <label
                className="mb-1 flex flex-col gap-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400"
                htmlFor={`location-${row.id}-${axis}`}
              >
                <div className="text-primary-9">{axis.toUpperCase()}</div>
                <div className="text-[9px] leading-none text-neutral-400">(microns)</div>
              </label>
              <div
                title="Original value"
                className="mb-1 min-h-7 rounded-md border border-amber-600 bg-amber-600/16 px-2 py-1 text-center text-xs font-medium text-amber-950 line-through"
              >
                {formatNumber(previousLocation?.[axis] ?? null) || '—'}
              </div>
              <Input
                id={`location-${row.id}-${axis}`}
                aria-label={`Location ${axis.toUpperCase()} row ${row.rowIndex + 1}`}
                type="number"
                readOnly
                className="mt-auto h-8 min-w-0 rounded-lg border border-green-main/30 bg-green-main/10 px-2 text-center text-base font-bold text-green-main shadow-none focus-visible:ring-0"
                value={formatNumber(stagedLocation?.[axis] ?? null)}
                onClick={() => actions.selectCell({ rowId: row.id, fieldPath })}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 border-t border-neutral-200 px-2 py-1.5">
          <Button
            rounded
            type="button"
            variant="icon"
            className="shrink-0 rounded-full border border-green-main p-0 group hover:bg-green-main size-6 [&_svg]:size-3!"
            aria-label={`Accept suggested Location row ${row.rowIndex + 1}`}
            onClick={(event) => {
              event.stopPropagation();
              actions.acceptCorrection({ rowId: row.id, fieldPath });
            }}
          >
            <CheckOutlined className="text-green-main! group-hover:text-white!" />
          </Button>
          <Button
            rounded
            type="button"
            variant="icon"
            className="shrink-0 rounded-full border border-destructive p-0 group hover:bg-destructive size-6 [&_svg]:size-3!"
            aria-label={`Reject suggested Location row ${row.rowIndex + 1}`}
            onClick={(event) => {
              event.stopPropagation();
              actions.rejectCorrection({ rowId: row.id, fieldPath });
            }}
          >
            <CloseOutlined className="text-destructive! group-hover:text-white!" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={mode === 'table' ? 'location-editor-table' : 'location-editor-panel'}
      className={cn(
        mode === 'table'
          ? 'flex h-full min-h-[52px] w-full flex-col overflow-hidden rounded-none border-0 bg-transparent'
          : 'space-y-3 px-4'
      )}
    >
      <div
        className={cn(
          mode === 'table'
            ? 'flex h-full min-h-[52px] w-full items-stretch overflow-hidden'
            : 'grid grid-cols-3 gap-4'
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
              value={formatNumber(
                (mode === 'table' && correctionDraft ? stagedLocation : location)?.[axis] ?? null
              )}
              onFocus={() => actions.selectCell({ rowId: row.id, fieldPath })}
              onChange={(event) => updateCoordinate(axis, event.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
