'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppMessage } from '@/components/notification';
import {
  morphologyLocationMarkerColor,
  morphologyLocationsNeuronColor,
  recedeMarkerColor,
} from '@/features/scan-config/components/color-by/palette';
import { DEFAULT_MORPHOLOGY_LOCATION_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import {
  collectLocations,
  type IFormBindingOptions,
  type IStoredLocation,
  type ITaggedLocation,
  isExplicitLocationsBlockType,
  MORPHOLOGY_LOCATIONS_CONFIG_KEY,
  MorphologyLocationPickModeDict,
  morphologyLocationPickMode,
  PER_NEURON_EXPLICIT_BLOCK_TYPE,
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
  /** The scene index of node 0 of the population on show, so a cell's SONATA node id is `cell - firstCell`. */
  firstCell: number;
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
  /** The SONATA node id the location is on, where the block stores one per row. */
  nodeId?: number;
}

/** A stored location's tag, where its marker is drawn. */
export interface LocationLabel {
  marker: { sectionType?: SectionType; sonataSectionId?: number; nodeId?: number };
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
  /** The row's `node_id`; unset for a row of a plain explicit block. */
  nodeId?: number;
}

const pickable: LocationOptions['pickable'] = (spot) => isTargetableSectionType(spot.type);

/**
 * Two-way binding between the 3D view and an `ExplicitMorphologyLocations` or `PerNeuronExplicitMorphologyLocations`
 * block, whichever `explicitLocationsBlockType` names.
 *
 * Clicking a neurite adds a location to the open block, and the block's rows come back as markers. The config is the
 * only source of truth, so the list and the 3D view cannot drift apart. With no block open, a click creates one. Locations previewed from
 * generated blocks are drawn the same way but cannot be picked.
 *
 * `locations` is `undefined` when there is nothing to draw and nothing to pick.
 *
 * A plain explicit row has a section id and an offset but no cell, so it applies to every morphology in the neuron set,
 * which is only unambiguous for one cell. A per-neuron row also carries the node id of the cell it was clicked on, so it
 * is drawn on that cell alone, in that cell's colour.
 */
export function useLocationSelection({
  config,
  onConfigChange,
  selectedRootElement,
  selectedEntry,
  onCreateEntry,
  explicitLocationsBlockType,
  cells,
  firstCell,
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
    explicitLocationsBlockType,
  });
  const canEdit = pickMode === MorphologyLocationPickModeDict.Edit;
  const perNeuron = explicitLocationsBlockType === PER_NEURON_EXPLICIT_BLOCK_TYPE;
  // A pick's neuron, where the block stores one: only cells of the population on show have node ids rows can name.
  const nodeIdOf = useCallback(
    (cell: number) => (perNeuron && cells.includes(cell) ? cell - firstCell : undefined),
    [perNeuron, cells, firstCell]
  );
  // Read through the dictionary, not `config`: an edit elsewhere in the form must not rebuild the markers.
  const dictionary = readLocationsDictionary(config);
  const storedLocations = useMemo<ITaggedLocation[]>(
    () => [...collectLocations(dictionary), ...generatedLocations],
    [dictionary, generatedLocations]
  );
  const ownLocationCount = readLocations(readEntry(config, selectedEntry)).length;

  // In step: the view tells of a marker by its index.
  const { markers, stored, ownMarkers } = useMemo(() => {
    const all: { markers: LocationMarker[]; stored: Stored[]; ownMarkers: number } = {
      markers: [],
      stored: [],
      ownMarkers: 0,
    };
    // Once a block, or a block's neuron: a generated block can hold thousands of markers, and receding is not free.
    const colors = new Map<string, string>();
    const colorOf = (entry: string, nodeId: number | undefined) => {
      const key = nodeId === undefined ? entry : `${entry}\0${nodeId}`;
      let color = colors.get(key);
      if (color === undefined) {
        // Coloured by neuron where the row names one, so points read as belonging to their cell.
        color =
          nodeId === undefined
            ? morphologyLocationMarkerColor(entry, selectedEntry, backgroundColor)
            : entry === selectedEntry
              ? morphologyLocationsNeuronColor(nodeId)
              : recedeMarkerColor(morphologyLocationsNeuronColor(nodeId), backgroundColor);
        colors.set(key, color);
      }
      return color;
    };
    // A Set: per-neuron rows look their cell up once each.
    const inScene = new Set(cells);
    for (const location of storedLocations) {
      const nodeId = location.node_id;
      // A per-neuron row sits on its own neuron, and is not drawn while that neuron is not.
      const targets = nodeId === undefined ? cells : [firstCell + nodeId];
      for (const cell of targets) {
        if (nodeId !== undefined && !inScene.has(cell)) continue;
        all.markers.push({
          cell,
          sonataId: location.section_id,
          offset: location.offset,
          color: colorOf(location.entry, nodeId),
        });
        all.stored.push({
          sonataId: location.section_id,
          offset: location.offset,
          entry: location.entry,
          locationIndex: location.index,
          generated: location.generated,
          nodeId,
        });
        if (!location.generated) all.ownMarkers++;
      }
    }
    return all;
  }, [storedLocations, cells, firstCell, selectedEntry, backgroundColor]);

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
        location = {
          ...(existing.nodeId === undefined ? {} : { node_id: existing.nodeId }),
          section_id: existing.sonataId,
          offset: existing.offset,
        };
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
        location = {
          // The cell the tap landed on, checked above to be of the population on show, is the neuron it belongs to.
          ...(perNeuron ? { node_id: spot.cell - firstCell } : {}),
          section_id: spot.sonataId,
          offset: Number(spot.offset.toFixed(4)),
        };
      }
      if (!canEdit) {
        if (!explicitLocationsBlockType) return;
        onCreateEntry?.(MORPHOLOGY_LOCATIONS_CONFIG_KEY, {
          type: explicitLocationsBlockType,
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
      firstCell,
      stored,
      perNeuron,
      explicitLocationsBlockType,
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
      const next = hit && hoverOf(hit, stored, nodeIdOf);

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
    [canEdit, stored, nodeIdOf]
  );

  const labelsGenerated = markers.length <= MAX_LABELLED_MARKERS;
  const labelledCount = labelsGenerated ? markers.length : ownMarkers;
  const labelled = showLabels && labelledCount > 0 && labelledCount <= MAX_LABELLED_MARKERS;

  const pendingLabels = useRef<LocationLabel[] | null>(null);
  const labelFrame = useRef<number | null>(null);
  const onMarkersOnScreen = useCallback(
    (onScreen: readonly (MarkerOnScreen | null)[]) => {
      pendingLabels.current = onScreen.flatMap((marker, index) =>
        marker && stored[index] && (labelsGenerated || !stored[index].generated)
          ? [
              {
                marker: {
                  sectionType: marker.type,
                  sonataSectionId: stored[index].sonataId,
                  nodeId: stored[index].nodeId,
                },
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

/** What the popover says of a hit. */
function hoverOf(
  hit: LocationHit,
  stored: readonly Stored[],
  nodeIdOf: (cell: number) => number | undefined
): LocationHover | null {
  if ('spot' in hit) {
    const { spot } = hit;
    return {
      kind: 'preview',
      sectionType: spot.type,
      sonataSectionId: spot.sonataId ?? undefined,
      offset: spot.offset,
      screen: spot.screen,
      nodeId: nodeIdOf(spot.cell),
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
    nodeId: location.nodeId,
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
  if (!blocks || !current || !isExplicitLocationsBlockType(current.type)) return previous;

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

function rowOf(
  locations: IStoredLocation[],
  { locationIndex, offset, sonataId, nodeId }: Stored
): number {
  const matches = (location: IStoredLocation) =>
    location.node_id === nodeId && location.section_id === sonataId && location.offset === offset;
  const candidate = locations[locationIndex];
  if (candidate && matches(candidate)) return locationIndex;
  return locations.findIndex(matches);
}
