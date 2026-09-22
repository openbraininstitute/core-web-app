import { renderHook } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it } from 'vitest';

import { useScanConfigTab } from '@/features/scan-config/hooks/use-scan-config-tab';
import {
  BuildScanConfigTabs,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  SimulateScanConfigTabs,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

function renderTab(
  searchParams: string,
  activity = ScanConfigActivity.Simulate,
  defaultTab: TScanConfigTabs = ScanConfigDefaultTab
) {
  return renderHook(() => useScanConfigTab(activity, defaultTab), {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter searchParams={searchParams}>{children}</NuqsTestingAdapter>
    ),
  });
}

describe('useScanConfigTab', () => {
  it('reads the active tab from the URL', () => {
    const { result } = renderTab('?tab=simulations');

    expect(result.current[0]).toEqual({
      id: SimulateScanConfigTabs.simulations,
      __activity: ScanConfigActivity.Simulate,
    });
  });

  it('falls back to the default tab when the param is absent', () => {
    const { result } = renderTab('');

    expect(result.current[0].id).toBe(SimulateScanConfigTabs.configuration);
  });

  it('falls back to the default tab for an id the activity has no tab for', () => {
    const { result } = renderTab('?tab=simulations', ScanConfigActivity.Build, {
      id: BuildScanConfigTabs.configuration,
      __activity: ScanConfigActivity.Build,
    });

    expect(result.current[0].id).toBe(BuildScanConfigTabs.configuration);
  });

  it('honours a workflow default that is a results tab', () => {
    const { result } = renderTab('', ScanConfigActivity.Build, {
      id: BuildScanConfigTabs.results,
      __activity: ScanConfigActivity.Build,
    });

    expect(result.current[0].id).toBe(BuildScanConfigTabs.results);
  });
});
