'use client';

import { useState } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import { IonChannelRecording } from '@/entity-configuration/domain/experimental/ion-channel-recording';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { EmodelRelatedArtifacts } from '@/ui/segments/detail-view/related-artifacts/ion-channel-model/e-model';
import { IonChannelRecordingRelatedArtifacts } from '@/ui/segments/detail-view/related-artifacts/ion-channel-model/ion-channel-recording';
import { RelatedArtifactEvents } from '@/ui/segments/detail-view/related-artifacts/ion-channel-model/table-click-events';
import {
  detailViewPillTabsListClass,
  detailViewPillTabsTriggerClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { WorkspaceContext } from '@/types/common';

type TKeys = typeof IonChannelRecording.extendedType | typeof Emodel.extendedType;
const tabsConfigItems: Array<{
  key: TKeys;
  title: string;
}> = [
  {
    key: IonChannelRecording.extendedType,
    title: `${IonChannelRecording.title} (Experimental)`,
  },
  {
    key: Emodel.extendedType,
    title: `${Emodel.title} (model)`,
  },
];

export function ICMRelatedArtifacts({
  icm,
  context,
  variant = ViewVariant.Light,
}: {
  icm: IonChannelModel;
  context: WorkspaceContext;
  variant?: TViewVariant;
}) {
  const breakpoint = useDefaultBreakpoint();
  const [currentTab, setCurrentTab] = useState<TKeys>(IonChannelRecording.extendedType);

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <RelatedArtifactEvents />
      <PillTabs
        id="related-artifact-selector"
        data-testid="related-artifact-selector"
        value={currentTab}
        activationMode="manual"
        onValueChange={(value) => setCurrentTab(value as TKeys)}
      >
        <PillTabsList
          className={detailViewPillTabsListClass(variant, cn({ 'h-12': breakpoint === 'xl' }))}
        >
          {tabsConfigItems.map((tab) => (
            <PillTabsTrigger
              key={tab.key}
              value={tab.key}
              className={detailViewPillTabsTriggerClass(
                variant,
                cn({ 'h-12': breakpoint === 'xl' })
              )}
            >
              {tab.title}
            </PillTabsTrigger>
          ))}
        </PillTabsList>
      </PillTabs>
      <div className="flex-1 min-h-0 overflow-hidden">
        {currentTab === IonChannelRecording.extendedType && (
          <IonChannelRecordingRelatedArtifacts context={context} icm={icm} variant={variant} />
        )}
        {currentTab === Emodel.extendedType && (
          <EmodelRelatedArtifacts icm={icm} variant={variant} />
        )}
      </div>
    </div>
  );
}
