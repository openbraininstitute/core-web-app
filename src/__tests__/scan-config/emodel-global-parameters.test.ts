import { describe, expect, it } from 'vitest';

import {
  makeGlobalParameterSelection,
  readGlobalParameters,
  writeGlobalParameters,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/global-parameters';
import { ParameterMode } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

const fixed = (value: number | null) => ({ mode: ParameterMode.Fixed, value, bounds: null });

describe('makeGlobalParameterSelection', () => {
  it('writes a GlobalParameterSelection without distribution or model', () => {
    expect(makeGlobalParameterSelection(fixed(-80))).toEqual({
      type: 'GlobalParameterSelection',
      value: { type: 'OptimizationValue', mode: 'fixed', value: -80, bounds: null },
    });
  });
});

describe('readGlobalParameters', () => {
  it('fills the simulation condition defaults before the dict is written', () => {
    expect(readGlobalParameters(null)).toEqual({
      v_init: makeGlobalParameterSelection(fixed(-80)),
      celsius: makeGlobalParameterSelection(fixed(34)),
    });
  });

  it('keeps stored simulation conditions and any other entry', () => {
    const celsius = makeGlobalParameterSelection(fixed(22));
    const other = { type: 'GlobalParameterSelection', value: {}, ion_channel_model: {} };

    expect(readGlobalParameters({ global_parameters: { celsius, q10_NaTg: other } })).toEqual({
      v_init: makeGlobalParameterSelection(fixed(-80)),
      celsius,
      q10_NaTg: other,
    });
  });
});

describe('writeGlobalParameters', () => {
  it('replaces the dict and keeps the rest of the emodel value', () => {
    const mechanisms = { ion_channel_models: [] };
    const next = { celsius: makeGlobalParameterSelection(fixed(22)) };

    expect(writeGlobalParameters({ mechanisms, global_parameters: {} }, next)).toEqual({
      mechanisms,
      global_parameters: next,
    });
  });
});
