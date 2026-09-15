'use client';

/**
 * Right-column trace viewer for the ion channel build.
 *
 * The recordings being fitted are what the whole form is about, so this stays up the way the
 * circuit viewer does for simulate. It reads them out of the config rather than from a route
 * entity, and renders one viewer each: several recordings are fitted into a single model, so
 * seeing all of the traces that went in is the point.
 */

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { useMemo } from 'react';

import { getIonChannelRecording } from '@/api/entitycore/queries/experimental/ion-channel-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { TraceDetailsView } from '@/features/ion-channel-recording-viewer/components/trace-details-view/trace-details-view';
import useTrace from '@/features/ion-channel-recording-viewer/hooks/use-nwb-trace';
import { isFromIdRef } from '@/features/scan-config/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { Config } from '@/features/scan-config/types';

/** The recording ids the config's `initialize` block currently holds. */
function useSelectedRecordingIds(config: Config): string[] {
  return useMemo(() => {
    const initialize = config?.initialize;
    if (typeof initialize !== 'object' || initialize === null) return [];
    const refs = (initialize as Record<string, unknown>).recordings;
    return (Array.isArray(refs) ? refs : [refs]).filter(isFromIdRef).map((ref) => ref.id_str);
  }, [config]);
}

function Placeholder({ description }: { description: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Empty description={description} />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-40 w-full items-center justify-center">
      <LoadingOutlined />
    </div>
  );
}

/** One recording's traces. Its own component so each gets its own fetch and loading state. */
function RecordingTraces({ id }: { id: string }) {
  const { virtualLabId, projectId } = useWorkspace();
  const context = useMemo(() => ({ virtualLabId, projectId }), [virtualLabId, projectId]);

  // the whole entity, not just the id: useTrace reads `assets` off it to find the NWB file
  const { data: recording, error: fetchError } = useQuery({
    queryKey: keyBuilder.entity({ id, context, type: EntityTypeDict.IonChannelRecording }),
    queryFn: () => getIonChannelRecording({ id, context }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const [trace, traceError, loading] = useTrace({
    resource: recording as IIonChannelRecording,
    ctx: context,
  });

  if (fetchError || traceError) {
    return <Placeholder description="There was a problem loading the recording" />;
  }

  if (!recording || loading || !trace) {
    return <Spinner />;
  }

  return <TraceDetailsView trace={trace} cls={{ plots: 'flex-col! w-full!' }} />;
}

export function IonChannelRecordingPreviewPanel({ config }: { config: Config }) {
  const recordingIds = useSelectedRecordingIds(config);

  if (!recordingIds.length) {
    return <Placeholder description="Select an ion channel recording to see its traces" />;
  }

  return (
    <div className="secondary-scrollbar h-full min-h-0 overflow-y-auto rounded-xl bg-white px-0.5">
      {recordingIds.map((id) => (
        <RecordingTraces key={id} id={id} />
      ))}
    </div>
  );
}
