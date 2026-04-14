'use client';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ModelPreview } from '@/features/scan-config/components/model-preview';
import { IonChannelModelRecordingRender } from '@/features/scan-config/components/model-preview/ion-channel-figure-viewer';
import {
  ScanConfigActivity,
  type TScanConfigActivity,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';

import type { Config } from '@/features/scan-config/components/components';
import type { Nullish } from '@/utils/type';

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
  return (
    <>
      {activity === ScanConfigActivity.Simulate &&
        entityType === ExtendedEntitiesTypeDict.IonChannelModel && (
          <IonChannelModelRecordingRender
            selectedRootElement={selectedRootElement}
            selectedEntry={selectedEntry}
            config={config}
          />
        )}
      {activity === ScanConfigActivity.Simulate &&
        (entityType === ExtendedEntitiesTypeDict.Circuit ||
          entityType === ExtendedEntitiesTypeDict.MemodelCircuit ||
          entityType === ExtendedEntitiesTypeDict.MEModelWithSynapses) &&
        entity && (
          <div className="rounded-lg">
            <ModelPreview model={entity} />
          </div>
        )}
    </>
  );
}
