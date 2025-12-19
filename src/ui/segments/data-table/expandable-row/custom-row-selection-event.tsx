import noop from 'es-toolkit/compat/noop';
import { isBrowser } from '@/utils/environment';

const CustomRowSelectionEvent = 'CustomRowSelectionEvent' as const;

export type TCustomRowSelectionEvent<T> = {
  record?: T;
};

export function makeCustomRowSelectionEvent<T>(detail: TCustomRowSelectionEvent<T>) {
  const event = new CustomEvent<TCustomRowSelectionEvent<T>>(CustomRowSelectionEvent, {
    detail,
  });
  if (isBrowser()) window.dispatchEvent(event);
}

function isCustomRowSelectionEvent<T>(
  event: Event,
): event is CustomEvent<TCustomRowSelectionEvent<T>> {
  return event instanceof CustomEvent && event.type === CustomRowSelectionEvent;
}

export function customRowSelectionEventListener<T>(
  cb: (event: CustomEvent<TCustomRowSelectionEvent<T>>) => void,
) {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isCustomRowSelectionEvent<T>(event)) {
        cb(event);
      }
    };
    window.addEventListener(CustomRowSelectionEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
}
