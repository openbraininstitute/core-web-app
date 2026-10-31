'use client';

import { DeleteOutlined } from '@ant-design/icons';
import { RiCursorHand } from '@remixicon/react';
import { InputNumber } from 'antd';
import { useSetAtom } from 'jotai';
import { useEffect, useId } from 'react';

import { morphologyLocationsNeuronColor } from '@/features/scan-config/components/color-by/palette';
import {
  type IStoredLocation,
  morphologyLocationsHintHoveredAtom,
  readLocationRows,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type {
  IMorphologyLocationSelection,
  IPerNeuronMorphologyLocationSelection,
} from '@/features/scan-config/types';

/** One row: a SONATA section id plus a normalized offset along it, and its node id per neuron. */
export type IMorphologyLocationPoint = IStoredLocation;

const OFFSET_STEP = 0.05;

/**
 * Renders the `morphology_location_selection` and `per_neuron_morphology_location_selection`
 * UI elements: an editable list of morphology locations, one row per `{ section_id, offset }`,
 * with the `node_id` the point sits on for the per-neuron element.
 *
 * The node and section ids are read-only: they are SONATA indices, not something to recall or
 * type, so a row is created by clicking the neurite in the 3D viewer. The offset along that
 * section stays editable, since it is a fraction anyone can reason about. Rows that cannot
 * round-trip (a per-neuron row without its node id, say) are dropped rather than rendered as
 * blanks: the backend rejects partial points.
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
  paramSchema: IMorphologyLocationSelection | IPerNeuronMorphologyLocationSelection;
}) {
  const perNeuron =
    paramSchema.ui_element === ScanConfigUIElementDict.PerNeuronMorphologyLocationSelection;
  const rows = readLocationRows(value, perNeuron);
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
      data-testid="scan-config-locations"
      data-scan-config-block-element={paramSchema.ui_element}
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
            basal or apical dendrite{perNeuron && ' of any neuron'} to add one, and click it again
            to remove it.
          </span>
        </p>
      )}
      {rows.map((row, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional; two rows may hold identical values
          key={index}
          data-testid="scan-config-location"
          className="flex items-end gap-2 border border-gray-200 p-2"
        >
          {row.node_id !== undefined && (
            <ReadOnlyId
              id={`${fieldId}-node-${index}`}
              label="NODE ID"
              testId="scan-config-location-node"
              value={row.node_id}
              // The same colour the point wears in 3D, so a row can be matched to its neuron.
              swatch={morphologyLocationsNeuronColor(row.node_id)}
            />
          )}
          <ReadOnlyId
            id={`${fieldId}-section-${index}`}
            label="SECTION ID"
            testId="scan-config-location-section"
            value={row.section_id}
          />
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-neutral-3 text-xs" htmlFor={`${fieldId}-offset-${index}`}>
              OFFSET
            </label>
            <InputNumber
              data-testid="scan-config-location-offset"
              id={`${fieldId}-offset-${index}`}
              className="w-full!"
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
              data-testid="scan-config-location-remove"
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

/** An id that comes from the viewer: always disabled, never only when the form is. */
function ReadOnlyId({
  id,
  label,
  testId,
  value,
  swatch,
}: {
  id: string;
  label: string;
  testId: string;
  value: number;
  swatch?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <label className="text-neutral-3 text-xs" htmlFor={id}>
        {label}
      </label>
      <InputNumber
        data-testid={testId}
        id={id}
        // `!` because antd's disabled colour is a more specific selector.
        className="w-full! [&_input]:cursor-default [&_input]:font-medium [&_input]:!text-neutral-10"
        variant="filled"
        controls={false}
        disabled
        value={value}
        prefix={
          swatch ? (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: swatch }}
            />
          ) : undefined
        }
      />
    </div>
  );
}
