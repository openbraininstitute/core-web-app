'use client';

import { DeleteOutlined } from '@ant-design/icons';
import { RiCursorHand } from '@remixicon/react';
import { InputNumber } from 'antd';
import { useSetAtom } from 'jotai';
import { useEffect, useId } from 'react';

import {
  type IStoredLocation,
  morphologyLocationsHintHoveredAtom,
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
  // Pointing at the hint nudges the 3D viewer, so the two panes read as one feature.
  // Only while the list is empty: once a point exists the user has found the viewer, and a
  // cue that keeps firing is noise.
  const setHintHovered = useSetAtom(morphologyLocationsHintHoveredAtom);
  const nudgeOnHover = rows.length === 0;
  useEffect(() => () => setHintHovered(false), [setHintHovered]);
  useEffect(() => {
    if (!nudgeOnHover) setHintHovered(false);
  }, [nudgeOnHover, setHintHovered]);

  const update = (index: number, patch: Partial<IMorphologyLocationPoint>) =>
    onChange(rows.with(index, { ...rows[index], ...patch }));

  return (
    <div
      className="flex flex-col gap-2"
      data-scan-config-block-element={ScanConfigUIElementDict.MorphologyLocationSelection}
    >
      {!disabled && (
        <p
          className="flex items-start gap-2 rounded-md bg-primary-0 p-2.5 text-sm text-primary-9"
          onMouseEnter={() => nudgeOnHover && setHintHovered(true)}
          onMouseLeave={() => setHintHovered(false)}
        >
          <RiCursorHand className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Add locations from the 3D viewer.</strong> Click a
            basal or apical dendrite to add one, and click it again to remove it.
          </span>
        </p>
      )}
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
    </div>
  );
}
