import { describe, expect, it } from 'vitest';

import { toIonChannelFittingForm } from './ion-channel-modeling-campaign';

describe('toIonChannelFittingForm', () => {
  it('reshapes a pre-scan-config builder form into the current scan config', () => {
    const legacy = {
      type: 'IonChannelFittingScanConfig',
      info: { campaign_name: 'Kv1.1', campaign_description: 'fit' },
      initialize: {
        recordings: { type: 'IonChannelRecordingFromID', id_str: 'recording-id' },
        ion_channel_name: 'Kv1_1',
      },
      minf_eq: { type: 'SigFitMInf' },
      mtau_eq: { type: 'ThermoFitMTauV2' },
      hinf_eq: { type: 'SigFitHInf' },
      htau_eq: { type: 'SigFitHTau' },
      gate_exponents: { type: 'IonChannelFittingScanConfig.GateExponents', m_power: 3, h_power: 0 },
    };

    expect(toIonChannelFittingForm(legacy)).toEqual({
      type: 'IonChannelFittingScanConfig',
      info: { campaign_name: 'Kv1.1', campaign_description: 'fit' },
      initialize: {
        recordings: [{ type: 'IonChannelRecordingFromID', id_str: 'recording-id' }],
        ion_channel_name: 'Kv1_1',
      },
      model_type: {
        type: 'HodgkinHuxleyIonChannelModel',
        minf_eq: 'sig_fit_minf',
        mtau_eq: 'thermo_fit_mtau_v2',
        hinf_eq: 'sig_fit_hinf',
        htau_eq: 'sig_fit_htau',
        m_power: 3,
        h_power: 0,
      },
    });
  });

  it('leaves a form already in the current shape alone', () => {
    const current = {
      initialize: { recordings: [{ id_str: 'recording-id' }] },
      model_type: { type: 'HodgkinHuxleyIonChannelModel' },
    };

    expect(toIonChannelFittingForm(current)).toBe(current);
  });
});
