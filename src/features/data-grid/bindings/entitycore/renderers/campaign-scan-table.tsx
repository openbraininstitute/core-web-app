'use client';

import { getSimulationStatus } from '@/entity-configuration/domain/simulation';
import {
  createNameColumn,
  createScanParameterColumns,
  createStatusColumn,
  renderExpandedTable,
} from '@/features/task-runner/expanded-view';

import { CampaignStatusBadge } from './campaign-status-badge';

import type { ReactNode } from 'react';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { SimulationRow } from '@/entity-configuration/domain/simulation/simulation-campaign';
import type { DetailRenderFn } from '../../../react';

type ScanTableRow = SimulationRow & { scan_parameters: Record<string, unknown> };

function resolveStatus(row: SimulationRow): ActivityStatus {
  return (row.status ?? getSimulationStatus(row)) as ActivityStatus;
}

/**
 * Flag-ON nested-table detail renderer. Keeps the legacy expanded scan-parameter table
 * (Name + one column per scan parameter + Status) but swaps the status cell to the new
 * {@link CampaignStatusBadge}. The expand payload (`data`) is the same
 * {@link SimulationRow}[] the popover-cards mode consumes, so both modes stay in sync.
 */
export function makeCampaignScanTableRenderDetail(): DetailRenderFn<{ id: string }> {
  return ({ data, loading, error }): ReactNode => {
    if (error) {
      return (
        <div className="px-12 py-4 text-sm text-red-500">Failed to load expanded details.</div>
      );
    }
    if (loading) {
      return <div className="px-12 py-4 text-sm text-gray-400">Loading…</div>;
    }

    const simulations = (Array.isArray(data) ? data : []) as ScanTableRow[];
    const allScanParamSet = simulations.reduce(
      (set, simulation) => set.union(new Set(Object.keys(simulation.scan_parameters ?? {}))),
      new Set<string>()
    );

    const columns = [
      createNameColumn<ScanTableRow>(),
      ...createScanParameterColumns<ScanTableRow>(allScanParamSet),
      createStatusColumn<ScanTableRow>((_: unknown, simulation: ScanTableRow) => (
        <div className="flex items-center justify-center">
          <CampaignStatusBadge status={resolveStatus(simulation)} />
        </div>
      )),
    ];

    return renderExpandedTable<ScanTableRow>({ columns, dataSource: simulations });
  };
}
