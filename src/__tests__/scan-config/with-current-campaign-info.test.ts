import { describe, expect, it } from 'vitest';

import { withCurrentCampaignInfo } from '@/features/scan-config/components/hooks/use-scan-origin-campaign';

import type { Config } from '@/features/scan-config/types';

const stored = {
  info: { type: 'Info', campaign_name: 'A', campaign_description: 'first try' },
  initialize: { simulation_length: 1000 },
} as unknown as Config;

describe('withCurrentCampaignInfo', () => {
  it('names the config as its campaign is now', () => {
    expect(
      withCurrentCampaignInfo(stored, { name: 'A (renamed)', description: 'second try' })
    ).toEqual({
      info: { type: 'Info', campaign_name: 'A (renamed)', campaign_description: 'second try' },
      initialize: { simulation_length: 1000 },
    });
  });

  it('takes a cleared description, but never an empty name', () => {
    expect(withCurrentCampaignInfo(stored, { name: '', description: '' })?.info).toEqual({
      type: 'Info',
      campaign_name: 'A',
      campaign_description: '',
    });
  });

  it('adds nothing a config does not hold', () => {
    const bare = { info: { type: 'Info', campaign_name: 'A' } } as unknown as Config;
    expect(withCurrentCampaignInfo(bare, { name: 'B', description: 'new' })?.info).toEqual({
      type: 'Info',
      campaign_name: 'B',
    });
    const noInfo = { initialize: {} } as unknown as Config;
    expect(withCurrentCampaignInfo(noInfo, { name: 'B' })).toBe(noInfo);
  });

  it('keeps the stored config without a campaign entity', () => {
    expect(withCurrentCampaignInfo(stored, undefined)).toBe(stored);
    expect(withCurrentCampaignInfo(undefined, { name: 'B' })).toBeUndefined();
  });
});
