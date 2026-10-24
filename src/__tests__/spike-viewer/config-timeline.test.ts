import { describe, expect, it } from 'vitest';

import { configTimeline } from '@/features/spike-viewer/config-timeline';

describe('configTimeline', () => {
  it('reads inputs, reports and connection overrides in onset order', () => {
    const events = configTimeline({
      run: { tstop: 1000 },
      inputs: {
        pulse: { input_type: 'current_clamp', delay: 100, duration: 50, node_set: 'Stimulated' },
        replay: { input_type: 'spikes', delay: 0 },
      },
      reports: { soma_v: { variable_name: 'v', start_time: 50 } },
      connection_overrides: [{ name: 'scale', source: 'A', target: 'B', weight: 0.5, delay: 300 }],
    });

    expect(events).toEqual([
      { kind: 'stimulus', name: 'replay', start: 0, end: 1000, detail: 'spikes' },
      { kind: 'recording', name: 'soma_v', start: 50, end: 1000, detail: 'v' },
      {
        kind: 'stimulus',
        name: 'pulse',
        start: 100,
        end: 150,
        detail: 'current clamp · Stimulated',
      },
      { kind: 'manipulation', name: 'scale', start: 300, detail: 'A → B · weight × 0.5' },
    ]);
  });

  it('reads nothing from what is not a config', () => {
    expect(configTimeline(undefined)).toEqual([]);
    expect(configTimeline({ inputs: 'none', connection_overrides: {} })).toEqual([]);
  });
});
