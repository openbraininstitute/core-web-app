import { describe, expect, it } from 'vitest';

import { resolveScanConfigEditingLocked } from '@/features/scan-config/hooks/use-config-editing-locked';

describe('resolveScanConfigEditingLocked', () => {
  it('is unlocked for a fresh, editable config', () => {
    expect(resolveScanConfigEditingLocked({})).toBe(false);
    expect(resolveScanConfigEditingLocked({ campaignId: '', loading: false })).toBe(false);
  });

  it('locks once a campaign has been generated', () => {
    // the edge case this rule exists for: returning to the configuration tab of
    // a generated campaign must not let the 3D viewer write electrode moves back
    expect(resolveScanConfigEditingLocked({ campaignId: 'campaign-1' })).toBe(true);
  });

  it('locks while generating, in read-only hosts, and during diff/AI review', () => {
    expect(resolveScanConfigEditingLocked({ loading: true })).toBe(true);
    expect(resolveScanConfigEditingLocked({ readOnly: true })).toBe(true);
    expect(resolveScanConfigEditingLocked({ showingDiffs: true })).toBe(true);
    expect(resolveScanConfigEditingLocked({ aiConfig: { some: 'proposal' } })).toBe(true);
    expect(resolveScanConfigEditingLocked({ isChatReady: false })).toBe(true);
  });
});
