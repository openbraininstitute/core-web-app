'use client';

import { useMemo } from 'react';

import {
  reportCampaignMetrics,
  useReportCampaignSummaries,
} from '@/features/sonata-viewer/report-campaign';
import { SPIKE_THRESHOLD_MV } from '@/features/sonata-viewer/report-statistics';
import { CampaignPlots } from '@/features/spike-viewer/campaign-statistics/campaign-statistics-view';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';

type Props = {
  simulations: ISimulation[];
  statusMap: Map<string, ActivityStatus>;
  activeSimulationId: string;
  onSelect: (simulation: ISimulation) => void;
  /** The report on show, whose namesakes in the other simulations are compared. */
  reportPath: string | undefined;
  populationName: string | undefined;
  /** What the report records; null for the voltage. */
  variable: string | null;
  units: string;
  /** The cells the table picks, a flag per node index; null for every recorded one. */
  cells: Uint8Array | null;
  /** How many cells the report records, for what the picked ones are out of. */
  recordedCount: number;
};

/**
 * How a population's recordings compare across the campaign: for a voltage,
 * its mean level and spread, the share of cells that spiked and their rate,
 * in every finished simulation, over the cells the table picks.
 */
export function ReportCampaignView({
  simulations,
  statusMap,
  activeSimulationId,
  onSelect,
  reportPath,
  populationName,
  variable,
  units,
  cells,
  recordedCount,
}: Props) {
  const context = useWorkspace();
  const summaries = useReportCampaignSummaries({
    simulations,
    statusMap,
    context,
    reportPath,
    populationName,
    spikeThreshold: variable === null ? SPIKE_THRESHOLD_MV : null,
    cells,
    enabled: true,
  });
  const metrics = useMemo(() => reportCampaignMetrics(variable, units), [variable, units]);
  const picked = useMemo(
    () => (cells ? cells.reduce((sum, flag) => sum + flag, 0) : null),
    [cells]
  );
  const of =
    picked === null
      ? ''
      : ` · ${picked.toLocaleString()} of ${recordedCount.toLocaleString()} cells`;
  return (
    <CampaignPlots
      simulations={simulations}
      statusMap={statusMap}
      activeSimulationId={activeSimulationId}
      onSelect={onSelect}
      summaries={summaries}
      metrics={metrics}
      reading={variable === null ? 'voltages' : 'reports'}
      files={variable === null ? 'voltage reports' : 'reports'}
      scope={`${populationName ?? ''}${of}`}
    />
  );
}
