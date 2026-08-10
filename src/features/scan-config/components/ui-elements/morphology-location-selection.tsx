'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import { useId } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { IMorphologyLocationSelection as MorphologyLocationSelectionSchema } from '@/features/scan-config/types';

/** One `IMorphologyLocationPoint`: a SONATA section id plus a normalized offset along it. */
export interface IMorphologyLocationPoint {
  section_id: number;
  offset: number;
}

/** Soma, at its origin — valid on every morphology, so it is a safe row to add. */
const SOMA_LOCATION: IMorphologyLocationPoint = { section_id: 0, offset: 0 };

const OFFSET_STEP = 0.05;

/**
 * Read the stored value into rows. Anything that is not a `{section_id, offset}` object is
 * dropped rather than rendered as a blank row: the backend rejects partial points, so a row
 * that cannot round-trip would be a trap rather than a starting point.
 */
function toRows(value: unknown): IMorphologyLocationPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const { section_id: sectionId, offset } = entry as Record<string, unknown>;
    if (typeof sectionId !== 'number' || typeof offset !== 'number') return [];
    return [{ section_id: sectionId, offset }];
  });
}

/**
 * Renders the `morphology_location_selection` UI element: an editable list of morphology
 * locations, one row per `{ section_id, offset }`.
 *
 * Section ids use SONATA numbering — `0` is the soma, neurites follow in `nrn_order`. That is
 * the same id the circuit viewer reports as `sonata_section_id`, so a viewer selection can be
 * written into a row unchanged once picking lands.
 *
 * The backend requires at least one location (`min_length=1`), so the last row cannot be
 * removed; clearing the list entirely would produce a config the API rejects.
 */
export default function MorphologyLocationSelection({
  value,
  onChange,
  disabled,
  paramSchema,
}: {
  value: unknown;
  onChange: (value: IMorphologyLocationPoint[]) => void;
  disabled: boolean;
  paramSchema: MorphologyLocationSelectionSchema;
}) {
  const rows = toRows(value);
  const offsetSchema = paramSchema.items?.properties?.offset;
  const sectionIdSchema = paramSchema.items?.properties?.section_id;
  // antd renders its own inner <input>, so labels need an explicit htmlFor to bind to it.
  const fieldId = useId();

  const update = (index: number, patch: Partial<IMorphologyLocationPoint>) =>
    onChange(rows.with(index, { ...rows[index], ...patch }));

  return (
    <div
      className="flex flex-col gap-2"
      data-scan-config-block-element={ScanConfigUIElementDict.MorphologyLocationSelection}
    >
      {rows.map((row, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional; two rows may hold identical values
          key={index}
          className="flex items-end gap-2 border border-gray-200 p-2"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-neutral-3 text-xs" htmlFor={`${fieldId}-section-${index}`}>
              SECTION ID
            </label>
            <InputNumber
              id={`${fieldId}-section-${index}`}
              className="w-full"
              disabled={disabled}
              min={sectionIdSchema?.minimum ?? 0}
              step={1}
              precision={0}
              value={row.section_id}
              onChange={(next) =>
                typeof next === 'number' && update(index, { section_id: Math.round(next) })
              }
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-neutral-3 text-xs" htmlFor={`${fieldId}-offset-${index}`}>
              OFFSET
            </label>
            <InputNumber
              id={`${fieldId}-offset-${index}`}
              className="w-full"
              disabled={disabled}
              min={offsetSchema?.minimum ?? 0}
              max={offsetSchema?.maximum ?? 1}
              step={OFFSET_STEP}
              value={row.offset}
              onChange={(next) => typeof next === 'number' && update(index, { offset: next })}
            />
          </div>
          {!disabled && rows.length > 1 && (
            <button
              type="button"
              className="pb-2 text-red-500"
              aria-label={`Remove location ${index + 1}`}
              onClick={() => onChange(rows.toSpliced(index, 1))}
            >
              <DeleteOutlined />
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          className="mt-1 flex min-h-[40px] min-w-[150px] items-center justify-between self-end rounded-full border border-gray-200 px-3 py-2 font-bold text-primary-8"
          onClick={() => onChange([...rows, rows.at(-1) ?? SOMA_LOCATION])}
        >
          Add location
          <PlusOutlined className="text-primary-8!" />
        </button>
      )}
    </div>
  );
}
