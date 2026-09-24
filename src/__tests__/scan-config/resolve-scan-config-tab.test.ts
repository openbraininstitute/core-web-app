import { describe, expect, it } from 'vitest';

import { resolveScanConfigTab, ScanConfigResultsTab } from '@/features/scan-config/helpers';
import {
  BuildScanConfigTabs,
  ProcessScanConfigTabs,
  ScanConfigActivity,
  SimulateScanConfigTabs,
} from '@/features/scan-config/types';

describe('resolveScanConfigTab', () => {
  it('keeps the URL tab while the editor holds a campaign', () => {
    const tab = ScanConfigResultsTab[ScanConfigActivity.Simulate];

    expect(resolveScanConfigTab(tab, ScanConfigActivity.Simulate, true)).toBe(tab);
  });

  it.each([
    [ScanConfigActivity.Simulate, SimulateScanConfigTabs.configuration],
    [ScanConfigActivity.Process, ProcessScanConfigTabs.configuration],
    [ScanConfigActivity.Build, BuildScanConfigTabs.configuration],
  ])('falls back to %s configuration when there is no campaign', (activity, configurationId) => {
    // reload or shared link after Generate: `?tab=<results>` survives, the campaign id does not
    const resolved = resolveScanConfigTab(ScanConfigResultsTab[activity], activity, false);

    expect(resolved).toEqual({ id: configurationId, __activity: activity });
  });

  it('leaves the configuration tab alone when there is no campaign', () => {
    const tab = {
      id: SimulateScanConfigTabs.configuration,
      __activity: ScanConfigActivity.Simulate,
    } as const;

    expect(resolveScanConfigTab(tab, ScanConfigActivity.Simulate, false)).toEqual(tab);
  });
});
