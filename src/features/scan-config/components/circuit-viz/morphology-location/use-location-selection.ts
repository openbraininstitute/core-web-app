'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppMessage } from '@/components/notification';
import { morphologyLocationMarkerColor } from '@/features/scan-config/components/color-by/palette';
import { DEFAULT_MORPHOLOGY_LOCATION_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
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

import { isTargetableSectionType, sectionTypeLabel } from '../section-type-label';

import type { LocationHit, LocationOptions } from '@/features/circuit-viewer/morphologies/pointer';
import type {
  LocationMarker,
  MarkerOnScreen,
  ScreenPoint,
  ViewLocations,
} from '@/features/circuit-viewer/morphologies/types';
import type { SectionType } from '@/features/circuit-viewer/section-type';
import type { Config } from '@/features/scan-config/types';

interface Options extends IFormBindingOptions {
  /** The cells a location applies to: those of the population on show that have a morphology. */
  cells: readonly number[];
  /** Canvas background, so a marker that recedes stays visible against it. */
  backgroundColor: string;
  /** Marker radius in µm, from the viewer settings slider. */
  markerRadius?: number;
  /** Whether to tag each location with its section, from the viewer settings toggle. */
  showLabels?: boolean;
  /** Locations previewed from the generated blocks, drawn beside the stored ones but read-only. */
  generatedLocations?: ITaggedLocation[];
}

const NO_LOCATIONS: ITaggedLocation[] = [];

/**
 * Above this many markers the tags cover the cell, and tracking them costs a pass per frame. A
 * generated block can reach it on its own, so it takes only its own tags away, not the stored ones.
 */
const MAX_LABELLED_MARKERS = 200;

/** The morphology location under the pointer: one stored, or one a click would add. */
export interface LocationHover {
  kind: 'selected' | 'preview';
  sectionType?: SectionType;
  sonataSectionId?: number;
  offset: number;
  screen: ScreenPoint;
  /** Previewed from a generated block, so it moves with that block's parameters. */
  generated?: boolean;
}

/** A stored location's tag, where its marker is drawn. */
export interface LocationLabel {
  marker: { sectionType?: SectionType; sonataSectionId?: number };
  screen: ScreenPoint;
  visible: boolean;
}

/** Pointer rest time before the hover popover appears. The hand cursor waits only on the pick under the pointer. */
const HOVER_REST_DELAY_IN_MS = 300;

/** A marker's location, and the block and row it came from. */
interface Stored {
  sonataId: number;
  offset: number;
  entry: string;
  locationIndex: number;
  generated?: boolean;
}

const pickable: LocationOptions['pickable'] = (spot) => isTargetableSectionType(spot.type);

/**
 * Two-way binding between the 3D view and an `ExplicitMorphologyLocations` block.
 *
 * Clicking a neurite adds a location to the open block, and the block's rows come back as markers. The config is the
 * only source of truth, so the list and the 3D view cannot drift apart. With no block open, a click creates one. Locations previewed from
 * generated blocks are drawn the same way but cannot be picked.
 *
 * `locations` is `undefined` when there is nothing to draw and nothing to pick.
 *
 * A row has a section id and an offset but no cell, so it applies to every morphology in the neuron set. That is only
 * unambiguous for one cell, which is what OBI-One allows today; the markers still span every cell given, so the view
 * keeps matching what gets simulated.
 */
export function useLocationSelection({
  config,
  onConfigChange,
  selectedRootElement,
  selectedEntry,
  onCreateEntry,
  supportsExplicitLocations,
  cells,
  backgroundColor,
  markerRadius = DEFAULT_MORPHOLOGY_LOCATION_RADIUS,
  showLabels = false,
  generatedLocations = NO_LOCATIONS,
}: Options): {
  locations: ViewLocations | undefined;
  hover: LocationHover | null;
  labels: LocationLabel[];
  pickMode: TMorphologyLocationPickModeDict;
} {
  const message = useAppMessage();
  const [hover, setHover] = useState<LocationHover | null>(null);
  const [labels, setLabels] = useState<LocationLabel[]>([]);
  const pickMode = morphologyLocationPickMode({
    config,
    selectedRootElement,
    selectedEntry,
    onConfigChange,
    onCreateEntry,
    supportsExplicitLocations,
  });
  const canEdit = pickMode === MorphologyLocationPickModeDict.Edit;
  // Read through the dictionary, not `config`: an edit elsewhere in the form must not rebuild the markers.
  const dictionary = readLocationsDictionary(config);
  const storedLocations = useMemo<ITaggedLocation[]>(
    () => [...collectLocations(dictionary), ...generatedLocations],
    [dictionary, generatedLocations]
  );
  const ownLocationCount = readLocations(readEntry(config, selectedEntry)).length;

  // In step: the view tells of a marker by its index.
  const { markers, stored } = useMemo(() => {
    const all: { markers: LocationMarker[]; stored: Stored[] } = { markers: [], stored: [] };
    // Once a block: a generated one can hold thousands of markers, and receding a colour is not free.
    const colors = new Map<string, string>();
    const colorOf = (entry: string) => {
      let color = colors.get(entry);
      if (color === undefined) {
        color = morphologyLocationMarkerColor(entry, selectedEntry, backgroundColor);
        colors.set(entry, color);
      }
      return color;
    };
    for (const cell of cells) {
      for (const location of storedLocations) {
        all.markers.push({
          cell,
          sonataId: location.section_id,
          offset: location.offset,
          color: colorOf(location.entry),
        });
        all.stored.push({
          sonataId: location.section_id,
          offset: location.offset,
          entry: location.entry,
          locationIndex: location.index,
          generated: location.generated,
        });
      }
    }
    return all;
  }, [storedLocations, cells, selectedEntry, backgroundColor]);

  const onPick = useCallback(
    (hit: LocationHit) => {
      let location: IStoredLocation;
      let existing: Stored | undefined;
      if ('marker' in hit) {
        existing = stored[hit.marker];
        if (!existing) return;
        // A generated location moves with its block's parameters, so a click has nothing to offer.
        if (existing.generated) {
          message.info(
            `"${existing.entry}" places this location. Change its parameters to move it.`
          );
          return;
        }
        if (!canEdit || existing.entry !== selectedEntry) {
          message.info(`That location belongs to "${existing.entry}". Open that block to edit it.`);
          return;
        }
        if (ownLocationCount <= 1) {
          message.info('At least one location is required — edit this one instead of removing it.');
          return;
        }
        location = { section_id: existing.sonataId, offset: existing.offset };
      } else {
        const { spot } = hit;
        // The view picks on whatever cell the tap landed near, and the scene holds every population's cells. Only
        // these carry section ids the rows can be read against.
        if (!cells.includes(spot.cell)) {
          message.info(
            'That cell belongs to another population. Select it to place a location there.'
          );
          return;
        }
        if (spot.sonataId === null) {
          message.info(
            'This circuit does not report SONATA section ids yet, so locations cannot be picked here.'
          );
          return;
        }
        if (!isTargetableSectionType(spot.type)) {
          message.info(
            `${sectionTypeLabel(spot.type) ?? 'This section'} is not supported yet, please pick a basal or apical dendrite.`
          );
          return;
        }
        location = { section_id: spot.sonataId, offset: Number(spot.offset.toFixed(4)) };
      }
      if (!canEdit) {
        onCreateEntry?.(MORPHOLOGY_LOCATIONS_CONFIG_KEY, {
          type: EXPLICIT_BLOCK_TYPE,
          locations: [location],
        });
        return;
      }
      const entry = selectedEntry;
      if (!onConfigChange || !entry) return;
      onConfigChange((previous) => writeLocation(previous, entry, location, existing));
    },
    [
      onConfigChange,
      selectedEntry,
      message,
      ownLocationCount,
      canEdit,
      onCreateEntry,
      cells,
      stored,
    ]
  );

  // Mirrors `hover !== null`, which only this handler sets, so it cannot go stale. A ref and not the state itself:
  // reading state here would rebuild the handler on every hover, and the view's pointer is tracked again whenever it
  // changes.
  const hoverVisible = useRef(false);
  const restTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onHover = useCallback(
    (hit: LocationHit | null) => {
      clearTimeout(restTimer.current);
      restTimer.current = undefined;
      const next = hit && hoverOf(hit, stored);

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
    [canEdit, stored]
  );

  const labelsGenerated = markers.length <= MAX_LABELLED_MARKERS;
  const labelledCount = labelsGenerated
    ? markers.length
    : cells.length * ownMarkerRows(storedLocations);
  const labelled = showLabels && labelledCount > 0 && labelledCount <= MAX_LABELLED_MARKERS;

  const pendingLabels = useRef<LocationLabel[] | null>(null);
  const labelFrame = useRef<number | null>(null);
  const onMarkersOnScreen = useCallback(
    (onScreen: readonly (MarkerOnScreen | null)[]) => {
      pendingLabels.current = onScreen.flatMap((marker, index) =>
        marker && stored[index] && (labelsGenerated || !stored[index].generated)
          ? [
              {
                marker: { sectionType: marker.type, sonataSectionId: stored[index].sonataId },
                screen: marker.screen,
                visible: marker.visible,
              },
            ]
          : []
      );
      if (labelFrame.current !== null) return;
      labelFrame.current = requestAnimationFrame(() => {
        labelFrame.current = null;
        if (pendingLabels.current) setLabels(pendingLabels.current);
      });
    },
    [stored, labelsGenerated]
  );

  useEffect(
    () => () => {
      if (labelFrame.current !== null) cancelAnimationFrame(labelFrame.current);
      clearTimeout(restTimer.current);
    },
    []
  );

  // Without `onPick` the view draws the markers read-only: no picking, no hand cursor.
  const locations = useMemo(
    (): ViewLocations | undefined =>
      markers.length === 0 && pickMode === null
        ? undefined
        : {
            markers,
            radius: markerRadius,
            onMarkersOnScreen: labelled ? onMarkersOnScreen : undefined,
            onPick: pickMode ? onPick : undefined,
            onHover: pickMode ? onHover : undefined,
            pickable,
          },
    [pickMode, markers, onPick, markerRadius, labelled, onMarkersOnScreen, onHover]
  );

  return {
    locations,
    hover: pickMode ? hover : null,
    labels: labelled ? labels : [],
    pickMode,
  };
}

/** How many of `locations` are stored rather than generated. */
function ownMarkerRows(locations: readonly ITaggedLocation[]): number {
  let count = 0;
  for (const location of locations) if (!location.generated) count++;
  return count;
}

/** What the popover says of a hit. */
function hoverOf(hit: LocationHit, stored: readonly Stored[]): LocationHover | null {
  if ('spot' in hit) {
    const { spot } = hit;
    return {
      kind: 'preview',
      sectionType: spot.type,
      sonataSectionId: spot.sonataId ?? undefined,
      offset: spot.offset,
      screen: spot.screen,
    };
  }
  const location = stored[hit.marker];
  if (!location) return null;
  return {
    kind: 'selected',
    sectionType: hit.type,
    sonataSectionId: location.sonataId,
    offset: location.offset,
    screen: hit.screen,
    generated: location.generated,
  };
}

/**
 * The config with `location` added to `entry`, or with `existing` removed from it.
 *
 * Returns `previous` unchanged when it will not act: the block is gone or no longer explicit, the marker's row moved,
 * or it is the last row, which the backend requires.
 */
function writeLocation(
  previous: Config,
  entry: string,
  location: IStoredLocation,
  existing?: Stored
): Config {
  const blocks = readLocationsDictionary(previous);
  const current = blocks?.[entry] as Record<string, unknown> | undefined;
  if (!blocks || !current || current.type !== EXPLICIT_BLOCK_TYPE) return previous;

  const rows = readLocations(current);
  let next: IStoredLocation[];
  if (existing) {
    const removed = rowOf(rows, existing);
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

function rowOf(locations: IStoredLocation[], { locationIndex, offset, sonataId }: Stored): number {
  const matches = (location: IStoredLocation) =>
    location.section_id === sonataId && location.offset === offset;
  const candidate = locations[locationIndex];
  if (candidate && matches(candidate)) return locationIndex;
  return locations.findIndex(matches);
}
