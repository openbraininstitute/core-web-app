import { useEffect } from 'react';
import noop from 'lodash/noop';

import { isBrowser } from '@/utils/environment';

export type TTriggerProfileClickEvent = {
  on: boolean;
};

const TriggerProfileClickEvent = 'TriggerProfileClickEvent' as const;

export const makeTriggerProfileClickEvent = (detail: TTriggerProfileClickEvent) => {
  const event = new CustomEvent<TTriggerProfileClickEvent>(TriggerProfileClickEvent, {
    detail,
  });
  if (isBrowser()) window.dispatchEvent(event);
};

const isProfileClickEvent = (event: Event): event is CustomEvent<TTriggerProfileClickEvent> => {
  return event instanceof CustomEvent && event.type === TriggerProfileClickEvent;
};

export const profileClickEventListener = (
  cb: (event: CustomEvent<TTriggerProfileClickEvent>) => void
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isProfileClickEvent(event)) {
        cb(event);
      }
    };
    window.addEventListener(TriggerProfileClickEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
};

export const useProfileClickEvent = (
  cb: (event: CustomEvent<TTriggerProfileClickEvent>) => void
) => {
  useEffect(() => {
    const unsubscribe = profileClickEventListener(cb);
    return () => unsubscribe();
  }, [cb]);
};
