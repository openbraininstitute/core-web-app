'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { match, P } from 'ts-pattern';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AutomatedFormBreadcrumb } from '@/ui/segments/workflows/build/ion-channel-build/elements/breadcrumb';
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

import useDisableElementOverflow from '@/ui/hooks/use-disable-element-overflow';

export function IonChannelModelBuilding({
  sessionId,
  initialConfig,
  readonly,
}: {
  sessionId: string;
  initialConfig?: Record<string, any> | null;
  readonly?: boolean;
}) {
  useDisableElementOverflow({ id: 'workspace-body' });
  const { virtualLabId, projectId } = useWorkspace();
  const { data: RootSchema, isLoading } = useGenerativeFormSchemaApi({
    form: 'IonChannelFittingScanConfig',
  });

  const [ionState, updateIoChannelState] = useAtom(
    useMemo(() => IonChannelModelingSharedStateFamily(sessionId!), [sessionId])
  );

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
      return (
        <Configuration sessionId={sessionId} initialConfig={initialConfig} readonly={readonly} />
      );
    })
    .with({ isLoading: false, panel: GenerationWorkflowFormPanelKeys.output }, () => {
      return (
        <Output
          sessionId={sessionId}
          readonly={readonly}
          campaignId={readonly ? sessionId : undefined}
        />
      );
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
        <AutomatedFormBreadcrumb
          category={{
            label: 'Build',
            link: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`,
            isUrl: true,
          }}
          type={{ label: 'Ion Channel Model', link: '', isUrl: false }}
        />
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
