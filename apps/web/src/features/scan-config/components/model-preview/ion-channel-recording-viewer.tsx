'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';

import { getIonChannelRecording } from '@/api/entitycore/queries/experimental/ion-channel-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { TraceDetailsView } from '@/features/ion-channel-recording-viewer/components/trace-details-view/trace-details-view';
import useTrace from '@/features/ion-channel-recording-viewer/hooks/use-nwb-trace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { WorkspaceContext } from '@/types/common';
import type { InteractiveViewerProps } from '@/ui/segments/mini-detail-view/interactive-viewers';

function Placeholder({ description }: { description: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Empty description={description} />
    </div>
  );
}

const spinner = (
  <div className="flex h-40 w-full items-center justify-center">
    <LoadingOutlined />
  </div>
);

function Traces({
  recording,
  context,
}: {
  recording: IIonChannelRecording;
  context: WorkspaceContext;
}) {
  const [trace, error, loading] = useTrace({ resource: recording, ctx: context });

  if (error) return <Placeholder description="There was a problem loading the recording" />;
  if (loading || !trace) return spinner;
  return <TraceDetailsView trace={trace} cls={{ plots: 'flex-col! w-full!' }} />;
}

// listing rows lack what the NWB reader needs, so the recording is fetched by id
export function IonChannelRecordingPreviewViewer({ record }: InteractiveViewerProps) {
  const context = useWorkspace();
  const { data: recording, error } = useQuery({
    queryKey: keyBuilder.entity({
      id: record.id,
      context,
      type: EntityTypeDict.IonChannelRecording,
    }),
    queryFn: () => getIonChannelRecording({ id: record.id, context }),
    refetchOnWindowFocus: false,
  });

  if (error) return <Placeholder description="There was a problem loading the recording" />;
  if (!recording) return spinner;
  return <Traces recording={recording} context={context} />;
}
