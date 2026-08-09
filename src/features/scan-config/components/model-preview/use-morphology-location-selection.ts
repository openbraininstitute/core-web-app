'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MORPHOLOGY_LOCATIONS_CONFIG_KEY } from '@/features/scan-config/components/model-preview/morphology-locations-key';

import type { Config } from '@/features/scan-config/types';
import type {
  MorphoViewerMorphologyLocationHover,
  MorphoViewerMorphologyLocationLabel,
  MorphoViewerMorphologyLocationPick,
  MorphoViewerMorphologyLocationSelection,
  MorphoViewerSmallCircuitCell,
} from '@/morpho-viewer';

/** Only this block type stores locations outright; the others describe how to sample them. */
const EXPLICIT_BLOCK_TYPE = 'ExplicitMorphologyLocations';

interface StoredLocation {
  section_id: number;
  offset: number;
}

interface Options {
  config?: Config | null;
  onConfigChange?: (updater: (previous: Config) => Config) => void;
  /** Which block dictionary the form is editing — picking only applies to morphology locations. */
  selectedRootElement?: string;
  /** The dictionary entry being edited; a pick is appended to this one. */
  selectedEntry?: string;
  /** Cells currently in the viewer, needed to place markers. */
  cells: MorphoViewerSmallCircuitCell[];
  /** Marker radius in world units, from the viewer settings slider. */
  markerRadius?: number;
  /** Whether to publish label positions, from the viewer settings toggle. */
  showLabels?: boolean;
}

function readEntry(config: Config | null | undefined, entry: string | undefined) {
  if (!config || !entry) return null;
  const dictionary = (config as Record<string, unknown>)[MORPHOLOGY_LOCATIONS_CONFIG_KEY];
  if (!dictionary || typeof dictionary !== 'object') return null;
  const block = (dictionary as Record<string, unknown>)[entry];
  if (!block || typeof block !== 'object') return null;
  return block as Record<string, unknown>;
}

function readLocations(block: Record<string, unknown> | null): StoredLocation[] {
  if (!block || block.type !== EXPLICIT_BLOCK_TYPE) return [];
  const locations = block.locations;
  if (!Array.isArray(locations)) return [];
  return locations.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const { section_id: sectionId, offset } = entry as Record<string, unknown>;
    if (typeof sectionId !== 'number' || typeof offset !== 'number') return [];
    return [{ section_id: sectionId, offset }];
  });
}

/**
 * Two-way binding between the 3D viewer and an `ExplicitMorphologyLocations` block.
 *
 * Clicking a neurite appends a location to the block the form is editing; the block's stored
 * locations come back as markers. The config is the single source of truth, so the list editor
 * and the 3D view cannot drift apart — editing a row moves its marker, and picking adds a row.
 *
 * Returns `undefined` when picking does not apply (no explicit block selected), which switches
 * the viewer back to its ordinary behaviour and skips building the extra pick buffer.
 *
 * A stored location carries a section id and an offset but no cell, so it is applied to every
 * morphology in the neuron set — which is only unambiguous on a single-neuron target. OBI-One
 * gates the block on `ShowExplicitMorphologyLocations` accordingly, so `cells` holds one entry
 * in practice; the mapping below still spans them all rather than silently drawing on one, so
 * that if the gate ever widens the view keeps telling the truth about what gets simulated.
 */
export function useMorphologyLocationSelection({
  config,
  onConfigChange,
  selectedRootElement,
  selectedEntry,
  cells,
  markerRadius,
  showLabels = false,
}: Options): {
  selection: MorphoViewerMorphologyLocationSelection | undefined;
  hover: MorphoViewerMorphologyLocationHover | null;
  labels: MorphoViewerMorphologyLocationLabel[];
} {
  const [hover, setHover] = useState<MorphoViewerMorphologyLocationHover | null>(null);
  const [labels, setLabels] = useState<MorphoViewerMorphologyLocationLabel[]>([]);
  const isEditingMorphologyLocations = selectedRootElement === MORPHOLOGY_LOCATIONS_CONFIG_KEY;
  const block = readEntry(config, selectedEntry);
  const isExplicit = isEditingMorphologyLocations && block?.type === EXPLICIT_BLOCK_TYPE;
  const locationsKey = isExplicit ? JSON.stringify(readLocations(block)) : '';

  const selected = useMemo(() => {
    if (!locationsKey) return [];
    const locations = JSON.parse(locationsKey) as StoredLocation[];
    // `sectionName` in the viewer is OBI-One's raw morphio id as a string, and
    // `sonata_section_id` is that plus one. Undo the shift to address the drawn section.
    return cells.flatMap((cell) =>
      locations.map((location) => ({
        cellId: cell.id,
        sectionName: location.section_id === 0 ? 'soma' : String(location.section_id - 1),
        offset: location.offset,
        // Carried through so the hover popover can name the id the config actually stores,
        // rather than the raw morphio id the viewer addresses sections by.
        sonataSectionId: location.section_id,
      }))
    );
  }, [locationsKey, cells]);

  const onPick = useCallback(
    (pick: MorphoViewerMorphologyLocationPick) => {
      if (!onConfigChange || !selectedEntry || pick.sonataSectionId === undefined) return;

      onConfigChange((previous) => {
        const dictionary = (previous as Record<string, unknown>)[MORPHOLOGY_LOCATIONS_CONFIG_KEY] as
          | Record<string, unknown>
          | undefined;
        const current = dictionary?.[selectedEntry] as Record<string, unknown> | undefined;
        if (!current || current.type !== EXPLICIT_BLOCK_TYPE) return previous;

        const existing = readLocations(current);
        const removed = pick.existingMarker;
        // Clicking a location you already added removes it — the same gesture both ways, so
        // there is no separate delete target to hunt for in the 3D view. Matched on the
        // viewer's own report rather than on the click's rounded offset, which would not
        // reliably land back on the stored value.
        const next = removed
          ? existing.filter(
              (location) =>
                !(
                  location.section_id === removed.sonataSectionId &&
                  location.offset === removed.offset
                )
            )
          : [
              ...existing,
              {
                section_id: pick.sonataSectionId as number,
                offset: Number(pick.offset.toFixed(4)),
              } satisfies StoredLocation,
            ];

        // The backend requires at least one location, so the last one cannot be removed this
        // way any more than it can from the list.
        if (next.length === 0) return previous;

        return {
          ...previous,
          [MORPHOLOGY_LOCATIONS_CONFIG_KEY]: {
            ...dictionary,
            [selectedEntry]: { ...current, locations: next },
          },
        } as Config;
      });
    },
    [onConfigChange, selectedEntry]
  );

  // Coalesced to one update per frame: the viewer republishes on every repaint, and an orbit
  // is a repaint per frame. Without this, a drag would queue a React render per frame.
  const pendingLabels = useRef<MorphoViewerMorphologyLocationLabel[] | null>(null);
  const labelFrame = useRef<number | null>(null);
  const onLabelsChange = useCallback((next: MorphoViewerMorphologyLocationLabel[]) => {
    pendingLabels.current = next;
    if (labelFrame.current !== null) return;
    labelFrame.current = requestAnimationFrame(() => {
      labelFrame.current = null;
      if (pendingLabels.current) setLabels(pendingLabels.current);
    });
  }, []);

  useEffect(
    () => () => {
      if (labelFrame.current !== null) cancelAnimationFrame(labelFrame.current);
    },
    []
  );

  const selection = useMemo(
    () =>
      isExplicit
        ? {
            selected,
            onPick,
            onHover: setHover,
            radius: markerRadius,
            // Presence of the callback is what turns per-frame projection on in the viewer,
            // so it is omitted entirely when labels are switched off.
            onLabelsChange: showLabels ? onLabelsChange : undefined,
          }
        : undefined,
    [isExplicit, selected, onPick, markerRadius, showLabels, onLabelsChange]
  );

  return {
    selection,
    hover: isExplicit ? hover : null,
    labels: isExplicit && showLabels ? labels : [],
  };
}
