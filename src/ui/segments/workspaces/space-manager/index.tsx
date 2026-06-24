'use client';

import { useCallback, useState } from 'react';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  WorkspaceManagerKindDict,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  type TTriggerWorkspaceConfigurationClickEvent,
  useWorkspaceConfigurationClickEvent,
  WorkspaceActions,
  type WorkspaceActionType,
} from '@/ui/segments/workspaces/space-manager/event';

import { WorkspaceManagerModal } from './modal';

type TProjectPreviewPayload = {
  projectId?: string | null;
  virtualLabId?: string | null;
  data?: {
    id?: string | null;
    virtual_lab_id?: string | null;
  } | null;
};

type TVirtualLabPayload = {
  virtualLabId?: string | null;
  data?: {
    id?: string | null;
  } | null;
};

const ProfileSectionDict = {
  Invoices: 'invoices',
  Profile: 'profile',
  Subscription: 'subscription',
} as const;
type TProfileSection = (typeof ProfileSectionDict)[keyof typeof ProfileSectionDict];

type TProfilePayload = {
  section?: TProfileSection;
};

const NewProjectPayloadDict = {
  FixedVirtualLab: 'fixed-virtual-lab',
  SelectVirtualLab: 'select-virtual-lab',
} as const;

type TNewProjectPayload = (typeof NewProjectPayloadDict)[keyof typeof NewProjectPayloadDict];

type NewProjectPayload = {
  mode?: TNewProjectPayload;
  virtualLabId?: string | null;
};

export function SpaceManagerContainer() {
  const { virtualLabId, projectId } = useWorkspace();
  const [contextConfig, updateContextConfig] = useState<{
    open: boolean;
    type: WorkspaceActionType;
    payload: unknown;
  }>({
    open: false,
    type: null,
    payload: null,
  });

  const onClose = () => {
    updateContextConfig({ open: false, type: null, payload: null });
    makeTriggerWorkspaceConfigurationClickEvent<null>({ on: false, data: null, type: null });
  };

  useWorkspaceConfigurationClickEvent(
    useCallback((data: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<unknown>>) => {
      const incomingType = data.detail.type;
      const shouldOpen = data.detail.on;
      updateContextConfig({ open: shouldOpen, type: incomingType, payload: data.detail.data });
    }, [])
  );

  if (!virtualLabId || !projectId || !contextConfig.type) return null;

  const payload = contextConfig.payload;

  if (contextConfig.type === WorkspaceActions.NewProject) {
    const newProjectPayload = payload as NewProjectPayload | null;
    const targetVirtualLabId =
      newProjectPayload?.mode === NewProjectPayloadDict.FixedVirtualLab
        ? (newProjectPayload.virtualLabId ?? virtualLabId)
        : undefined;

    return (
      <WorkspaceManagerModal
        key={contextConfig.type}
        kind={WorkspaceManagerKindDict.Project}
        open={contextConfig.open}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        section={WorkspaceManagerSectionDict.New}
        targetVirtualLabId={targetVirtualLabId}
        virtualLabId={virtualLabId}
      />
    );
  }

  if (contextConfig.type === WorkspaceActions.ProfileSettings) {
    const section = (payload as TProfilePayload | null)?.section ?? ProfileSectionDict.Profile;
    return (
      <WorkspaceManagerModal
        key={contextConfig.type}
        kind={WorkspaceManagerKindDict.Account}
        open={contextConfig.open}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        section={section}
        virtualLabId={virtualLabId}
      />
    );
  }

  if (contextConfig.type === WorkspaceActions.VirtualLabConfiguration) {
    const virtualLabPayload = payload as TVirtualLabPayload | null;
    const targetVirtualLabId =
      virtualLabPayload?.virtualLabId ?? virtualLabPayload?.data?.id ?? virtualLabId;
    return (
      <WorkspaceManagerModal
        key={contextConfig.type}
        kind={WorkspaceManagerKindDict.VirtualLab}
        open={contextConfig.open}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        section={WorkspaceManagerSectionDict.Overview}
        targetVirtualLabId={targetVirtualLabId}
        virtualLabId={virtualLabId}
      />
    );
  }

  if (contextConfig.type === WorkspaceActions.ProjectPreview) {
    const projectPayload = payload as TProjectPreviewPayload | null;
    const targetProjectId = projectPayload?.projectId ?? projectPayload?.data?.id;
    const targetVirtualLabId = projectPayload?.virtualLabId ?? projectPayload?.data?.virtual_lab_id;
    if (!targetProjectId || !targetVirtualLabId) return null;

    return (
      <WorkspaceManagerModal
        key={contextConfig.type}
        kind={WorkspaceManagerKindDict.Project}
        open={contextConfig.open}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        section={WorkspaceManagerSectionDict.Overview}
        targetProjectId={targetProjectId}
        targetVirtualLabId={targetVirtualLabId}
        virtualLabId={virtualLabId}
      />
    );
  }

  return null;
}

export { makeTriggerWorkspaceConfigurationClickEvent } from './event';
