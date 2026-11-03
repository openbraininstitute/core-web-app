'use client';

import { useEffect, useMemo, useState } from 'react';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import {
  formatUv,
  hexAt,
  levelOf,
  SCALE_GRADIENT,
  SCENE_LEVELS,
} from '@/features/lfp-viewer/colour-scale';
import { binAt, fieldValue } from '@/features/lfp-viewer/summary';
import { useCircuitDrawsEachCell } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { ColourScale } from '@/features/lfp-viewer/colour-scale';
import type { LfpField } from '@/features/lfp-viewer/summary';
import type { ContactPositions } from '@/features/lfp-viewer/use-lfp-summary';
import type { ICircuitOverlayGroup } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';

const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false, colorBy: false };
/** Colours change at most this often while playing. */
const RECOLOR_MS = 50;
const SELECTED_COLOR = '#000000';
const LEVEL_COLORS = Array.from({ length: SCENE_LEVELS }, (_, i) =>
  hexAt((i / (SCENE_LEVELS - 1)) * 2 - 1)
);

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
          <span>−{formatUv(scale.limit)}</span>
          <span>0</span>
          <span>+{formatUv(scale.limit)} µV</span>
        </div>
      </div>
      {!positions && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
          {contacts.state === 'failed'
            ? "Where this report's contacts are could not be read"
            : "Where this report's contacts are is not stored with its recording array"}
        </div>
      )}
    </div>
  );
}
