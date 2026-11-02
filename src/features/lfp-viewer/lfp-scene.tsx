'use client';

import { useEffect, useMemo, useState } from 'react';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { hexAt, levelOf, SCALE_GRADIENT, SCENE_LEVELS } from '@/features/lfp-viewer/colour-scale';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { useCircuitDrawsEachCell } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';

const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false, colorBy: false };
/** Colours change at most this often while playing. */
const RECOLOR_MS = 50;
const SELECTED_COLOR = '#000000';
const LEVEL_COLORS = Array.from({ length: SCENE_LEVELS }, (_, i) =>
  hexAt((i / (SCENE_LEVELS - 1)) * 2 - 1)
);

/** Each contact's colour level at a bin. */
function levelsAt(field: LfpField, scale: ColourScale, bin: number): Uint8Array {
  const levels = new Uint8Array(field.contacts);
  for (let c = 0; c < field.contacts; c++) {
    levels[c] = levelOf(scale.position(fieldValue(field, c, bin)));
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
  /** xyz per contact, in the report's order; null where the array's are not known. */
  positions: Float32Array | null;
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
  positions,
  selectedContact,
  timeCursor,
  active,
}: Props) {
  const [levels, setLevels] = useState<Uint8Array | null>(null);
  const drawsEachCell = useCircuitDrawsEachCell(circuit);

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
          const next = levelsAt(field, scale, pending);
          setLevels((shown) => (shown && sameLevels(shown, next) ? shown : next));
        },
        Math.max(0, RECOLOR_MS - (performance.now() - recoloredAt))
      );
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [active, timeCursor, field, scale]);

  const drawn = useMemo<ICircuitOverlayGroup[] | undefined>(() => {
    if (!positions || !levels || levels.length !== field.contacts) return undefined;
    const byLevel: number[][] = LEVEL_COLORS.map(() => []);
    const selected: number[] = [];
    for (let c = 0; c < field.contacts; c++) {
      const xyz = [positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]];
      if (c === selectedContact) selected.push(...xyz);
      else byLevel[levels[c]].push(...xyz);
    }
    const groups = byLevel.flatMap((coordinates, level) =>
      coordinates.length === 0
        ? []
        : [
            {
              name: `level ${level}`,
              id: `lfp-level-${level}`,
              color: LEVEL_COLORS[level],
              coordinates: Float32Array.from(coordinates),
            },
          ]
    );
    if (selected.length > 0) {
      groups.push({
        name: 'selected',
        id: 'lfp-selected',
        color: SELECTED_COLOR,
        coordinates: Float32Array.from(selected),
      });
    }
    return groups;
  }, [positions, field.contacts, levels, selectedContact]);
  const electrodes = useMemo(() => ({ drawn }), [drawn]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl">
      {/* Its renderer waits on whether Bluenaas has the circuit's pack. */}
      {drawsEachCell !== undefined && (
        <CircuitScene
          circuit={circuit}
          largeCircuit={!drawsEachCell}
          features={SCENE_FEATURES}
          populationName={populationName}
          showUnselectedPopulations={false}
          electrodes={electrodes}
          active={active}
        />
      )}
      <div className="pointer-events-none absolute top-3 right-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-neutral-500 shadow-sm">
        <div className="h-2 w-40 rounded-full" style={{ background: SCALE_GRADIENT }} />
        <div className="mt-0.5 flex justify-between tabular-nums">
          <span>−{scale.limit.toFixed(0)}</span>
          <span>0</span>
          <span>+{scale.limit.toFixed(0)} µV</span>
        </div>
      </div>
      {!positions && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
          Where this report&apos;s contacts are is not stored with its recording array
        </div>
      )}
    </div>
  );
}
