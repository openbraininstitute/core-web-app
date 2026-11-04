'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty, Spin } from 'antd';
import { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { useResultsSidePanel } from '@/features/scan-config/components/shared/results-layout';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import {
  electrodeOverlays,
  RECORDINGS_FILE,
  SPIKES_FILE,
  sortedUnitsCircuit,
  withRecordingSpan,
} from '@/features/spike-viewer/sorted-units/sorted-units';
import { SpikeReplayView } from '@/features/spike-viewer/spike-replay/spike-replay-view';
import { LoadingFilePanes } from '@/features/spike-viewer/spike-statistics/stacked-panes';

import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { SortedRecordings } from '@/features/spike-viewer/sorted-units/sorted-units';
import type { WorkspaceContext } from '@/types/common';

const TABLE_TITLE = 'Sorted units';

function Problem() {
  return (
    <div className="flex h-full items-center justify-center p-3">
      <Empty description="There was a problem loading the sorted units" />
    </div>
  );
}

function SortedUnits({
  entity,
  asset,
  context,
}: {
  entity: IEntity;
  asset: IAsset;
  context: WorkspaceContext;
}) {
  const sidePanel = useResultsSidePanel();
  const { data: recordings, error: recordingsError } = useQuery({
    queryKey: ['sorted-recordings', entity.id, asset.id],
    queryFn: async () => {
      const response = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.TaskResult,
        entityId: entity.id,
        id: asset.id,
        assetPath: RECORDINGS_FILE,
        asRawResponse: true,
      });
      return (await response.json()) as SortedRecordings;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const [spikes, spikesError, session] = useSpikeTrace({
    entityId: entity.id,
    entityType: EntityTypeDict.TaskResult,
    asset,
    assetPath: SPIKES_FILE,
    ctx: context,
  });

  const subject = useMemo(() => ({ circuit: sortedUnitsCircuit(entity, asset) }), [entity, asset]);
  const electrodes = useMemo(() => recordings && electrodeOverlays(recordings), [recordings]);
  const data = useMemo(
    () => spikes && recordings && withRecordingSpan(spikes, recordings),
    [spikes, recordings]
  );

  if (recordingsError || spikesError) return <Problem />;
  if (!data) {
    return sidePanel?.target ? (
      <LoadingFilePanes title="Raster" panelTitles={['3D Player', 'Statistics']} />
    ) : (
      <div className="flex h-full items-center justify-center p-3">
        <Spin />
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[data]}>
      <SpikeReplayView
        data={data}
        subject={subject}
        session={session}
        electrodes={electrodes}
        tableTitle={TABLE_TITLE}
      />
    </ErrorBoundary>
  );
}

/**
 * A sorting result's units in the simulations' spike viewer: the spikes as a raster over the table
 * of units, beside the units in 3D among their electrodes and the statistics.
 */
export function SortedUnitsViewer({
  entity,
  context,
}: {
  entity: IEntity;
  context: WorkspaceContext;
}) {
  const { assets } = entity as IEntity & { assets?: IAsset[] | null };
  const asset = assets?.find(({ label }) => label === AssetLabel.task_result);
  if (!asset) return <Problem />;
  return <SortedUnits entity={entity} asset={asset} context={context} />;
}
