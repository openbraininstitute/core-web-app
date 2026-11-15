'use client';

import { RiArrowRightLine } from '@remixicon/react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { cn } from '@/utils/css-class';

import { CardLabel } from './cards';
import { formatDuration, STATUS_WORD } from './runs-model';

export type TRunSummary = {
  id: string;
  name: string;
  status: ActivityStatus;
  startedAt?: string;
  durationMs?: number;
  params?: Record<string, unknown> | null;
};

/**
 * The campaign's runs: one, as its status and timing; several, as a grid of squares coloured by
 * status, one per scan coordinate, whose pick sets which run's outputs are shown.
 */
export function RunsCard({
  noun,
  loading,
  runs,
  pickedId,
  onPick,
  onOpen,
}: {
  noun: string;
  loading: boolean;
  runs: TRunSummary[];
  pickedId: string | undefined;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  if (loading) return <div className="m-3 h-full animate-pulse rounded-md bg-gray-100" />;
  if (runs.length === 0) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <CardLabel>Runs</CardLabel>
        <div className="text-sm text-gray-500">No {noun}s generated yet.</div>
      </div>
    );
  }

  const picked = runs.find((r) => r.id === pickedId) ?? runs[0];
  const color = executionStatusColorMap[picked.status];
  const counts = Object.values(ActivityStatus)
    .map((status) => ({ status, n: runs.filter((r) => r.status === status).length }))
    .filter(({ n }) => n > 0);

  return (
    <div className="flex h-full flex-col gap-2 border-l-4 p-3" style={{ borderLeftColor: color }}>
      <CardLabel
        color={color}
        right={
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize text-white"
            style={{ backgroundColor: color }}
          >
            {STATUS_WORD[picked.status]}
          </span>
        }
      >
        {runs.length === 1 ? noun : `${runs.length} ${noun}s`}
      </CardLabel>

      {runs.length > 1 && (
        <>
          <div className="text-xs text-gray-500">
            {counts.map(({ status, n }) => `${n} ${STATUS_WORD[status]}`).join(' · ')}
          </div>
          <div className="flex flex-wrap gap-1" data-testid="overview-runs-grid">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                title={`${run.name} — ${STATUS_WORD[run.status]}`}
                onClick={() => onPick(run.id)}
                className={cn(
                  'size-5 rounded-sm transition',
                  run.id === picked.id ? 'ring-2 ring-gray-800 ring-offset-1' : 'opacity-80'
                )}
                style={{ backgroundColor: executionStatusColorMap[run.status] }}
              />
            ))}
          </div>
        </>
      )}

      <div className="truncate text-sm font-semibold text-gray-800">{picked.name}</div>
      {picked.params && Object.keys(picked.params).length > 0 && (
        <div className="max-h-12 overflow-hidden text-xs">
          <ScanParams scanParams={picked.params} color={color} />
        </div>
      )}
      <div className="text-xs text-gray-500">
        {picked.startedAt
          ? `Started ${new Date(picked.startedAt).toLocaleString()}${
              picked.durationMs !== undefined ? ` · ran ${formatDuration(picked.durationMs)}` : ''
            }`
          : 'Not launched yet'}
      </div>
      <button
        type="button"
        onClick={() => onOpen(picked.id)}
        className="mt-auto inline-flex items-center gap-1 self-start text-sm font-medium text-primary-8 hover:underline"
      >
        Open in results <RiArrowRightLine className="size-4" />
      </button>
    </div>
  );
}
