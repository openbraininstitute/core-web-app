'use client';

import { DeleteOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import { useId } from 'react';

import {
  type IStoredLocation,
  readLocationRows,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { IMorphologyLocationSelection as MorphologyLocationSelectionSchema } from '@/features/scan-config/types';

/** One row: a SONATA section id plus a normalized offset along it. */
export type IMorphologyLocationPoint = IStoredLocation;

const OFFSET_STEP = 0.05;

/**
 * Read the stored value into rows. Anything that is not a `{section_id, offset}` object is
 * dropped rather than rendered as a blank row: the backend rejects partial points, so a row
 * that cannot round-trip would be a trap rather than a starting point.
 */

/**
 * Renders the `morphology_location_selection` UI element: an editable list of morphology
 * locations, one row per `{ section_id, offset }`.
 *
 * The section id is read-only: it is a SONATA index into the morphology, not something to
 * recall or type, so a row is created by clicking the neurite in the 3D viewer. The offset
 * along that section stays editable, since it is a fraction anyone can reason about.
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
  const rows = readLocationRows(value);
  const offsetSchema = paramSchema.items?.properties?.offset;
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
            {/* Always disabled, never only when the form is: the id comes from the viewer. */}
            <InputNumber
              id={`${fieldId}-section-${index}`}
              // `!` because antd's disabled colour is a more specific selector.
              className="w-full [&_input]:cursor-default [&_input]:font-medium [&_input]:!text-neutral-10"
              variant="filled"
              controls={false}
              disabled
              value={row.section_id}
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
        <p className="text-neutral-3 text-xs">
          Click a basal or apical dendrite in the 3D viewer to add a location. Click a location
          again to remove it.
        </p>
      )}
    </div>
  );
}
