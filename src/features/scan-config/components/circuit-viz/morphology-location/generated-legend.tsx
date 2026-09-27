'use client';

import { useMemo } from 'react';

import { MorphologyLocationsIcon } from '@/components/icons/MorphologyLocations';
import { morphologyLocationsColor } from '@/features/scan-config/components/color-by/palette';

import { ViewerLegend } from '../viewer-legend';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { ITaggedLocation } from '@/features/scan-config/components/model-preview/morphology-locations-block';

/** Key for the locations previewed from generated blocks, one row per block with its count. */
export function GeneratedLocationsLegend({
  locations,
  hidden,
  onToggle,
  theme,
}: {
  locations: readonly ITaggedLocation[];
  /** Blocks whose locations are hidden. */
  hidden?: ReadonlySet<string>;
  onToggle?: (entry: string) => void;
  theme?: ViewerTheme | null;
}) {
  const entries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { entry } of locations) counts.set(entry, (counts.get(entry) ?? 0) + 1);
    return [...counts].map(([entry, count]) => ({
      key: entry,
      label: entry,
      color: morphologyLocationsColor(entry),
      detail: count.toLocaleString(),
    }));
  }, [locations]);

  return (
    <ViewerLegend
      title="Generated locations"
      icon={<MorphologyLocationsIcon />}
      noun="locations"
      entries={entries}
      hidden={hidden}
      onToggle={onToggle}
      theme={theme}
    />
  );
}
