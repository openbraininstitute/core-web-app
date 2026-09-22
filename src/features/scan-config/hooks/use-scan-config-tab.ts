'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useCallback } from 'react';

import { ScanConfigTabSearchParam } from '@/features/scan-config/helpers';
import {
  ScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

type TScanConfigTabId = TScanConfigTabs['id'];

/**
 * Active scan-config tab, held in the URL instead of component state.
 *
 * Only the id travels; `__activity` is always the editor's own activity. Ids are validated
 * against that activity's tab set, so one left over from another workflow falls back to
 * `defaultTab`. Updates are shallow and replace the history entry, so switching tabs neither
 * re-runs the server render nor stacks back-button steps.
 */
export function useScanConfigTab(
  activity: TScanConfigActivity,
  defaultTab: TScanConfigTabs
): [TScanConfigTabs, (tab: TScanConfigTabs) => void] {
  const [id, setId] = useQueryState(
    ScanConfigTabSearchParam,
    parseAsStringLiteral(
      Object.values(ScanConfigTabs[activity]) as readonly TScanConfigTabId[]
    ).withDefault(defaultTab.id)
  );

  const setTab = useCallback((next: TScanConfigTabs) => setId(next.id), [setId]);

  return [{ id, __activity: activity } as TScanConfigTabs, setTab];
}
