import type { CellStatistic } from '@/features/spike-viewer/spike-statistics/statistics';

export type ReportStatisticKey = 'mean' | 'sd' | 'min' | 'max' | 'spikes';

/** Where a voltage crossing upward counts as a spike. */
export const SPIKE_THRESHOLD_MV = -20;

/** One decimal for values in the tens, three significant digits for small ones. */
function formatValue(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 1) return value.toFixed(1);
  return String(Number(value.toPrecision(3)));
}

/**
 * A report's per-cell statistics, as table columns and plot values: the mean,
 * spread and extremes of what it recorded, in its units, and for a voltage
 * its spikes. `variable` names what it recorded; null for the voltage.
 */
export function reportStatistics(
  units: string,
  variable: string | null
): CellStatistic<ReportStatisticKey>[] {
  const noun = variable ?? 'voltage';
  const unit = units || undefined;
  const statistics: CellStatistic<ReportStatisticKey>[] = [
    {
      key: 'mean',
      column: 'report:mean',
      label: `Mean ${noun}`,
      short: 'Mean',
      unit,
      format: formatValue,
    },
    {
      key: 'sd',
      column: 'report:sd',
      label: `${variable ?? 'Voltage'} SD`,
      short: 'SD',
      unit,
      format: formatValue,
    },
    {
      key: 'min',
      column: 'report:min',
      label: `Lowest ${noun}`,
      short: 'Min',
      unit,
      format: formatValue,
    },
    {
      key: 'max',
      column: 'report:max',
      label: `Highest ${noun}`,
      short: 'Max',
      unit,
      format: formatValue,
    },
  ];
  if (variable === null) {
    statistics.push({
      key: 'spikes',
      column: 'report:spikes',
      label: 'Spikes',
      short: 'Spikes',
      format: (v) => v.toLocaleString(),
      step: () => 1,
    });
  }
  return statistics;
}
