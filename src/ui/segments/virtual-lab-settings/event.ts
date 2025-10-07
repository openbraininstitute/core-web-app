import { useEffect } from 'react';
import noop from 'es-toolkit/compat/noop';

import { isBrowser } from '@/utils/environment';

import type { VirtualLab } from '@/api/virtual-lab-svc/queries/types';

export type TSelectedVirtualLabClickEvent = {
  virtualLabId: string | null;
  data: (VirtualLab & { isMine: boolean }) | null;
};

const SelectVirtualLabClickEvent = 'SelectVirtualLabClickEvent' as const;

export const makeSelectVirtualLabClickEvent = (detail: TSelectedVirtualLabClickEvent) => {
  const event = new CustomEvent<TSelectedVirtualLabClickEvent>(SelectVirtualLabClickEvent, {
    detail,
  });
  if (isBrowser()) window.dispatchEvent(event);
};

const isVirtualLabClickEvent = (
  event: Event
): event is CustomEvent<TSelectedVirtualLabClickEvent> => {
  return event instanceof CustomEvent && event.type === SelectVirtualLabClickEvent;
};

export const virtualLabClickEventListener = (
  cb: (event: CustomEvent<TSelectedVirtualLabClickEvent>) => void
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isVirtualLabClickEvent(event)) {
        cb(event);
      }
    };
    window.addEventListener(SelectVirtualLabClickEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
};

export const useVirtualLabClickEvent = (
  cb: (event: CustomEvent<TSelectedVirtualLabClickEvent>) => void
) => {
  useEffect(() => {
    const unsubscribe = virtualLabClickEventListener(cb);
    return () => unsubscribe();
  }, [cb]);
};
