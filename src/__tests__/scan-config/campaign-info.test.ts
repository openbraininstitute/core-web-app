import { describe, expect, it } from 'vitest';

import {
  campaignInfoOf,
  infoBlockKey,
  withCampaignInfo,
  withoutInfoErrors,
} from '@/features/scan-config/components/campaign-info/info-block';

import type { ErrorObject } from 'ajv';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

/** A config's schema, cut down to its root elements' kinds. */
const SCHEMA = {
  properties: {
    type: { const: 'CircuitSimulationScanConfig', default: 'CircuitSimulationScanConfig' },
    info: { title: 'Info', ui_element: 'block_info' },
    initialize: { title: 'Initialization', ui_element: 'block_single' },
    stimuli: { title: 'Stimuli', ui_element: 'block_dictionary' },
  },
} as unknown as ConfigSchema;

const CONFIG = {
  type: 'CircuitSimulationScanConfig',
  info: { type: 'Info', campaign_name: null, campaign_description: null },
  initialize: { type: 'Initialize', simulation_length: 3000 },
  stimuli: {},
} as unknown as Config;

const error = (instancePath: string, params: Record<string, unknown> = {}) =>
  ({ instancePath, params, keyword: 'x', schemaPath: '#' }) as ErrorObject;

describe('the info block', () => {
  it('is the root element obi-one declares a block_info', () => {
    expect(infoBlockKey(SCHEMA)).toBe('info');
    expect(infoBlockKey(null)).toBeUndefined();
  });

  it('is taken to be info where obi-one still declares it a block_single (the prototype)', () => {
    const old = {
      properties: { info: { ui_element: 'block_single' } },
    } as unknown as ConfigSchema;
    expect(infoBlockKey(old)).toBe('info');
    expect(withoutInfoErrors([error('/info/campaign_name')], old)).toBeNull();
  });

  it('has its errors taken out of the config`s, the others kept', () => {
    const kept = error('/initialize/simulation_length');
    expect(
      withoutInfoErrors(
        [
          error('/info/campaign_name'),
          error('/info'),
          error('', { missingProperty: 'info' }),
          kept,
          // not the info block's: a name that only begins the same
          error('/information/x'),
        ],
        SCHEMA
      )
    ).toEqual([kept, error('/information/x')]);
  });

  it('leaves no errors at all where its own were the only ones', () => {
    expect(withoutInfoErrors([error('/info/campaign_description')], SCHEMA)).toBeNull();
    expect(withoutInfoErrors(null, SCHEMA)).toBeNull();
  });

  it('reads the name and the description trimmed, empty where the config has none', () => {
    expect(campaignInfoOf(CONFIG, 'info')).toEqual({ campaign_name: '', campaign_description: '' });
    expect(campaignInfoOf({}, 'info')).toEqual({ campaign_name: '', campaign_description: '' });
    const held = { info: { campaign_name: ' A name ', campaign_description: 'What for' } };
    expect(campaignInfoOf(held, 'info')).toEqual({
      campaign_name: 'A name',
      campaign_description: 'What for',
    });
  });

  it('writes them into the block, keeping its type and the config it came from', () => {
    const named = withCampaignInfo(CONFIG, 'info', {
      campaign_name: 'A name',
      campaign_description: 'What it is for',
    });
    expect(named.info).toEqual({
      type: 'Info',
      campaign_name: 'A name',
      campaign_description: 'What it is for',
    });
    expect(named.initialize).toBe(CONFIG.initialize);
    expect(CONFIG.info).toEqual({ type: 'Info', campaign_name: null, campaign_description: null });
  });

  it('writes a half-filled pair as it is, the empty one as the form leaves it', () => {
    const half = withCampaignInfo(CONFIG, 'info', {
      campaign_name: 'A na',
      campaign_description: '',
    });
    expect(half.info).toEqual({ type: 'Info', campaign_name: 'A na', campaign_description: null });
  });

  it('gives the same config back where nothing was typed, or nothing changed', () => {
    expect(withCampaignInfo(CONFIG, 'info', { campaign_name: '', campaign_description: '' })).toBe(
      CONFIG
    );
    const named = withCampaignInfo(CONFIG, 'info', {
      campaign_name: 'A',
      campaign_description: 'B',
    });
    expect(withCampaignInfo(named, 'info', { campaign_name: 'A', campaign_description: 'B' })).toBe(
      named
    );
  });
});
