'use client';

import { RiBubbleChartLine } from '@remixicon/react';
import { useMemo } from 'react';

import { ViewerLegend } from './viewer-legend';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { TSmallCircuitSynapseGroup } from './sources/types';

/** Key for the synapse marker colours, one row per distinct label. */
export function SynapseLegend({
  groups,
  hidden,
  onToggle,
  theme,
}: {
  groups?: readonly TSmallCircuitSynapseGroup[];
  /** Labels whose synapses are hidden. */
  hidden?: ReadonlySet<string>;
  /** Show or hide every group carrying this label. */
  onToggle?: (label: string) => void;
  theme?: ViewerTheme | null;
}) {
  const entries = useMemo(() => distinctEntries(groups), [groups]);

  return (
    <ViewerLegend
      title="Synapses"
      icon={<RiBubbleChartLine />}
      noun="synapses"
      entries={entries}
      hidden={hidden}
      onToggle={onToggle}
      theme={theme}
    />
  );
}

/** One row per label, in the order drawn: every typed circuit repeats the two types. */
function distinctEntries(groups?: readonly TSmallCircuitSynapseGroup[]) {
  const byLabel = new Map<string, string>();
  for (const { label, color } of groups ?? []) {
    if (!byLabel.has(label)) byLabel.set(label, color);
  }
  return [...byLabel].map(([label, color]) => ({ key: label, label, color }));
}
