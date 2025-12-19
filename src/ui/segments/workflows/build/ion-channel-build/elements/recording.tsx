'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Empty } from 'antd';
import { useAtom } from 'jotai';
import { useMemo } from 'react';

import { TraceDetailsView } from '@/features/ion-channel-recording-viewer/components/trace-details-view/trace-details-view';
import useTrace from '@/features/ion-channel-recording-viewer/hooks/use-nwb-trace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  CONFIGURATION_RECORDING_STATE_KEY,
  IonChannelRecordingAtomFamily,
} from '@/ui/segments/workflows/build/ion-channel-build/helpers';

export default function Recording({ sessionId }: { sessionId: string }) {
  const { virtualLabId, projectId } = useWorkspace();
  const [recording] = useAtom(
    useMemo(
      () => IonChannelRecordingAtomFamily(`${CONFIGURATION_RECORDING_STATE_KEY}/${sessionId}`),
      [sessionId],
    ),
  );

  const [trace, error, loading] = useTrace({
    resource: recording!,
    ctx: { virtualLabId, projectId },
  });

  if (!recording) {
    return null;
  }

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    );
  }

  if (!trace) {
    return null;
  }

  return <TraceDetailsView trace={trace} cls={{ plots: 'flex-col! w-full!' }} />;
}
