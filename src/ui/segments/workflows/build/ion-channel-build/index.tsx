'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { match, P } from 'ts-pattern';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import {
  GenerationWorkflowFormPanel,
  GenerationWorkflowFormPanelKeys,
} from '@/ui/segments/workflows/build/ion-channel-build/elements/panel-tabs';
import {
  IonChannelModelingSharedStateFamily,
  useGenerativeFormSchemaApi,
} from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import { Configuration } from '@/ui/segments/workflows/build/ion-channel-build/sections/configuration';
import { Output } from '@/ui/segments/workflows/build/ion-channel-build/sections/output';

import 'katex/dist/katex.min.css';

import { ButtonCopyId } from '@/ui/molecules/button-copy-id';

export function IonChannelModelBuilding({
  sessionId,
  originalConfig,
  readonly,
  originalCampaignId,
}: {
  sessionId: string;
  originalConfig?: Record<string, any> | null;
  readonly?: boolean;
  originalCampaignId?: string;
}) {
  useDisableElementOverflow({ id: 'workspace-body' });
  const { data: RootSchema, isLoading } = useGenerativeFormSchemaApi({
    form: 'IonChannelFittingScanConfig',
  });

  const [ionState, updateIoChannelState] = useAtom(
    useMemo(() => IonChannelModelingSharedStateFamily(sessionId!), [sessionId])
  );

  const effectiveCampaignId = readonly ? originalCampaignId : (ionState.campaignId ?? undefined);

  const section = match({ isLoading, RootSchema, panel: ionState.panel })
    .with({ isLoading: true }, () => (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    ))
    .with({ isLoading: false, RootSchema: P.nullish }, () => {
      return (
        <div className="flex items-center justify-center">
          No schema for ION channel building was found
        </div>
      );
    })
    .with({ isLoading: false, panel: GenerationWorkflowFormPanelKeys.configuration }, () => {
      return <Configuration {...{ sessionId, originalConfig, readonly }} />;
    })
    .with({ isLoading: false, panel: GenerationWorkflowFormPanelKeys.output }, () => {
      return <Output {...{ sessionId, readonly, campaignId: effectiveCampaignId }} />;
    })
    .otherwise(() => null);

  const content = (
    <>
      <div className="bg-background flex items-center justify-between px-2 pb-4">
        <GenerationWorkflowFormPanel
          value={ionState.panel}
          onChange={(value) => updateIoChannelState({ ...ionState, panel: value })}
          disabledTabs={
            !readonly && !ionState.buildRequested
              ? [GenerationWorkflowFormPanelKeys.output]
              : undefined
          }
        />
        {effectiveCampaignId && (
          <ButtonCopyId value={effectiveCampaignId} label="Copy build campaign ID" />
        )}
      </div>

      {section}
    </>
  );

  if (readonly) return content;
  return (
    <div className="border-neutral-2 ml-4 flex h-full w-[calc(100%-1.5rem)] flex-col rounded-2xl border p-3 px-2">
      {content}
    </div>
  );
}
