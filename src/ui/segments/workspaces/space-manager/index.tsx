'use client';

import { useCallback, useState } from 'react';
import { match } from 'ts-pattern';
import { usePrevious } from '@/hooks/hooks';
import { useDisableWorkspaceModalFullHeight } from '@/ui/hooks/use-disable-workspace-modal-full-height';
import { useResetQueryParams } from '@/ui/hooks/use-reset-query-params';
import { Modal } from '@/ui/molecules/modal';
import { AccountSettings } from '@/ui/segments/profile';
import { ProjectCreation } from '@/ui/segments/project/create';
import { ProjectPreview } from '@/ui/segments/project/preview';
import { VirtualLabConfiguration } from '@/ui/segments/virtual-lab-settings';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  type TTriggerWorkspaceConfigurationClickEvent,
  useWorkspaceConfigurationClickEvent,
  WorkspaceActions,
  type WorkspaceActionType,
} from '@/ui/segments/workspaces/space-manager/event';

export function SpaceManagerContainer() {
  const resetQueryParams = useResetQueryParams();
  const [contextConfig, updateContextConfig] = useState<{
    open: boolean;
    type: WorkspaceActionType;
    payload: any;
  }>({
    open: false,
    type: null,
    payload: null,
  });

  const previousContext = usePrevious(contextConfig);

  const onClose = () => {
    resetQueryParams();
    updateContextConfig({ open: false, type: null, payload: null });
    makeTriggerWorkspaceConfigurationClickEvent<null>({ on: false, data: null, type: null });
  };

  useDisableWorkspaceModalFullHeight({
    modalId: 'modal-dialog',
    condition:
      contextConfig.type === WorkspaceActions.NewProject ||
      contextConfig.type === WorkspaceActions.ProjectPreview,
    className:
      contextConfig.type === WorkspaceActions.NewProject ||
      contextConfig.type === WorkspaceActions.ProjectPreview
        ? ['h-auto']
        : ['h-max'],
    classNameToRemove:
      contextConfig.type === WorkspaceActions.NewProject ||
      contextConfig.type === WorkspaceActions.ProjectPreview
        ? ['h-full']
        : [],
  });

  useWorkspaceConfigurationClickEvent(
    useCallback((data: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<any>>) => {
      const incomingType = data.detail.type;
      const shouldOpen = data.detail.on;
      updateContextConfig({ open: shouldOpen, type: incomingType, payload: data.detail.data });
    }, [])
  );

  const content = match({ type: contextConfig.type })
    .with({ type: WorkspaceActions.NewProject }, () => <ProjectCreation onClose={onClose} />)
    .with({ type: WorkspaceActions.ProfileSettings }, () => (
      <AccountSettings onClose={onClose} data={contextConfig.payload} />
    ))
    .with({ type: WorkspaceActions.VirtualLabConfiguration }, () => (
      <VirtualLabConfiguration onClose={onClose} payload={contextConfig.payload} />
    ))
    .with({ type: WorkspaceActions.ProjectPreview }, () => (
      <ProjectPreview onClose={onClose} payload={contextConfig.payload} />
    ))
    .otherwise(() => null);

  return (
    <Modal
      id="workspace-manager-modal"
      maskClosable
      open={contextConfig.open}
      size="lg"
      onClose={onClose}
      width="calc(100vw - 24.9rem)" // this the width of the space-switcher in the left
      className="bg-primary-9 top-3 right-3 h-full min-h-[400px] translate-0 transform-none! rounded-md"
      animation="fade"
      maxHeight="calc(100vh - 1rem)"
      bodyClassName="flex flex-col h-full max-h-[calc(100vh-1rem)] min-h-0 overflow-hidden p-0"
      position="right"
      afterOpen={() => {
        if (previousContext?.type !== contextConfig.type) {
          resetQueryParams();
        }
      }}
    >
      <div
        id="workspace-manager-modal-content"
        className="h-full min-h-0 flex-1 overflow-hidden px-6 py-4 transition-opacity duration-200 ease-in-out"
      >
        {content}
      </div>
    </Modal>
  );
}
