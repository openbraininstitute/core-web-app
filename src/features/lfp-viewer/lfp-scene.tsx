'use client';

import { Slider } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import {
  formatUv,
  hexAt,
  levelOf,
  positionOfLevel,
  SCALE_GRADIENT,
  SCENE_LEVELS,
} from '@/features/lfp-viewer/colour-scale';
import {
  contactGrid,
  gridAxisNames,
  openingSliceAxis,
  placeVoxels,
  sliceLabel,
  voxelsOf,
} from '@/features/lfp-viewer/contact-grid';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { useCircuitDrawsEachCell } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { NEUTRAL_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { PillGroup, PillSelect } from '@/ui/molecules/select/pill-select';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { ContactPositions } from '@/features/lfp-viewer/use-lfp-summary';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';

const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false };
/** Colours change at most this often while playing. */
const RECOLOR_MS = 50;
const SELECTED_COLOR = '#000000';
const CONTACT_VIEWS = [
  { value: 'voxels', label: 'Voxels' },
  { value: 'slice', label: 'Slice' },
  { value: 'points', label: 'Points' },
] as const;
type ContactView = (typeof CONTACT_VIEWS)[number]['value'];

const LEVEL_COLORS = Array.from({ length: SCENE_LEVELS }, (_, i) => hexAt(positionOfLevel(i)));

/** Each contact's colour level at a bin; under `hideBelow` µV, zero's, so its ring still shows it. */
function levelsAt(field: LfpField, scale: ColourScale, bin: number, hideBelow: number): Uint8Array {
  const levels = new Uint8Array(field.contacts);
  for (let c = 0; c < field.contacts; c++) {
    const uv = fieldValue(field, c, bin);
    levels[c] = levelOf(Math.abs(uv) < hideBelow ? 0 : scale.position(uv));
  }
  return levels;
}

function sameLevels(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((level, c) => level === b[c]);
}

type Props = {
  circuit: ICircuit;
  populationName: string | undefined;
  field: LfpField;
  scale: ColourScale;
  contacts: ContactPositions;
  /** Below this |V|, in µV, a contact is drawn as at zero. */
  hideBelow: number;
  selectedContact: number | null;
  timeCursor: TimeCursor;
  active: boolean;
};

/**
 * The circuit with the report's contacts over it, each coloured by the field
 * there at the player's time, on the scale the map uses.
 */
export function LfpScene({
  circuit,
  populationName,
  field,
  scale,
  contacts,
  hideBelow,
  selectedContact,
  timeCursor,
  active,
}: Props) {
  const { positions } = contacts;
  const [levels, setLevels] = useState<Uint8Array | null>(null);
  const drawsEachCell = useCircuitDrawsEachCell(circuit);
  const grid = useMemo(() => (positions ? contactGrid(positions) : null), [positions]);
  const [chosenView, setChosenView] = useState<ContactView>('voxels');
  const view = grid ? chosenView : 'points';
  const [chosenAxis, setChosenAxis] = useState<number | null>(null);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const slice = useMemo(() => {
    if (!grid || view !== 'slice') return null;
    const axis = chosenAxis ?? openingSliceAxis(grid);
    const last = grid.slices[axis] - 1;
    return { axis, index: Math.min(chosenIndex ?? Math.floor(last / 2), last) };
  }, [grid, view, chosenAxis, chosenIndex]);

  // Recoloured only while on screen, and drawn again only where a contact's colour changed.
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let recoloredAt = 0;
    let pending: number | null = null;
    const unsubscribe = timeCursor.subscribe((t) => {
      if (t === null) return;
      pending = binAt(field, t);
      if (timer) return;
      timer = setTimeout(
        () => {
          timer = null;
          recoloredAt = performance.now();
          if (pending === null) return;
          const next = levelsAt(field, scale, pending, hideBelow);
          setLevels((shown) => (shown && sameLevels(shown, next) ? shown : next));
        },
        Math.max(0, RECOLOR_MS - (performance.now() - recoloredAt))
      );
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [active, timeCursor, field, scale, hideBelow]);

  const fieldLevels = levels?.length === field.contacts ? levels : null;
  const coloured = fieldLevels !== null;
  // Points alone take their groups from the levels, so voxels and slices keep the same groups as they recolour.
  const pointLevels = view === 'points' ? fieldLevels : null;
  const drawn = useMemo<ICircuitOverlayGroup[] | undefined>(() => {
    if (!positions || !coloured) return undefined;
    const byLevel: number[][] = LEVEL_COLORS.map(() => []);
    const selected: number[] = [];
    for (let c = 0; c < field.contacts; c++) {
      const xyz = [positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]];
      if (c === selectedContact) selected.push(...xyz);
      else if (pointLevels) byLevel[pointLevels[c]].push(...xyz);
    }
    const groups: ICircuitOverlayGroup[] = byLevel.flatMap((coordinates, level) =>
      coordinates.length === 0
        ? []
        : [
            {
              name: `level ${level}`,
              id: `lfp-level-${level}`,
              color: LEVEL_COLORS[level],
              coordinates: Float32Array.from(coordinates),
              among: true,
            },
          ]
    );
    if (selected.length > 0) {
      groups.push({
        name: 'selected',
        id: 'lfp-selected',
        color: SELECTED_COLOR,
        coordinates: Float32Array.from(selected),
        halo: true,
      });
    }
    return groups;
  }, [positions, field.contacts, coloured, pointLevels, selectedContact]);
  const placement = useMemo(
    () => (grid && view !== 'points' ? placeVoxels(grid, slice) : null),
    [grid, view, slice]
  );
  const voxels = useMemo(
    () => (placement && fieldLevels ? voxelsOf(placement, fieldLevels) : null),
    [placement, fieldLevels]
  );
  const electrodes = useMemo(() => ({ drawn, voxels }), [drawn, voxels]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl">
      {drawsEachCell !== undefined && (
        <CircuitScene
          circuit={circuit}
          largeCircuit={!drawsEachCell}
          features={SCENE_FEATURES}
          populationName={populationName}
          showUnselectedPopulations={false}
          electrodes={electrodes}
          active={active}
          colorByNoneLabel="Uniform"
          uncolouredCells={NEUTRAL_NEURON_COLOR}
          legend={
            <div className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-neutral-500 shadow-sm">
              <div className="h-2 w-40 rounded-full" style={{ background: SCALE_GRADIENT }} />
              <div className="mt-0.5 flex justify-between tabular-nums">
                <span>−{formatUv(scale.limit)}</span>
                <span>0</span>
                <span>+{formatUv(scale.limit)} µV</span>
              </div>
            </div>
          }
        />
      )}
      {grid && (
        <div className="absolute top-3 left-12 flex flex-col items-start gap-2">
          <PillSelect
            label="Contacts"
            value={view}
            options={[...CONTACT_VIEWS]}
            onChange={(v) => setChosenView(v as ContactView)}
          />
          {slice && (
            <PillGroup>
              <PillSelect
                segment
                label="Along"
                value={String(slice.axis)}
                options={gridAxisNames(grid).flatMap((name, axis) =>
                  grid.slices[axis] > 1 ? [{ value: String(axis), label: name }] : []
                )}
                onChange={(v) => {
                  setChosenAxis(Number(v));
                  setChosenIndex(null);
                }}
              />
              <div className="flex items-center gap-3 px-2.5">
                <Slider
                  ariaLabelForHandle="Slice position"
                  className="!my-0 w-32"
                  min={0}
                  max={grid.slices[slice.axis] - 1}
                  value={slice.index}
                  onChange={setChosenIndex}
                  tooltip={{ open: false }}
                />
                <span className="text-xs font-normal whitespace-nowrap text-neutral-600 tabular-nums">
                  {sliceLabel(grid, slice)}
                </span>
              </div>
            </PillGroup>
          )}
        </div>
      )}
      {(contacts.state === 'absent' || contacts.state === 'failed') && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
          {contacts.state === 'failed'
            ? "Where this report's contacts are could not be read"
            : "Where this report's contacts are is not stored with its recording array"}
        </div>
      )}
    </div>
  );
}
