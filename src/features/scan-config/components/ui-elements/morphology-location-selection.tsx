'use client';

import { RiCursorHand, RiDeleteBinLine } from '@remixicon/react';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

import {
  type IStoredLocation,
  morphologyLocationsHintHoveredAtom,
  readLocationRows,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { FancyField, FancyInput, FancyNumberInput } from '@/ui/molecules/fancy-input';

import type { IMorphologyLocationSelection as MorphologyLocationSelectionSchema } from '@/features/scan-config/types';
import type { FancyChrome } from '@/ui/molecules/fancy-input';

/** One row: a SONATA section id plus a normalized offset along it. */
export type IMorphologyLocationPoint = IStoredLocation;

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
  chrome,
}: {
  value: unknown;
  onChange: (value: IMorphologyLocationPoint[]) => void;
  disabled: boolean;
  paramSchema: MorphologyLocationSelectionSchema;
  chrome?: FancyChrome;
}) {
  const rows = readLocationRows(value);
  const offsetSchema = paramSchema.items?.properties?.offset;
  const sectionSchema = paramSchema.items?.properties?.section_id;
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
      data-testid="scan-config-locations"
      data-scan-config-block-element={ScanConfigUIElementDict.MorphologyLocationSelection}
    >
      <FancyField {...chrome} group disabled={disabled}>
        <div className="flex flex-col gap-3 px-2 pt-4 pb-2">
          {!disabled && (
            <p
              className="flex items-start gap-2 rounded-lg bg-primary-0 p-2.5 text-sm text-primary-9"
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
              data-testid="scan-config-location"
              className="flex items-start gap-2"
            >
              {/* Always read-only, never only when the form is: the id comes from the viewer. */}
              <FancyInput
                className="flex-1"
                label={sectionSchema?.title ?? 'Section ID'}
                labelInfo={sectionSchema?.description}
                data-testid="scan-config-location-section"
                readOnly
                tabIndex={-1}
                value={String(row.section_id)}
                classNames={{ fieldset: 'bg-neutral-1', input: 'cursor-default font-medium' }}
              />
              <FancyNumberInput
                className="flex-1"
                label={offsetSchema?.title ?? 'Offset'}
                labelInfo={offsetSchema?.description}
                data-testid="scan-config-location-offset"
                disabled={disabled}
                validationRules={{
                  min: offsetSchema?.minimum ?? 0,
                  max: offsetSchema?.maximum ?? 1,
                }}
                value={row.offset}
                onValueChange={(next) => next !== null && update(index, { offset: next })}
                actions={
                  !disabled && rows.length > 1
                    ? [
                        {
                          key: 'remove',
                          'data-testid': 'scan-config-location-remove',
                          label: `Remove location ${index + 1}`,
                          icon: <RiDeleteBinLine className="size-3.5" />,
                          onClick: () => onChange(rows.toSpliced(index, 1)),
                        },
                      ]
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </FancyField>
    </div>
  );
}
