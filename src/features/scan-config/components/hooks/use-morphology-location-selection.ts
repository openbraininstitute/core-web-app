'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppMessage } from '@/components/notification';
import {
  isTargetableSectionType,
  sectionTypeLabel,
  TARGETABLE_SECTION_TYPES,
} from '@/features/scan-config/components/circuit-viz/section-type-label';
import {
  morphologyLocationsColor,
  recedeMarkerColor,
} from '@/features/scan-config/components/color-by/palette';
import {
  collectLocations,
  EXPLICIT_BLOCK_TYPE,
  type IFormBindingOptions,
  type IStoredLocation,
  type ITaggedLocation,
  MORPHOLOGY_LOCATIONS_CONFIG_KEY,
  MorphologyLocationPickModeDict,
  morphologyLocationPickMode,
  readEntry,
  readLocations,
  readLocationsDictionary,
  type TMorphologyLocationPickModeDict,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';

import type { Config } from '@/features/scan-config/types';
import type {
  MorphoViewerMorphologyLocationHover,
  MorphoViewerMorphologyLocationLabel,
  MorphoViewerMorphologyLocationMarker,
  MorphoViewerMorphologyLocationPick,
  MorphoViewerMorphologyLocationSelection,
  MorphoViewerSmallCircuitCell,
} from '@/morpho-viewer';

interface IOptions extends IFormBindingOptions {
  /** Cells currently in the viewer, needed to place markers. */
  cells: MorphoViewerSmallCircuitCell[];
  /** Per cell, SONATA section id → the section name the viewer addresses. */
  sonataSectionIds?: ReadonlyMap<string, ReadonlyMap<number, string>>;
  /** Canvas background, so a marker that recedes stays visible against it. */
  backgroundColor: string;
  /** Marker radius in world units, from the viewer settings slider. */
  markerRadius?: number;
  /** Whether to publish label positions, from the viewer settings toggle. */
  showLabels?: boolean;
}

/** Pointer rest time before the hover popover appears. The hand cursor is never delayed. */
const HOVER_REST_DELAY_IN_MS = 300;

/** A marker plus the block and row it came from. */
type TLocationMarker = MorphoViewerMorphologyLocationMarker & {
  entry: string;
  locationIndex: number;
};

/**
 * Two-way binding between the 3D viewer and an `ExplicitMorphologyLocations` block.
 *
 * Clicking a neurite adds a location to the open block, and the block's rows come back as
 * markers. The config is the only source of truth, so the list and the 3D view cannot drift
 * apart. With no block open, a click creates one.
 *
 * `selection` is `undefined` when there is nothing to draw and nothing to pick, so the viewer
 * skips building the pick buffer.
 *
 * A row has a section id and an offset but no cell, so it applies to every morphology in the
 * neuron set. That is only unambiguous for one cell, which is what OBI-One allows today; the
 * mapping below still spans every cell, so the view keeps matching what gets simulated.
 */
export function useMorphologyLocationSelection({
  config,
  onConfigChange,
  selectedRootElement,
  selectedEntry,
  onCreateEntry,
  cells,
  sonataSectionIds,
  backgroundColor,
  markerRadius,
  showLabels = false,
}: IOptions): {
  selection: MorphoViewerMorphologyLocationSelection | undefined;
  hover: MorphoViewerMorphologyLocationHover | null;
  labels: MorphoViewerMorphologyLocationLabel[];
  pickMode: TMorphologyLocationPickModeDict;
} {
  const message = useAppMessage();
  const [hover, setHover] = useState<MorphoViewerMorphologyLocationHover | null>(null);
  const [labels, setLabels] = useState<MorphoViewerMorphologyLocationLabel[]>([]);
  const pickMode = morphologyLocationPickMode({
    config,
    selectedRootElement,
    selectedEntry,
    onConfigChange,
    onCreateEntry,
  });
  const canEdit = pickMode === MorphologyLocationPickModeDict.Edit;
  // Read through the dictionary, not `config`: an edit elsewhere in the form must not rebuild
  // the markers, which would recompile the viewer's palette on every keystroke.
  const dictionary = readLocationsDictionary(config);
  const storedLocations = useMemo<ITaggedLocation[]>(
    () => collectLocations(dictionary),
    [dictionary]
  );
  const ownLocationCount = readLocations(readEntry(config, selectedEntry)).length;

  const selected = useMemo<TLocationMarker[]>(() => {
    if (storedLocations.length === 0) return [];
    return cells.flatMap((cell) => {
      const sectionIds = sonataSectionIds?.get(cell.id);
      return storedLocations.flatMap((location) => {
        const sectionName = sectionNameFor(sectionIds, location.section_id);
        if (sectionName === undefined) return [];

        const color = morphologyLocationsColor(location.entry);
        return [
          {
            cellId: cell.id,
            sectionName,
            offset: location.offset,
            sonataSectionId: location.section_id,
            color:
              location.entry === selectedEntry ? color : recedeMarkerColor(color, backgroundColor),
            entry: location.entry,
            locationIndex: location.index,
          },
        ];
      });
    });
  }, [storedLocations, cells, sonataSectionIds, selectedEntry, backgroundColor]);

  const onPick = useCallback(
    (pick: MorphoViewerMorphologyLocationPick) => {
      const { sonataSectionId } = pick;
      if (sonataSectionId === undefined) {
        message.info(
          'This circuit does not report SONATA section ids yet, so locations cannot be picked here.'
        );
        return;
      }

      const existing = pick.existingMarker as Partial<TLocationMarker> | undefined;
      if (existing && (!canEdit || existing.entry !== selectedEntry)) {
        message.info(`That location belongs to "${existing.entry}". Open that block to edit it.`);
        return;
      }

      if (!existing && !isTargetableSectionType(pick.sectionType)) {
        message.info(
          `${sectionTypeLabel(pick.sectionType) ?? 'This section'} is not supported yet, please pick a basal or apical dendrite.`
        );
        return;
      }

      const location: IStoredLocation = {
        section_id: sonataSectionId,
        offset: Number(pick.offset.toFixed(4)),
      };

      if (!canEdit) {
        onCreateEntry?.(MORPHOLOGY_LOCATIONS_CONFIG_KEY, {
          type: EXPLICIT_BLOCK_TYPE,
          locations: [location],
        });
        return;
      }

      if (existing && ownLocationCount <= 1) {
        message.info('At least one location is required — edit this one instead of removing it.');
        return;
      }

      const entry = selectedEntry;
      if (!onConfigChange || !entry) return;

      onConfigChange((previous) => writeLocation(previous, entry, location, existing));
    },
    [onConfigChange, selectedEntry, message, ownLocationCount, canEdit, onCreateEntry]
  );

  // Mirrors `hover !== null`, which only this handler sets, so it cannot go stale. A ref and
  // not the state itself: reading state here would rebuild the handler on every pointer move,
  // and the viewer re-subscribes whenever it changes.
  const hoverVisible = useRef(false);
  const restTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onHoverChange = useCallback(
    (next: MorphoViewerMorphologyLocationHover | null) => {
      clearTimeout(restTimer.current);
      restTimer.current = undefined;

      if (next && !canEdit && !hoverVisible.current) {
        restTimer.current = setTimeout(() => {
          restTimer.current = undefined;
          hoverVisible.current = true;
          setHover(next);
        }, HOVER_REST_DELAY_IN_MS);
        return;
      }

      hoverVisible.current = next !== null;
      setHover(next);
    },
    [canEdit]
  );

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
      clearTimeout(restTimer.current);
    },
    []
  );

  // Without `onPick` the viewer draws the markers read-only: no picking, no hand cursor.
  const selection = useMemo(
    () =>
      selected.length === 0 && pickMode === null
        ? undefined
        : {
            selected,
            radius: markerRadius,
            onLabelsChange: showLabels ? onLabelsChange : undefined,
            onPick: pickMode ? onPick : undefined,
            onHover: pickMode ? onHoverChange : undefined,
            pickableSectionTypes: pickMode ? TARGETABLE_SECTION_TYPES : undefined,
          },
    [pickMode, selected, onPick, markerRadius, showLabels, onLabelsChange, onHoverChange]
  );

  return {
    selection,
    hover: pickMode ? hover : null,
    labels: showLabels && selected.length > 0 ? labels : [],
    pickMode,
  };
}

/** The name the viewer draws a section under. Id 0 is the soma, which is never indexed. */
function sectionNameFor(
  sectionIds: ReadonlyMap<number, string> | undefined,
  sonataSectionId: number
): string | undefined {
  return sectionIds?.get(sonataSectionId) ?? (sonataSectionId === 0 ? 'soma' : undefined);
}

/**
 * The config with `location` added to `entry`, or with `existing` removed from it.
 *
 * Returns `previous` unchanged when it will not act: the block is gone or no longer explicit,
 * the marker's row moved, or it is the last row, which the backend requires.
 */
function writeLocation(
  previous: Config,
  entry: string,
  location: IStoredLocation,
  existing?: Partial<TLocationMarker>
): Config {
  const blocks = readLocationsDictionary(previous);
  const current = blocks?.[entry] as Record<string, unknown> | undefined;
  if (!blocks || !current || current.type !== EXPLICIT_BLOCK_TYPE) return previous;

  const rows = readLocations(current);
  let next: IStoredLocation[];
  if (existing) {
    const removed = resolveLocationIndex(rows, existing);
    // `-1` would splice off the last row instead of the one that moved.
    if (removed < 0) return previous;
    next = rows.toSpliced(removed, 1);
  } else {
    next = [...rows, location];
  }
  if (next.length === 0) return previous;

  return {
    ...previous,
    [MORPHOLOGY_LOCATIONS_CONFIG_KEY]: {
      ...blocks,
      [entry]: { ...current, locations: next },
    },
  } as Config;
}

function resolveLocationIndex(
  locations: IStoredLocation[],
  { locationIndex, offset, sonataSectionId }: Partial<TLocationMarker>
): number {
  const matches = (location: IStoredLocation) =>
    location.section_id === sonataSectionId && location.offset === offset;
  if (locationIndex !== undefined) {
    const candidate = locations[locationIndex];
    if (candidate && matches(candidate)) return locationIndex;
  }
  return locations.findIndex(matches);
}
