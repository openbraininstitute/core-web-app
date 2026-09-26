import { describe, expect, it } from 'vitest';

import { validateDistanceFunction } from '@/features/scan-config/components/ui-elements/distance-function/validate';

describe('validateDistanceFunction', () => {
  const safe = [
    '({value} + {distance}) / 2',
    'math.exp((-{distance})/50)*{value}',
    'int({distance} > 100) * {value}',
    '(15./(1. + math.exp((300-{distance})/50)))*{value}',
    '{value} * (0.1 + 0.9 * int(({distance} > 10) & ({distance} < 20)))',
    'abs({value}) + min({distance}, 5)',
  ];

  it.each(safe)('accepts safe expression: %s', (fn) => {
    expect(validateDistanceFunction(fn)).toBeNull();
  });

  const unsafe = [
    "__import__('os') + {value} + {distance}",
    "os.system('id') + {value}*{distance}",
    "open('/etc/passwd') + {value} + {distance}",
    '{value}[0] + {distance}',
    '{value}.constructor + {distance}',
    'globalThis + {value} + {distance}',
    'foo({value}) + {distance}',
  ];

  it.each(unsafe)('rejects unsafe expression: %s', (fn) => {
    expect(validateDistanceFunction(fn)).not.toBeNull();
  });

  it('reports the exact span of the offending node', () => {
    const fn = 'math.exp({distance}) + os.system';
    const error = validateDistanceFunction(fn);
    expect(error).not.toBeNull();
    // The offending member access `os.system` starts at index 23 and runs to the end.
    expect(fn.slice(error?.from, error?.to)).toBe('os.system');
  });

  it('preserves offsets across multi-char placeholders', () => {
    // `{value}` (7 chars) precedes the bad call; the reported span must still line up.
    const fn = '{value} + {distance} + evil()';
    const error = validateDistanceFunction(fn);
    expect(error).not.toBeNull();
    expect(fn.slice(error?.from, error?.to)).toBe('evil()');
  });

  it('flags a syntax error without throwing', () => {
    const error = validateDistanceFunction('({value} + {distance}');
    expect(error).not.toBeNull();
    expect(error?.message).toContain('valid expression');
  });

  it('flags an unknown placeholder', () => {
    const fn = '{value} + {distance} + {hello}';
    const error = validateDistanceFunction(fn);
    expect(error).not.toBeNull();
    expect(error?.message).toContain("Unknown placeholder '{hello}'");
    expect(fn.slice(error?.from, error?.to)).toBe('{hello}');
  });

  it('accepts a declared parameter placeholder', () => {
    expect(
      validateDistanceFunction('math.exp({distance}*{constant})*{value}', ['constant'])
    ).toBeNull();
  });

  it('flags a placeholder that is not declared', () => {
    const error = validateDistanceFunction('{value} + {distance} + {constant}', []);
    expect(error?.message).toContain("Unknown placeholder '{constant}'");
  });

  it('requires {value} and {distance}', () => {
    expect(validateDistanceFunction('{distance}')?.message).toContain('{value} placeholder');
    expect(validateDistanceFunction('{value}')?.message).toContain('{distance} placeholder');
  });
});
