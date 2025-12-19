import { noop } from 'es-toolkit/compat';
import { atom } from 'jotai';
import { useAtom } from 'jotai/react';
import { useEffect } from 'react';

import { isBrowser } from '@/utils/environment';

export type TSelectedExploreEntity<T> = {
  display: boolean;
  data: T | null;
};

const SelectEntityClickEvent = 'SelectEntityClickEvent' as const;

export const makeSelectEntityClickEvent = <T>(detail: TSelectedExploreEntity<T>) => {
  const event = new CustomEvent<TSelectedExploreEntity<T>>(SelectEntityClickEvent, {
    detail,
  });
  if (isBrowser()) window.dispatchEvent(event);
};

const isVirtualLabClickEvent = <T>(
  event: Event,
): event is CustomEvent<TSelectedExploreEntity<T>> => {
  return event instanceof CustomEvent && event.type === SelectEntityClickEvent;
};

export const virtualLabClickEventListener = <T>(
  cb: (event: CustomEvent<TSelectedExploreEntity<T>>) => void,
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isVirtualLabClickEvent<T>(event)) {
        cb(event);
      }
    };
    window.addEventListener(SelectEntityClickEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
};

export const useSelectEntityClickEvent = <T>(
  cb: (event: CustomEvent<TSelectedExploreEntity<T>>) => void,
) => {
  useEffect(() => {
    const unsubscribe = virtualLabClickEventListener(cb);
    return () => unsubscribe();
  }, [cb]);
};

export const MiniDetailViewSearchParam = 'mdv';

export const miniDetailViewDisplayAtom = atom(false);

export const useMiniDetailView = () => {
  const [mdv, setMdv] = useAtom(miniDetailViewDisplayAtom);
  return { mdv, setMdv };
};
