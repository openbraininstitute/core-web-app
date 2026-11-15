import { ScanConfigActivity } from '@/features/scan-config/types';

import type { TScanConfigActivity } from '@/features/scan-config/types';

/** The activities whose past campaigns open on an overview of inputs → runs → outputs. */
const OVERVIEW_ACTIVITIES: ReadonlySet<string> = new Set([
  ScanConfigActivity.Simulate,
  ScanConfigActivity.Build,
  ScanConfigActivity.Extract,
  ScanConfigActivity.Process,
  ScanConfigActivity.Optimize,
]);

/**
 * Whether a campaign of `activity` has an overview: a simulation's runs are found from the
 * campaign, a task campaign's through its task types. Known before anything loads, so the tab
 * strip is the same from the first frame.
 */
export function hasOverview(activity: TScanConfigActivity, hasTaskTypeBindings: boolean): boolean {
  return (
    OVERVIEW_ACTIVITIES.has(activity) &&
    (activity === ScanConfigActivity.Simulate || hasTaskTypeBindings)
  );
}
