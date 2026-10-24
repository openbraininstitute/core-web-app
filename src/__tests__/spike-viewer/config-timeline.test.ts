import { describe, expect, it } from 'vitest';

import { configTimeline } from '@/features/spike-viewer/config-timeline';

const SONATA = {
  run: { tstop: 1000 },
  inputs: {
    Volley: { delay: 0, duration: 1000, module: 'synapse_replay', input_type: 'spikes' },
    Step_0: { delay: 200, duration: 600, module: 'linear', input_type: 'current_clamp' },
  },
  reports: { Soma: { variable_name: 'v', start_time: 50 } },
  connection_overrides: [{ name: 'Scale', source: 'A', target: 'B', weight: 0.5, delay: 300 }],
};

const SINGLE = {
  timestamps: {
    Pulses: { type: 'RegularTimestamps', start_time: 100, interval: 400, number_of_repetitions: 2 },
  },
  stimuli: {
    Volley: {
      type: 'FullySynchronousSpikeStimulus',
      timestamps: { block_name: 'Pulses', type: 'TimestampsReference' },
      timestamp_offset: 10,
    },
    Step: {
      type: 'ConstantCurrentClampSomaticStimulus',
      duration: 600,
      timestamps: null,
      timestamp_offset: 200,
      amplitude: 0.3,
    },
  },
  recordings: { Soma: { type: 'SomaVoltageRecording', neuron_set: null, dt: 0.1 } },
  synaptic_manipulations: { Scale: { type: 'SynapticScaling', factor: 0.5 } },
};

describe('configTimeline', () => {
  it('takes stimuli from the single config, at their timestamps plus offset', () => {
    const stimuli = configTimeline(SONATA, SINGLE).filter((e) => e.kind === 'stimulus');
    expect(stimuli.map(({ name, start, end }) => ({ name, start, end }))).toEqual([
      { name: 'Volley', start: 110, end: 110 },
      { name: 'Step', start: 200, end: 800 },
      { name: 'Volley', start: 510, end: 510 },
    ]);
  });

  it('describes each block, a reference by its name, timestamps with their times', () => {
    const volley = configTimeline(SONATA, SINGLE).find((e) => e.name === 'Volley');
    expect(volley?.block.title).toBe('Fully synchronous spike stimulus');
    expect(volley?.block.fields).toEqual([
      { label: 'Timestamps', value: 'Pulses · 100 ms, 500 ms' },
      { label: 'Timestamp offset', value: '10' },
    ]);
  });

  it('times recordings and overrides by the SONATA config, described by their blocks', () => {
    const events = configTimeline(SONATA, SINGLE);
    const soma = events.find((e) => e.kind === 'recording');
    const scale = events.find((e) => e.kind === 'manipulation');
    expect(soma).toMatchObject({ name: 'Soma', start: 50, end: 1000 });
    expect(soma?.block.title).toBe('Soma voltage recording');
    expect(scale).toMatchObject({ name: 'Scale', start: 300 });
    expect(scale?.end).toBeUndefined();
    expect(scale?.block.fields).toEqual([{ label: 'Factor', value: '0.5' }]);
  });

  it('falls back on the SONATA inputs without a single config', () => {
    const stimuli = configTimeline(SONATA).filter((e) => e.kind === 'stimulus');
    expect(stimuli.map(({ name, start, end }) => ({ name, start, end }))).toEqual([
      { name: 'Volley', start: 0, end: 1000 },
      { name: 'Step_0', start: 200, end: 800 },
    ]);
  });

  it('reads nothing from what is not a config', () => {
    expect(configTimeline(undefined)).toEqual([]);
    expect(configTimeline({ inputs: 'none', connection_overrides: {} })).toEqual([]);
  });
});
