'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useCallback } from 'react';

import { ScanConfigTabSearchParam } from '@/features/scan-config/helpers';
import {
  BaseScanConfigTabs,
  ScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

type TScanConfigTabId = TScanConfigTabs['id'];

/**
 * Active scan-config tab, held in the URL instead of component state.
 */
export function useScanConfigTab(
  activity: TScanConfigActivity,
  defaultTab: TScanConfigTabs,
  resultsTabId?: TScanConfigTabId
): [TScanConfigTabs, (tab: TScanConfigTabs) => void] {
  const availableTabs = Object.values(ScanConfigTabs[activity]).filter(
    (id) => !resultsTabId || id === BaseScanConfigTabs.configuration || id === resultsTabId
  );
  const [id, setId] = useQueryState(
    ScanConfigTabSearchParam,
    parseAsStringLiteral(availableTabs as readonly TScanConfigTabId[]).withDefault(defaultTab.id)
  );

  const setTab = useCallback((next: TScanConfigTabs) => setId(next.id), [setId]);

  return [{ id, __activity: activity } as TScanConfigTabs, setTab];
}
