'use client';

import { RiArrowRightLine, RiPulseLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  listAllChildren as listAllSimulationChildren,
  listExecutions,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import { useSimulationResultFiles } from '@/features/scan-config/components/simulation-files';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { TASK_STATUS_POLL_INTERVAL_MS } from '@/features/task-runner/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import { CardLabel } from './cards';
import { RunsCard } from './runs-card';
import { formatDuration, outputKind, simulationRows, spikeSummary } from './runs-model';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TAssetBackedFile } from '@/features/scan-config/types';
import type { TSheetItem } from './run-sheet';
import type { TSimulationRow } from './runs-model';

/** Spike files above this are left to the results view rather than drawn here. */
const MAX_THUMBNAIL_BYTES = 30 * 1024 * 1024;

/** A simulation campaign's runs and, for the one picked, its result files as cards. */
export function useSimulationSheet({
  campaignId,
  durationMs,
  onOpenSimulation,
}: {
  campaignId: string;
  durationMs: number | undefined;
  onOpenSimulation: (simulationId: string, assetId?: string) => void;
}) {
  const context = useWorkspace();
  // the same query as the Simulations tab's, so the two share it
  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ['scan-config-simulations', context, campaignId],
    queryFn: () => listAllSimulationChildren({ id: campaignId, context }),
    enabled: Boolean(campaignId),
  });
  const ids = simulations.map((s) => s.id);
  const { data: executions = [] } = useQuery({
    queryKey: ['scan-config-overview-executions', context, ids],
    queryFn: () => listExecutions({ simulationIds: ids, context }),
    enabled: ids.length > 0,
    refetchInterval: (query) =>
      (query.state.data ?? []).some(
        (e) => e.status === ActivityStatus.PENDING || e.status === ActivityStatus.RUNNING
      )
        ? TASK_STATUS_POLL_INTERVAL_MS
        : false,
  });
  const rows = useMemo(() => simulationRows(simulations, executions), [simulations, executions]);

  const [pickedId, setPickedId] = useState<string | null>(null);
  // a done one first, so the outputs have something to show
  const picked =
    rows.find((r) => r.simulation.id === pickedId) ??
    rows.find((r) => r.status === ActivityStatus.DONE) ??
    rows[0];
  const ended = picked?.status === ActivityStatus.DONE || picked?.status === ActivityStatus.ERROR;
  const [filesLoading, files] = useSimulationResultFiles(
    picked?.simulation.id ?? '',
    context,
    Boolean(picked && ended)
  );

  const runs = (
    <RunsCard
      noun="simulation"
      loading={isLoading}
      runs={rows.map((r) => ({
        id: r.simulation.id,
        name: r.simulation.name,
        status: r.status,
        startedAt: r.execution?.start_time ?? undefined,
        durationMs: r.durationMs,
        params: r.simulation.scan_parameters,
      }))}
      pickedId={picked?.simulation.id}
      onPick={setPickedId}
      onOpen={(id) => onOpenSimulation(id)}
    />
  );

  let outputs: TSheetItem[] = [];
  if (picked && picked.status === ActivityStatus.DONE) {
    outputs = files.length
      ? files.map((file) => ({
          id: `output:${file.asset.id}`,
          content: (
            <ResultFileCard
              file={file}
              durationMs={durationMs}
              onOpen={() => onOpenSimulation(picked.simulation.id, file.asset.id)}
            />
          ),
        }))
      : [{ id: 'output:pending', content: <NoResult row={picked} loading={filesLoading} /> }];
  } else if (picked) {
    outputs = [
      {
        id: 'output:none',
        content: <NoResult row={picked} onOpen={() => onOpenSimulation(picked.simulation.id)} />,
      },
    ];
  }

  return {
    rows,
    runs,
    runsHeight: rows.length > 1 ? 150 + Math.ceil(rows.length / 8) * 26 : 150,
    outputs,
    outputsReady: picked?.status === ActivityStatus.DONE && files.length > 0,
  };
}

/** A result file: what it holds, a picture of it where one is cheap, and a way into it. */
function ResultFileCard({
  file,
  durationMs,
  onOpen,
}: {
  file: TAssetBackedFile;
  durationMs: number | undefined;
  onOpen: () => void;
}) {
  const isSpikes = file.asset.label === AssetLabel.spike_report;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-1.5 p-3 text-left hover:bg-gray-50"
      data-testid={`overview-output-${file.asset.id}`}
    >
      <CardLabel
        color="#059669"
        right={
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-8">
            Open <RiArrowRightLine className="size-3.5" />
          </span>
        }
      >
        Output · {outputKind(file.asset.label, file.asset.path)}
      </CardLabel>
      {isSpikes && file.asset.size <= MAX_THUMBNAIL_BYTES ? (
        <SpikeThumbnail file={file} durationMs={durationMs} />
      ) : (
        <>
          <div className="flex h-[110px] w-full items-center justify-center rounded-md bg-gray-50 text-gray-300">
            <RiPulseLine className="size-10" />
          </div>
          <div className="truncate text-sm font-semibold text-gray-800">
            {file.asset.path.split('/').at(-1)}
          </div>
          <div className="text-xs text-gray-500">Traces in the results view</div>
        </>
      )}
    </button>
  );
}

/** The spikes as a small raster, with how many and how fast. */
function SpikeThumbnail({
  file,
  durationMs,
}: {
  file: TAssetBackedFile;
  durationMs: number | undefined;
}) {
  const context = useWorkspace();
  const [data, error] = useSpikeTrace({
    entityId: file.entity.id,
    entityType: file.entity.type as TEntityTypeDict,
    asset: file.asset,
    ctx: context,
  });
  const canvas = useRef<HTMLCanvasElement>(null);
  const summary = useMemo(() => (data ? spikeSummary(data, durationMs) : null), [data, durationMs]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || !data || !summary) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = el.getBoundingClientRect();
    el.width = width * ratio;
    el.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1d4ed8';
    const [t0, t1] = summary.window;
    const span = t1 - t0 || 1;
    const rows = summary.cellRange[1] - summary.cellRange[0] + 1;
    const dot = Math.max(1.5, Math.min(3, height / rows / 2));
    for (const population of data.populations) {
      for (let i = 0; i < population.timestamps.length; i += 1) {
        const x = ((population.timestamps[i] - t0) / span) * (width - dot);
        const y = ((population.nodeIds[i] - summary.cellRange[0] + 0.5) / rows) * height;
        ctx.fillRect(x, y - dot / 2, dot, dot);
      }
    }
  }, [data, summary]);

  if (error) {
    return <div className="text-xs text-gray-500">Could not read the spikes.</div>;
  }
  return (
    <>
      <div className="relative h-[110px] w-full overflow-hidden rounded-md bg-slate-50">
        <canvas ref={canvas} className="h-full w-full" />
        {!data && <div className="absolute inset-0 animate-pulse bg-slate-100" />}
      </div>
      <div className="text-sm font-semibold text-gray-800">
        {summary ? `${summary.spikes.toLocaleString()} spikes` : 'Reading spikes…'}
      </div>
      {summary && (
        <div className="text-xs text-gray-500">
          {summary.cellsFiring} cells firing
          {summary.meanRateHz !== undefined && ` · ${summary.meanRateHz.toFixed(1)} Hz mean`}
        </div>
      )}
    </>
  );
}

/** In place of outputs: why there are none, and what to do. */
function NoResult({
  row,
  loading,
  onOpen,
}: {
  row: TSimulationRow;
  loading?: boolean;
  onOpen?: () => void;
}) {
  const color = executionStatusColorMap[row.status];
  const started = row.execution?.start_time
    ? new Date(row.execution.start_time).toLocaleString()
    : undefined;
  const message = loading
    ? 'Loading results…'
    : row.status === ActivityStatus.ERROR
      ? `Failed${started ? ` (started ${started})` : ''}. No results were written.`
      : row.status === ActivityStatus.CREATED
        ? 'Not launched yet.'
        : row.status === ActivityStatus.CANCELLED
          ? 'Cancelled before it wrote results.'
          : `Running${row.durationMs ? ` for ${formatDuration(row.durationMs)}` : ''}… results appear here when it finishes.`;
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <CardLabel color={color}>Outputs</CardLabel>
      <div className="flex flex-1 items-center rounded-md bg-gray-50 p-3 text-sm text-gray-600">
        {message}
      </div>
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="self-start text-sm font-medium text-primary-8 hover:underline"
        >
          {row.status === ActivityStatus.CREATED
            ? 'Launch it from Simulations →'
            : row.execution?.execution_id
              ? 'Open its log →'
              : 'Open the simulation →'}
        </button>
      )}
    </div>
  );
}
