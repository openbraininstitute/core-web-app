import { describe, expect, it } from 'vitest';

import {
  applyHoldingCurrent,
  correctUnitMixup,
  initialReplacementIndex,
  looksLikeVU,
  orderVUProtocols,
  replaceInitialSamples,
  requiresInitialSampleReplacement,
  toVUAcquisitionName,
  translateVUProtocol,
  trimTrailingNaNs,
} from '@/features/ephys-viewer/vu-nwb';

/**
 * The float32 conversion factors as h5wasm reads them back out of a VU file — the
 * stored values are 1e-12 and 1e-3, but neither survives the round trip exactly.
 */
const FLOAT32_PICO = 9.999999960041972e-13;
const FLOAT32_MILLI = 0.0010000000474974513;

describe('VU protocol naming', () => {
  it('translates known descriptions and passes unknown ones through', () => {
    expect(translateVUProtocol('X1PS_SubThresh_DA_0')).toBe('IV');
    expect(translateVUProtocol('CCSteps_DA_0')).toBe('Step');
    expect(translateVUProtocol('X5A_CHIRP_DA_0')).toBe('X5A_CHIRP_DA_0');
  });

  it('does not treat inherited object properties as known protocols', () => {
    expect(translateVUProtocol('toString')).toBe('toString');
  });

  it('lists known protocols first, then raw VU names, each sorted', () => {
    // The stimulus descriptions present in a VU sample file.
    const descriptions = [
      'X6SQ22_C2SSTRIPL_DA_0',
      'X7Ramp_DA_0',
      'CCSteps_DA_0',
      'EXTP3_BREAKN_DA_0',
      'X1PS_SubThresh_DA_0',
      'X5A_CHIRP_DA_0',
    ];

    expect(orderVUProtocols(descriptions)).toEqual([
      'IV',
      'Ramp',
      'Step',
      'EXTP3_BREAKN_DA_0',
      'X5A_CHIRP_DA_0',
      'X6SQ22_C2SSTRIPL_DA_0',
    ]);
  });

  it('collapses descriptions that share a BBP protocol', () => {
    expect(orderVUProtocols(['X2LP_Search_DA_0', 'X5SP_Search_DA_0'])).toEqual(['IDThresh']);
    expect(orderVUProtocols(['X3LP_Rheo_DA_0', 'X6SP_Rheo_DA_0', 'X4PS_SupraThresh_DA_0'])).toEqual(
      ['IDRest']
    );
  });
});

describe('VU file detection', () => {
  it('pairs a DA stimulus entry with its AD acquisition entry', () => {
    expect(toVUAcquisitionName('data_00000_DA0')).toBe('data_00000_AD0');
  });

  it('replaces every DA marker, matching the BluePyEfe port', () => {
    expect(toVUAcquisitionName('DA_data_00000_DA0')).toBe('AD_data_00000_AD0');
  });

  it('recognises a VU layout', () => {
    expect(
      looksLikeVU(['data_00000_DA0', 'data_00001_DA0'], ['data_00000_AD0', 'data_00001_AD0'])
    ).toBe(true);
  });

  it('rejects a layout with no DA/AD pairing', () => {
    expect(looksLikeVU(['ccss__0'], ['ccs__0'])).toBe(false);
    expect(looksLikeVU([], [])).toBe(false);
  });

  it('rejects DA entries whose response is missing', () => {
    expect(looksLikeVU(['data_00000_DA0'], ['data_00001_AD0'])).toBe(false);
  });
});

describe('unit mixup correction', () => {
  it('corrects swapped conversions when both channels claim volts', () => {
    expect(
      correctUnitMixup({
        voltageConversion: FLOAT32_PICO,
        currentConversion: FLOAT32_MILLI,
        voltageUnit: 'volts',
        currentUnit: 'volts',
      })
    ).toEqual({
      voltageConversion: 1e-3,
      currentConversion: 1e-12,
      voltageUnit: 'volts',
      currentUnit: 'amperes',
    });
  });

  it('leaves already correct units alone', () => {
    const units = {
      voltageConversion: FLOAT32_MILLI,
      currentConversion: FLOAT32_PICO,
      voltageUnit: 'volts',
      currentUnit: 'amperes',
    };

    expect(correctUnitMixup(units)).toEqual(units);
  });

  it('leaves a voltage clamp sweep alone', () => {
    const units = {
      voltageConversion: FLOAT32_PICO,
      currentConversion: FLOAT32_MILLI,
      voltageUnit: 'amperes',
      currentUnit: 'volts',
    };

    expect(correctUnitMixup(units)).toEqual(units);
  });
});

describe('trailing NaN trimming', () => {
  it('trims both channels at the first NaN', () => {
    const { current, voltage } = trimTrailingNaNs(
      Float32Array.from([1, 2, 3, NaN, NaN]),
      Float32Array.from([4, 5, 6, NaN, NaN])
    );

    expect(Array.from(current)).toEqual([1, 2, 3]);
    expect(Array.from(voltage)).toEqual([4, 5, 6]);
  });

  it('leaves a clean recording untouched', () => {
    const { current, voltage } = trimTrailingNaNs(
      Float32Array.from([1, 2, 3]),
      Float32Array.from([4, 5, 6])
    );

    expect(Array.from(current)).toEqual([1, 2, 3]);
    expect(Array.from(voltage)).toEqual([4, 5, 6]);
  });

  it('keeps an all-NaN recording rather than emptying it', () => {
    const { current } = trimTrailingNaNs(
      Float32Array.from([NaN, NaN]),
      Float32Array.from([NaN, NaN])
    );

    expect(current).toHaveLength(2);
  });

  it('clamps to the response length when the channels disagree', () => {
    const { current, voltage } = trimTrailingNaNs(
      Float32Array.from([1, 2, 3, NaN]),
      Float32Array.from([4, 5])
    );

    expect(Array.from(current)).toEqual([1, 2, 3]);
    expect(Array.from(voltage)).toEqual([4, 5]);
  });
});

describe('holding current offset', () => {
  it('offsets raw samples by the bias current', () => {
    const current = Float32Array.from([0, 100, -100]);

    applyHoldingCurrent(current, -36.31809616088867, 1e-12);

    expect(Array.from(current)).toEqual([
      expect.closeTo(-36.318, 3),
      expect.closeTo(63.682, 3),
      expect.closeTo(-136.318, 3),
    ]);
  });

  it('rescales the offset for a conversion other than one pA per count', () => {
    const current = Float32Array.from([0]);

    // 1e-9 A per count, so a -50 pA hold is a twentieth of a count.
    applyHoldingCurrent(current, -50, 1e-9);

    expect(current[0]).toBeCloseTo(-0.05, 6);
  });

  it('is a no-op without a bias current', () => {
    const current = Float32Array.from([1, 2, 3]);

    applyHoldingCurrent(current, undefined, 1e-12);

    expect(Array.from(current)).toEqual([1, 2, 3]);
  });
});

describe('initial sample replacement', () => {
  it('applies only to the flagged VU stimuli', () => {
    expect(requiresInitialSampleReplacement('CCSteps_DA_0')).toBe(true);
    expect(requiresInitialSampleReplacement('X1PS_SubThresh_DA_0')).toBe(true);
    expect(requiresInitialSampleReplacement('X4PS_SupraThresh_DA_0')).toBe(true);
    expect(requiresInitialSampleReplacement('X7Ramp_DA_0')).toBe(false);
  });

  it('resolves 90 ms against the sampling rate', () => {
    expect(initialReplacementIndex(500_000)).toBe(45_000);
    expect(initialReplacementIndex(125_000)).toBe(11_250);
  });

  it('overwrites both channels with the value at 90 ms', () => {
    // 100 Hz, so 90 ms lands on index 9.
    const current = Float32Array.from(Array.from({ length: 12 }, (_, i) => i));
    const voltage = Float32Array.from(Array.from({ length: 12 }, (_, i) => i * 10));

    expect(replaceInitialSamples(current, voltage, 100)).toBe(true);

    expect(Array.from(current)).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 11]);
    expect(Array.from(voltage)).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 100, 110]);
  });

  it('keeps a recording that is too short to reach 90 ms unmodified', () => {
    const current = Float32Array.from([1, 2, 3]);
    const voltage = Float32Array.from([4, 5, 6]);

    expect(replaceInitialSamples(current, voltage, 500_000)).toBe(false);

    expect(Array.from(current)).toEqual([1, 2, 3]);
    expect(Array.from(voltage)).toEqual([4, 5, 6]);
  });
});
