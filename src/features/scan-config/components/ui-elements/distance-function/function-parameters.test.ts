import { describe, expect, it } from 'vitest';

import { functionParameterNames } from '@/features/scan-config/components/ui-elements/distance-function/function-parameters';

describe('functionParameterNames', () => {
  it('returns extra placeholders in order of first appearance, de-duplicated', () => {
    expect(functionParameterNames('math.exp({distance}*{a})*{value}+{b}-{a}')).toEqual(['a', 'b']);
  });

  it('excludes the reserved runtime placeholders', () => {
    expect(functionParameterNames('{value}+{distance}+{step_begin}+{step_end}+{gain}')).toEqual([
      'gain',
    ]);
  });

  it('returns an empty list for a fixed-formula function with no extra placeholders', () => {
    expect(functionParameterNames('math.exp(-{distance}/50.)*{value}')).toEqual([]);
  });

  it('ignores non-identifier braces (format specs, indices)', () => {
    // These are rejected by the backend as placeholders; they must not be read as parameters.
    expect(functionParameterNames('{value}{0}{a.b}{a[0]}{c}')).toEqual(['c']);
  });
});
