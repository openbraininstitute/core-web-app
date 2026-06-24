'use client';

import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ViewVariant, WorkspaceSection } from '@/constants';
import {
  usePreviewRecord,
  useSetScanConfigEntityPreview,
} from '@/features/scan-config/bridge/entity-preview';
import {
  ScanConfigActivity,
  type TScanConfigActivity,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { Skeleton } from '@/ui/molecules/skeleton';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { Config } from '@/features/scan-config/types';
import type { Nullish } from '@/utils/type';

const ModelPreview = dynamic(
  () => import('@/features/scan-config/components/model-preview').then((m) => m.ModelPreview),
  { ssr: false }
);

const IonChannelModelRecordingRender = dynamic(
  () =>
    import('@/features/scan-config/components/model-preview/ion-channel-figure-viewer').then(
      (m) => m.IonChannelModelRecordingRender
    ),
  { ssr: false }
);

type Props = {
  activity: TScanConfigActivity;
  entityType: string;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  selectedEntry: string;
  selectedRootElement: string;
  config: Config;
};

export function Right({
  activity,
  entityType,
  entity,
  selectedEntry,
  selectedRootElement,
  config,
}: Props) {
  const {
    preview: entityPreview,
    record: previewRecord,
    isLoading: isPreviewLoading,
  } = usePreviewRecord();
  const setEntityPreview = useSetScanConfigEntityPreview();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params?.id;
  const origin = searchParams.get('origin') ?? '';

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear stale preview when route session or entity changes
  useEffect(() => {
    setEntityPreview(null);
  }, [sessionId, origin, entity?.id, setEntityPreview]);

  if (entityPreview && (previewRecord || isPreviewLoading)) {
    return (
      <div
        id="scan-config-controls-right-mini-detail"
        className="h-full min-h-0 rounded-lg px-0.5 py-1"
      >
        {previewRecord ? (
          <MiniDetailViewRenderer
            section={WorkspaceSection.Data}
            record={previewRecord as EntityCoreObjectTypes}
            dataType={entityPreview.dataType}
            theme={ViewVariant.Light}
            enableAnimation={false}
            hideUseModelAction
            onClose={() => setEntityPreview(null)}
          />
        ) : (
          <Skeleton className="h-full w-full rounded-lg" />
        )}
      </div>
    );
  }
  return (
    <div id="scan-config-controls-right-preview" className="rounded-lg px-0.5 py-1 h-full">
      {activity === ScanConfigActivity.Simulate &&
        entityType === ExtendedEntitiesTypeDict.IonChannelModel && (
          <IonChannelModelRecordingRender
            selectedRootElement={selectedRootElement}
            selectedEntry={selectedEntry}
            config={config}
          />
        )}
      {((activity === ScanConfigActivity.Simulate &&
        (entityType === ExtendedEntitiesTypeDict.Circuit ||
          entityType === ExtendedEntitiesTypeDict.MemodelCircuit ||
          entityType === ExtendedEntitiesTypeDict.WholeBrain ||
          entityType === ExtendedEntitiesTypeDict.SingleNeuronCircuit) &&
        entity) ||
        (activity === ScanConfigActivity.Extract &&
          entity &&
          entityType === ExtendedEntitiesTypeDict.Circuit)) && (
        <div className="rounded-lg h-full" id="scan-config-right-model-preview">
          <ModelPreview model={entity} />
        </div>
      )}
    </div>
  );
}
