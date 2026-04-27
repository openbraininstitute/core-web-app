'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const closePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextTypeRef = useRef<WorkspaceActionType>(null);
  contextTypeRef.current = contextConfig.type;

  const cancelPendingPreviewClose = useCallback(() => {
    if (closePreviewTimerRef.current) {
      clearTimeout(closePreviewTimerRef.current);
      closePreviewTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (closePreviewTimerRef.current) clearTimeout(closePreviewTimerRef.current);
    },
    []
  );

  const onClose = () => {
    cancelPendingPreviewClose();
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
    useCallback(
      (data: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<any>>) => {
        const incomingType = data.detail.type;
        const shouldOpen = data.detail.on;

        cancelPendingPreviewClose();

        const isSidePanelType = (t: WorkspaceActionType) =>
          t === WorkspaceActions.ProjectPreview || t === WorkspaceActions.VirtualLabConfiguration;

        const isSidePanelClose =
          !shouldOpen &&
          (isSidePanelType(incomingType) ||
            (incomingType === null && isSidePanelType(contextTypeRef.current)));

        if (isSidePanelClose) {
          closePreviewTimerRef.current = setTimeout(() => {
            updateContextConfig({ open: false, type: null, payload: null });
            closePreviewTimerRef.current = null;
          }, 120);
          return;
        }

        updateContextConfig({ open: shouldOpen, type: incomingType, payload: data.detail.data });
      },
      [cancelPendingPreviewClose]
    )
  );

  const pathname = usePathname();
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname change should close the modal
  useEffect(() => {
    updateContextConfig({ open: false, type: null, payload: null });
  }, [pathname]);

  const content = match({ type: contextConfig.type })
    .with({ type: WorkspaceActions.NewProject }, () => <ProjectCreation onClose={onClose} />)
    .with({ type: WorkspaceActions.ProfileSettings }, () => (
      <AccountSettings onClose={onClose} data={contextConfig.payload} />
    ))
    .otherwise(() => null);

  const sidePanelType =
    contextConfig.type === WorkspaceActions.ProjectPreview ||
    contextConfig.type === WorkspaceActions.VirtualLabConfiguration
      ? contextConfig.type
      : null;

  if (sidePanelType) {
    return (
      <SidePanel
        sidePanelType={sidePanelType}
        contextConfig={contextConfig}
        onClose={onClose}
        cancelPendingPreviewClose={cancelPendingPreviewClose}
      />
    );
  }

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

type SidePanelProps = {
  sidePanelType: typeof WorkspaceActions.ProjectPreview | typeof WorkspaceActions.VirtualLabConfiguration;
  contextConfig: { open: boolean; type: WorkspaceActionType; payload: any };
  onClose: () => void;
  cancelPendingPreviewClose: () => void;
};

function SidePanel({
  sidePanelType,
  contextConfig,
  onClose,
  cancelPendingPreviewClose,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!contextConfig.open) return;
    const payload = contextConfig.payload;
    let triggerEl: HTMLElement | null = null;
    if (sidePanelType === WorkspaceActions.ProjectPreview && payload?.projectId) {
      triggerEl = document.getElementById(`project-item-${payload.projectId}`);
    } else if (
      sidePanelType === WorkspaceActions.VirtualLabConfiguration &&
      payload?.virtualLabId
    ) {
      triggerEl = document.getElementById(`virtual-lab-item-${payload.virtualLabId}`);
    }
    if (!triggerEl) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const triggerCenter = triggerRect.top + triggerRect.height / 2;
    const panelHeight = panelRef.current?.offsetHeight ?? 400;
    const margin = 12;
    const desired = triggerCenter - panelHeight / 2;
    const clamped = Math.max(
      margin,
      Math.min(desired, window.innerHeight - panelHeight - margin)
    );
    setTop(clamped);
  }, [contextConfig.open, contextConfig.payload, sidePanelType]);

  const sidePanelContent =
    sidePanelType === WorkspaceActions.ProjectPreview ? (
      <ProjectPreview onClose={onClose} payload={contextConfig.payload} />
    ) : (
      <VirtualLabConfiguration onClose={onClose} payload={contextConfig.payload} />
    );

  return (
    <div
      ref={panelRef}
      id="workspace-manager-modal"
      role="dialog"
      aria-modal="false"
      className="bg-primary-9 fixed right-3 z-50 flex flex-col overflow-hidden rounded-md shadow-2xl transition-opacity duration-150"
      style={{
        width: 'calc(100vw - 24.9rem)',
        maxHeight: 'calc(100vh - 1rem)',
        minHeight: 400,
        top: top ?? 12,
        opacity: contextConfig.open && top !== null ? 1 : 0,
        pointerEvents: contextConfig.open ? 'auto' : 'none',
      }}
      onMouseEnter={cancelPendingPreviewClose}
      onMouseLeave={() =>
        makeTriggerWorkspaceConfigurationClickEvent({
          on: false,
          type: sidePanelType,
          data: null,
        })
      }
    >
      <div
        id="workspace-manager-modal-content"
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-6 py-4"
      >
        {sidePanelContent}
      </div>
    </div>
  );
}
