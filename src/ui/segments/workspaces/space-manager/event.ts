import noop from 'es-toolkit/compat/noop';
import { useEffect } from 'react';

import { isBrowser } from '@/utils/environment';

export const WorkspaceActions = {
  NewProject: 'new-project',
  VirtualLabConfiguration: 'virtual-lab-configuration',
  ProfileSettings: 'profile-settings',
  ProjectPreview: 'project-preview',
} as const;

export type WorkspaceActionType = (typeof WorkspaceActions)[keyof typeof WorkspaceActions] | null;

export type TTriggerWorkspaceConfigurationClickEvent<T> = {
  on: boolean;
  type: WorkspaceActionType;
  data: T | null;
};

const TriggerWorkspaceConfigurationClickEvent = 'TriggerWorkspaceConfigurationClickEvent' as const;

export const makeTriggerWorkspaceConfigurationClickEvent = <T>(
  detail: TTriggerWorkspaceConfigurationClickEvent<T>
) => {
  const event = new CustomEvent<TTriggerWorkspaceConfigurationClickEvent<T>>(
    TriggerWorkspaceConfigurationClickEvent,
    {
      detail,
    }
  );
  if (isBrowser()) window.dispatchEvent(event);
};

const isWorkspaceConfigurationClickEvent = <T>(
  event: Event
): event is CustomEvent<TTriggerWorkspaceConfigurationClickEvent<T>> => {
  return event instanceof CustomEvent && event.type === TriggerWorkspaceConfigurationClickEvent;
};

export const workspaceConfigurationClickEventListener = <T>(
  cb: (event: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<T>>) => void
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isWorkspaceConfigurationClickEvent(event)) {
        cb(event as CustomEvent<TTriggerWorkspaceConfigurationClickEvent<T>>);
      }
    };
    window.addEventListener(TriggerWorkspaceConfigurationClickEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
};

export const useWorkspaceConfigurationClickEvent = <T>(
  cb: (event: CustomEvent<TTriggerWorkspaceConfigurationClickEvent<T>>) => void
) => {
  useEffect(() => {
    const unsubscribe = workspaceConfigurationClickEventListener(cb);
    return () => unsubscribe();
  }, [cb]);
};
