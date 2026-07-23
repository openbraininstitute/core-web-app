import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NEURON_OPACITY,
  DEFAULT_VIEWER_CONFIG,
  ELECTRODE_FOCUSED_NEURON_OPACITY,
  resolveViewerConfigDefaults,
} from '@/features/scan-config/components/color-by/use-viewer-config';

describe('resolveViewerConfigDefaults', () => {
  it('uses full neuron opacity and electrode size 10 by default', () => {
    expect(resolveViewerConfigDefaults()).toEqual(DEFAULT_VIEWER_CONFIG);
    expect(resolveViewerConfigDefaults().neuronOpacity).toBe(DEFAULT_NEURON_OPACITY);
    expect(resolveViewerConfigDefaults().electrodeRadius).toBe(10);
  });

  it('applies host-provided neuron opacity without inferring context', () => {
    const defaults = resolveViewerConfigDefaults({
      defaultNeuronOpacity: ELECTRODE_FOCUSED_NEURON_OPACITY,
    });
    expect(defaults.neuronOpacity).toBe(0.2);
    expect(defaults.electrodeRadius).toBe(10);
  });
});
