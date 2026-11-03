'use client';

import { useMemo } from 'react';

import { MorphologyLocationsIcon } from '@/components/icons/MorphologyLocations';
import { morphologyLocationMarkerColor } from '@/features/scan-config/components/color-by/palette';

import { ViewerLegend } from '../viewer-legend';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { ITaggedLocation } from '@/features/scan-config/components/model-preview/morphology-locations-block';

/**
 * Key for the locations previewed from generated blocks, one row per block with its count.
 *
 * A block that failed, placed nothing, or has locations the viewer cannot draw keeps its row with
 * a warning, so its missing markers are not mistaken for a block never configured.
 */
export function GeneratedLocationsLegend({
  entries,
  locations,
  drawn,
  errors,
  pending,
  openEntry,
  backgroundColor,
  hidden,
  onToggle,
  theme,
}: {
  /** The generated blocks previewed, in config order. */
  entries: readonly string[];
  locations: readonly ITaggedLocation[];
  /** How many of a block's locations the viewer places, by entry; omit while it cannot tell. */
  drawn?: ReadonlyMap<string, number>;
  /** Why a block could not be previewed, by entry. */
  errors?: ReadonlyMap<string, string>;
  /** Blocks whose preview is on its way. */
  pending?: ReadonlySet<string>;
  /** The block open in the form, whose markers keep their full colour. */
  openEntry?: string;
  /** Canvas background, which the other blocks' markers recede towards. */
  backgroundColor: string;
  /** Blocks whose locations are hidden. */
  hidden?: ReadonlySet<string>;
  onToggle?: (entry: string) => void;
  theme?: ViewerTheme | null;
}) {
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { entry } of locations) counts.set(entry, (counts.get(entry) ?? 0) + 1);
    return entries.map((entry) => {
      const count = counts.get(entry) ?? 0;
      const placed = drawn?.get(entry) ?? count;
      const busy = pending?.has(entry) ?? false;
      return {
        key: entry,
        label: entry,
        color: morphologyLocationMarkerColor(entry, openEntry, backgroundColor),
        detail:
          placed < count
            ? `${placed.toLocaleString()} of ${count.toLocaleString()}`
            : count.toLocaleString(),
        warning:
          errors?.get(entry) ??
          (busy
            ? undefined
            : count === 0
              ? 'These parameters place no locations.'
              : placed < count
                ? `${(count - placed).toLocaleString()} sit on sections not drawn, such as the axon while axons are hidden.`
                : undefined),
      };
    });
  }, [entries, locations, drawn, errors, pending, openEntry, backgroundColor]);

  return (
    <ViewerLegend
      title="Generated locations"
      icon={<MorphologyLocationsIcon />}
      noun="locations"
      entries={rows}
      hidden={hidden}
      onToggle={onToggle}
      theme={theme}
    />
  );
}
