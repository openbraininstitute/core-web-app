import React from 'react';

import type {
  AiAssistantHistory,
  AiAssistantHistoryItem,
} from '@/services/ai-agent/assistant/types';
import { logError } from '@/util/logger';

export function useSections(history: AiAssistantHistory) {
  return React.useMemo(() => {
    const cases: [title: string, days: number][] = [
      ['Today', 1],
      ['Yesterday', 2],
      ['Last 7 days', 7],
      ['Last 30 days', 30],
    ];
    const sections: Array<{ title: string; list: AiAssistantHistory }> = cases.map(([title]) => ({
      title,
      list: [],
    }));
    let currentList = history.slice();
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
      const newList: AiAssistantHistoryItem[] = [];
      // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
      const [_, days] = cases[caseIndex];
      for (const thread of currentList) {
        if (deltaDays(thread, days)) {
          sections[caseIndex].list.push(thread);
        } else {
          newList.push(thread);
        }
      }
      currentList = newList;
    }
    if (currentList.length > 0) {
      sections.push({ title: 'Older conversations', list: currentList });
    }
    return sections;
  }, [history]);
}

function deltaDays(thread: AiAssistantHistoryItem, days: number) {
  try {
    const SECONDS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = new Date();
    const delta =
      Math.floor(now.valueOf() / SECONDS_PER_DAY) -
      Math.floor(thread.date.valueOf() / SECONDS_PER_DAY);
    return delta < days;
  } catch (_ex) {
    logError('Unable to read the date from this thread:', thread);
    return false;
  }
}
