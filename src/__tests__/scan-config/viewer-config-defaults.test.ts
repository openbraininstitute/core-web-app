import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ELECTRODE_RADIUS,
  DEFAULT_NEURON_OPACITY,
  DEFAULT_VIEWER_CONFIG,
  ELECTRODE_FOCUSED_NEURON_OPACITY,
  resolveViewerConfigDefaults,
} from '@/features/scan-config/components/color-by/use-viewer-config';

describe('resolveViewerConfigDefaults', () => {
  it('uses full neuron opacity and the default electrode size', () => {
    expect(resolveViewerConfigDefaults()).toEqual(DEFAULT_VIEWER_CONFIG);
    expect(resolveViewerConfigDefaults().neuronOpacity).toBe(DEFAULT_NEURON_OPACITY);
    expect(DEFAULT_ELECTRODE_RADIUS).toBe(5);
    expect(resolveViewerConfigDefaults().electrodeRadius).toBe(DEFAULT_ELECTRODE_RADIUS);
  });

  it('applies host-provided neuron opacity without inferring context', () => {
    const defaults = resolveViewerConfigDefaults({
      defaultNeuronOpacity: ELECTRODE_FOCUSED_NEURON_OPACITY,
    });
    expect(defaults.neuronOpacity).toBe(0.2);
    expect(defaults.electrodeRadius).toBe(DEFAULT_ELECTRODE_RADIUS);
  });
});
