import { describe, expect, it } from 'vitest';

import {
  defaultOptimizationValue,
  ParameterMode,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

describe('defaultOptimizationValue', () => {
  it('defaults a newly checked parameter to bounds mode with an empty pair', () => {
    expect(defaultOptimizationValue()).toEqual({
      mode: ParameterMode.Bounds,
      value: null,
      bounds: [null, null],
    });
  });
});
