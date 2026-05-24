'use client';

import dynamic from 'next/dynamic';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import {
  useScanConfigEntityPreview,
  useSetScanConfigEntityPreview,
} from '@/features/scan-config/bridge/entity-preview';
import {
  ScanConfigActivity,
  type TScanConfigActivity,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';
import { MiniDetailViewTheme } from '@/ui/segments/mini-detail-view/types';

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
  const entityPreview = useScanConfigEntityPreview();
  const setEntityPreview = useSetScanConfigEntityPreview();

  if (entityPreview) {
    return (
      <div
        id="scan-config-controls-right-mini-detail"
        className="h-full min-h-0 rounded-lg px-0.5 py-1"
      >
        <MiniDetailViewRenderer
          section={WorkspaceSection.Data}
          record={entityPreview.record as EntityCoreObjectTypes}
          dataType={entityPreview.dataType}
          theme={MiniDetailViewTheme.Light}
          enableAnimation={false}
          hideUseModelAction
          onClose={() => setEntityPreview(null)}
        />
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
          entityType === ExtendedEntitiesTypeDict.MEModelWithSynapses) &&
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
