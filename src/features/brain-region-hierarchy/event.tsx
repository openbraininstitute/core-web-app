import noop from 'es-toolkit/compat/noop';
import { isBrowser } from '@/utils/environment';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export type TBrainRegionClickEvent = {
  dataKey: string;
  node: IBrainRegionHierarchy;
};

const BrainRegionClickEvent = 'BrainRegionClickEvent' as const;

export const makeBrainRegionClickEvent = (detail: TBrainRegionClickEvent) => {
  const event = new CustomEvent<TBrainRegionClickEvent>(BrainRegionClickEvent, {
    detail,
  });
  if (isBrowser()) window.dispatchEvent(event);
};

const isBrainRegionClickEvent = (event: Event): event is CustomEvent<TBrainRegionClickEvent> => {
  return event instanceof CustomEvent && event.type === BrainRegionClickEvent;
};

export const brainRegionClickEventListener = (
  cb: (event: CustomEvent<TBrainRegionClickEvent>) => void
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isBrainRegionClickEvent(event)) {
        cb(event);
      }
    };
    window.addEventListener(BrainRegionClickEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
};
