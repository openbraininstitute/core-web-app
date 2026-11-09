'use client';

import { Slider } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { DEFAULT_SPIKE_GLOW } from '@/features/circuit-viewer/spike-clock';
import {
  formatUv,
  hexAt,
  levelOf,
  positionOfLevel,
  SCALE_GRADIENT,
  SCENE_LEVELS,
} from '@/features/lfp-viewer/colour-scale';
import { contactColour, SELECTED_COLOUR } from '@/features/lfp-viewer/contact-colours';
import {
  gridAxisNames,
  openingSliceAxis,
  placeVoxels,
  sliceLabel,
  voxelsOf,
} from '@/features/lfp-viewer/contact-grid';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { useCircuitDrawsEachCell } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { NEUTRAL_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { useViewerSpikes } from '@/features/spike-viewer/hooks/use-session-spikes';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import { PillGroup, PillSelect } from '@/ui/molecules/select/pill-select';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { CircuitSpikes, ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { ContactGrid } from '@/features/lfp-viewer/contact-grid';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { ContactPositions } from '@/features/lfp-viewer/use-lfp-summary';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { TAssetBackedFile } from '@/features/scan-config/types';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { WorkspaceContext } from '@/types/common';

const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false };
/** Colours change at most this often while playing. */
const RECOLOR_MS = 50;
const HOVERED_COLOR = '#8c8c8c';
/** Darker than the hovered ring: a line a pixel wide in grey is lost among the boxes. */
const OUTLINE_COLOR = '#141414';
/** Shorter than a replay's: at the usual fade, most cells of a busy circuit are lit at any moment, hiding the field. */
const SPIKE_AFTERGLOW_IN_SECONDS = 0.1;
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

/** The colour of the band round each contact that has one: its trace's, as the traces draw it, or grey under the pointer. */
function bandsOf(
  colours: ReadonlyMap<number, string>,
  selected: number | null,
  hovered: number | null
): Map<number, string> {
  const bands = new Map(colours);
  if (selected !== null && !bands.has(selected)) bands.set(selected, SELECTED_COLOUR);
  if (hovered !== null) {
    bands.delete(hovered);
    bands.set(hovered, HOVERED_COLOR);
  }
  return bands;
}

type SpikeRead = { spikes: CircuitSpikes | null; problem: string | null };

/** A spike file read for the scene, for as long as this is mounted. */
function SpikeFile({
  file,
  ctx,
  population,
  timeRange,
  onRead,
}: {
  file: TAssetBackedFile;
  ctx: WorkspaceContext;
  population: string;
  timeRange: { min: number; max: number };
  onRead: (read: SpikeRead | null) => void;
}) {
  const [data, error, session] = useSpikeTrace({
    entityId: file.entity.id,
    entityType: file.entity.type,
    asset: file.asset,
    ctx,
  });
  const spikes = useViewerSpikes(session, population, undefined, timeRange);
  const absent = data !== null && !data.populations.some((p) => p.name === population);
  let problem: string | null = null;
  if (error) problem = 'The spikes could not be read';
  else if (absent) problem = `The spike file holds no spikes of ${population}`;
  useEffect(() => {
    onRead({ spikes, problem });
    return () => onRead(null);
  }, [spikes, problem, onRead]);
  return null;
}

type Props = {
  circuit: ICircuit;
  populationName: string | undefined;
  field: LfpField;
  scale: ColourScale;
  contacts: ContactPositions;
  grid: ContactGrid | null;
  /** Below this |V|, in µV, a contact is drawn as at zero. */
  hideBelow: number;
  selectedContact: number | null;
  /** The ticked contacts, drawn alone while there are any. */
  ticked: readonly number[];
  /** The ticked contacts' colours, which their traces are drawn in. */
  colours: ReadonlyMap<number, string>;
  /** Unticks them all, so that every contact is drawn again. */
  onShowAll: () => void;
  /** The contact under the pointer in the traces or the table. */
  hoveredContact: number | null;
  timeCursor: TimeCursor;
  speed: number;
  spikeFiles: readonly TAssetBackedFile[];
  ctx: WorkspaceContext;
  timeRange: { min: number; max: number };
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
  grid,
  hideBelow,
  selectedContact,
  ticked,
  colours,
  onShowAll,
  hoveredContact,
  timeCursor,
  speed,
  spikeFiles,
  ctx,
  timeRange,
  active,
}: Props) {
  const { positions } = contacts;
  const [levels, setLevels] = useState<Uint8Array | null>(null);
  const drawsEachCell = useCircuitDrawsEachCell(circuit);
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
  const only = useMemo(() => (ticked.length > 0 ? new Set(ticked) : null), [ticked]);
  const bands = useMemo(
    () => bandsOf(colours, selectedContact, hoveredContact),
    [colours, selectedContact, hoveredContact]
  );
  const bandLevels = fieldLevels && [...bands.keys()].map((c) => fieldLevels[c]).join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: outside the points view, only the banded contacts' levels are drawn
  const drawn = useMemo<ICircuitOverlayGroup[] | undefined>(() => {
    if (!positions || !fieldLevels) return undefined;
    const xyzOf = (c: number) => [positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]];
    const groups: ICircuitOverlayGroup[] = [];
    // Voxels and slices show the rest.
    if (view === 'points') {
      const byLevel: number[][] = LEVEL_COLORS.map(() => []);
      for (let c = 0; c < field.contacts; c++) {
        if (!bands.has(c) && (!only || only.has(c))) byLevel[fieldLevels[c]].push(...xyzOf(c));
      }
      byLevel.forEach((coordinates, level) => {
        if (coordinates.length === 0) return;
        groups.push({
          name: `level ${level}`,
          id: `lfp-level-${level}`,
          color: LEVEL_COLORS[level],
          coordinates: Float32Array.from(coordinates),
          among: true,
        });
      });
    }
    // Filled by the field as the rest are, in a band of their trace's colour, so that a trace is found in the scene.
    const banded = new Map<string, { level: number; band: string; coordinates: number[] }>();
    for (const [c, band] of bands) {
      if (c >= field.contacts) continue;
      const level = fieldLevels[c];
      const key = `${level} ${band}`;
      const group = banded.get(key) ?? { level, band, coordinates: [] };
      group.coordinates.push(...xyzOf(c));
      banded.set(key, group);
    }
    for (const { level, band, coordinates } of banded.values()) {
      groups.push({
        name: 'ticked',
        id: `lfp-band-${level}-${band}`,
        color: LEVEL_COLORS[level],
        band,
        coordinates: Float32Array.from(coordinates),
        halo: true,
      });
    }
    return groups;
  }, [positions, field.contacts, view === 'points' ? fieldLevels : bandLevels, view, bands, only]);
  const placement = useMemo(
    () => (grid && view !== 'points' ? placeVoxels(grid, slice, only) : null),
    [grid, view, slice, only]
  );
  const selection = useMemo(
    () =>
      ticked.length > 0
        ? { count: ticked.length, total: field.contacts, noun: 'contact', onReset: onShowAll }
        : undefined,
    [ticked.length, field.contacts, onShowAll]
  );
  const fieldVoxels = useMemo(
    () => (placement && fieldLevels ? voxelsOf(placement, fieldLevels) : null),
    [placement, fieldLevels]
  );
  // Its box outlined rather than made more opaque, which would read as a stronger field.
  // In its trace's colour, as the traces draw it.
  const outlinedBox = useMemo(
    () => (placement && hoveredContact !== null ? placement.shown.indexOf(hoveredContact) : -1),
    [placement, hoveredContact]
  );
  const outlineColor =
    outlinedBox < 0
      ? OUTLINE_COLOR
      : (contactColour(colours, selectedContact, hoveredContact as number) ?? OUTLINE_COLOR);
  const voxels = useMemo(
    () =>
      fieldVoxels && outlinedBox >= 0
        ? { ...fieldVoxels, outline: { box: outlinedBox, color: outlineColor } }
        : fieldVoxels,
    [fieldVoxels, outlinedBox, outlineColor]
  );
  const electrodes = useMemo(() => ({ drawn, voxels }), [drawn, voxels]);

  const [spikesOn, setSpikesOn] = useState(false);
  const [spikeRead, setSpikeRead] = useState<SpikeRead | null>(null);
  const [afterglowInSeconds, setAfterglowInSeconds] = useState(SPIKE_AFTERGLOW_IN_SECONDS);
  const [glow, setGlow] = useState(DEFAULT_SPIKE_GLOW);
  const spikeFile = populationName ? spikeFiles[0] : undefined;
  const shownSpikes = spikesOn ? (spikeRead?.spikes ?? undefined) : undefined;
  // Follows the player only while on screen, and finds its place again when back.
  const spikes = useMemo<ISpikeReplayBinding | undefined>(
    () =>
      shownSpikes && {
        data: shownSpikes,
        timeCursor: active ? timeCursor : undefined,
        speed,
        afterglowInSeconds,
        onAfterglowChange: setAfterglowInSeconds,
        glow,
        onGlowChange: setGlow,
      },
    [shownSpikes, active, timeCursor, speed, afterglowInSeconds, glow]
  );
  const spikesLoading = spikesOn && !shownSpikes && !spikeRead?.problem;

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
          spikes={spikes}
          active={active}
          colorByNoneLabel="Uniform"
          uncolouredCells={NEUTRAL_NEURON_COLOR}
          selection={selection}
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
      {spikesOn && spikeFile && populationName && (
        <SpikeFile
          file={spikeFile}
          ctx={ctx}
          population={populationName}
          timeRange={timeRange}
          onRead={setSpikeRead}
        />
      )}
      {(grid || spikeFiles.length > 0) && (
        <div className="absolute top-3 left-12 flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            {grid && (
              <PillSelect
                label="Contacts"
                value={view}
                options={[...CONTACT_VIEWS]}
                onChange={(v) => setChosenView(v as ContactView)}
              />
            )}
            {spikeFiles.length > 0 && (
              <PillSelect
                label="Spikes"
                value={spikesOn ? 'on' : 'off'}
                options={[
                  { value: 'off', label: 'Off' },
                  {
                    value: 'on',
                    label: spikesLoading ? 'Loading…' : 'On',
                    disabled: !spikeFile,
                    detail: spikeFile ? undefined : 'Needs a report of one population',
                  },
                ]}
                onChange={(v) => setSpikesOn(v === 'on')}
              />
            )}
          </div>
          {grid && slice && (
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
      {spikesOn && spikeRead?.problem && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-xs text-neutral-500">
          {spikeRead.problem}
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
