'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppMessage } from '@/components/notification';
import {
  isTargetableSectionType,
  sectionTypeLabel,
  TARGETABLE_SECTION_TYPES,
} from '@/features/scan-config/components/circuit-viz/section-type-label';
import {
  EXPLICIT_BLOCK_TYPE,
  type IStoredLocation,
  readAllLocations,
  readEntry,
  readLocations,
} from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { MORPHOLOGY_LOCATIONS_CONFIG_KEY } from '@/features/scan-config/components/model-preview/morphology-locations-key';
import { MorphoViewerTreeItemType } from '@/features/scan-config/types';

import type { Config } from '@/features/scan-config/types';
import type {
  MorphoViewerMorphologyLocationHover,
  MorphoViewerMorphologyLocationLabel,
  MorphoViewerMorphologyLocationMarker,
  MorphoViewerMorphologyLocationPick,
  MorphoViewerMorphologyLocationSelection,
  MorphoViewerSmallCircuitCell,
} from '@/morpho-viewer';

interface IOptions {
  config?: Config | null;
  onConfigChange?: (updater: (previous: Config) => Config) => void;
  /** Which block dictionary the form is editing — picking only applies to morphology locations. */
  selectedRootElement?: string;
  /** The dictionary entry being edited; a pick is appended to this one. */
  selectedEntry?: string;
  /** Cells currently in the viewer, needed to place markers. */
  cells: MorphoViewerSmallCircuitCell[];
  /** Per cell, SONATA section id → the section name the viewer addresses. */
  sonataSectionIds?: ReadonlyMap<string, ReadonlyMap<number, string>>;
  /** Marker radius in world units, from the viewer settings slider. */
  markerRadius?: number;
  /** Whether to publish label positions, from the viewer settings toggle. */
  showLabels?: boolean;
}

/** A marker plus the row it came from. */
type TLocationMarker = MorphoViewerMorphologyLocationMarker & { locationIndex: number };

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
  sonataSectionIds,
  markerRadius,
  showLabels = false,
}: IOptions): {
  selection: MorphoViewerMorphologyLocationSelection | undefined;
  hover: MorphoViewerMorphologyLocationHover | null;
  labels: MorphoViewerMorphologyLocationLabel[];
} {
  const message = useAppMessage();
  const [hover, setHover] = useState<MorphoViewerMorphologyLocationHover | null>(null);
  const [labels, setLabels] = useState<MorphoViewerMorphologyLocationLabel[]>([]);
  // `block` is a reference into the config, so it changes identity exactly when this block's
  // rows do — no need to compare them by value.
  const block = readEntry(config, selectedEntry);
  const isExplicit =
    selectedRootElement === MORPHOLOGY_LOCATIONS_CONFIG_KEY && block?.type === EXPLICIT_BLOCK_TYPE;
  // Editing a block shows that block's rows; anywhere else shows every block's, so locations
  // already placed stay on screen instead of vanishing when the user looks at something else.
  const storedLocations = useMemo<IStoredLocation[]>(
    () => (isExplicit ? readLocations(block) : readAllLocations(config)),
    [isExplicit, block, config]
  );

  const selected = useMemo<TLocationMarker[]>(() => {
    if (storedLocations.length === 0) return [];
    return cells.flatMap((cell) => {
      const sectionIds = sonataSectionIds?.get(cell.id);
      return storedLocations.flatMap((location, locationIndex) => {
        const sectionName =
          sectionIds?.get(location.section_id) ?? (location.section_id === 0 ? 'soma' : undefined);
        if (sectionName === undefined) return [];
        return [
          {
            cellId: cell.id,
            sectionName,
            offset: location.offset,
            sonataSectionId: location.section_id,
            locationIndex,
          },
        ];
      });
    });
  }, [storedLocations, cells, sonataSectionIds]);

  const onPick = useCallback(
    (pick: MorphoViewerMorphologyLocationPick) => {
      if (!onConfigChange || !selectedEntry) return;

      // A narrowed local: property narrowing would not survive into the updater closure.
      const { sonataSectionId } = pick;
      if (sonataSectionId === undefined) {
        message.info(
          'This circuit does not report SONATA section ids yet, so locations cannot be picked here.'
        );
        return;
      }

      if (!pick.existingMarker && !isTargetableSectionType(pick.sectionType)) {
        message.info(
          `${sectionTypeLabel(pick.sectionType) ?? 'This section'} is not supported yet, please pick a basal or apical dendrite.`
        );
        return;
      }

      if (pick.existingMarker && storedLocations.length <= 1) {
        message.info('At least one location is required — edit this one instead of removing it.');
        return;
      }

      onConfigChange((previous) => {
        const dictionary = (previous as Record<string, unknown>)[MORPHOLOGY_LOCATIONS_CONFIG_KEY] as
          | Record<string, unknown>
          | undefined;
        const current = dictionary?.[selectedEntry] as Record<string, unknown> | undefined;
        if (!current || current.type !== EXPLICIT_BLOCK_TYPE) return previous;

        const existing = readLocations(current);
        const removed = pick.existingMarker;
        // Clicking a location you already added removes it.
        let next: IStoredLocation[];
        if (removed) {
          const index = resolveLocationIndex(existing, removed);
          if (index < 0) return previous;
          next = existing.toSpliced(index, 1);
        } else {
          next = [
            ...existing,
            {
              section_id: sonataSectionId,
              offset: Number(pick.offset.toFixed(4)),
            },
          ];
        }

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
    [onConfigChange, selectedEntry, message, storedLocations.length]
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
    },
    []
  );

  // Typed wider than the package so the option compiles against a viewer that predates it;
  // an older viewer simply ignores the extra field.
  const selection = useMemo(() => {
    if (selected.length === 0 && !isExplicit) return undefined;

    if (!isExplicit) {
      // Read-only: the markers show what exists, but nothing here is the user's to edit until
      // they open the block. An empty `pickableSectionTypes` keeps the hand cursor away, and
      // without `onHover` there is no popover offering a click that would do nothing.
      return { selected, onPick: noop, radius: markerRadius, pickableSectionTypes: NONE_PICKABLE };
    }

    return {
      selected,
      onPick,
      onHover: setHover,
      radius: markerRadius,
      // So the hand cursor only appears where a click would be accepted.
      pickableSectionTypes: TARGETABLE_SECTION_TYPES,
      onLabelsChange: showLabels ? onLabelsChange : undefined,
    };
  }, [isExplicit, selected, onPick, markerRadius, showLabels, onLabelsChange]);

  return {
    selection,
    hover: isExplicit ? hover : null,
    labels: isExplicit && showLabels ? labels : [],
  };
}

/** No section accepts a click, so the viewer never offers one. */
const NONE_PICKABLE: readonly number[] = [];

function noop() {}

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
