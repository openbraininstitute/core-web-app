import { useEffect } from 'react';
import noop from 'lodash/noop';

import { isBrowser } from '@/utils/environment';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type TSelectedContributionType = {
  display: boolean;
  entityType: TExtendedEntitiesTypeDict | null;
  sessionId: string | null;
};

const SelectContributionEntityClickEvent = 'SelectContributionEntityClickEvent' as const;

export const makeSelectContributionEntityClickEvent = (detail: TSelectedContributionType) => {
  const event = new CustomEvent<TSelectedContributionType>(SelectContributionEntityClickEvent, {
    detail,
  });
  if (isBrowser()) window.dispatchEvent(event);
};

const isContributionClickEvent = (
  event: Event
): event is CustomEvent<TSelectedContributionType> => {
  return event instanceof CustomEvent && event.type === SelectContributionEntityClickEvent;
};

export const ContributionClickEventListener = (
  cb: (event: CustomEvent<TSelectedContributionType>) => void
) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  if (isBrowser()) {
    const handler: EventListener = (event: Event) => {
      if (isContributionClickEvent(event)) {
        cb(event);
      }
    };
    window.addEventListener(SelectContributionEntityClickEvent, handler, { signal });

    return () => abortController.abort();
  }

  return noop;
};

export const useContributionEntityClickEvent = (
  cb: (event: CustomEvent<TSelectedContributionType>) => void
) => {
  useEffect(() => {
    const unsubscribe = ContributionClickEventListener(cb);
    return () => unsubscribe();
  }, [cb]);
};
