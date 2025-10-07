import { useEffect } from 'react';
import noop from 'es-toolkit/compat/noop';

import { isBrowser } from '@/utils/environment';

export type TNewProjectClickEvent = {
  on: boolean;
};

const NewProjectClickEvent = 'NewProjectClickEvent' as const;

export const makeNewProjectClickEvent = (detail: TNewProjectClickEvent) => {
  const event = new CustomEvent<TNewProjectClickEvent>(NewProjectClickEvent, {
    detail,
  });
  if (isBrowser()) window.dispatchEvent(event);
};

const isNewProjectClickEvent = (event: Event): event is CustomEvent<TNewProjectClickEvent> => {
  return event instanceof CustomEvent && event.type === NewProjectClickEvent;
};

export const newProjectClickEventListener = (
  cb: (event: CustomEvent<TNewProjectClickEvent>) => void
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isNewProjectClickEvent(event)) {
        cb(event);
      }
    };
    window.addEventListener(NewProjectClickEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
};

export const useNewProjectClickEvent = (
  cb: (event: CustomEvent<TNewProjectClickEvent>) => void
) => {
  useEffect(() => {
    const unsubscribe = newProjectClickEventListener(cb);
    return () => unsubscribe();
  }, [cb]);
};
