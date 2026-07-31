import { describe, expect, it } from 'vitest';

import {
  isUuid,
  parseIdTokens,
  splitIdTokens,
} from '@/features/data-grid/renderers/aggrid/filters/id-tokens';

const A = 'b2f0e1b2-0000-4000-8000-000000000000';
const B = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('parseIdTokens', () => {
  it('splits on whitespace, commas, semicolons and newlines', () => {
    expect(parseIdTokens(`${A}, ${B}`)).toEqual([A, B]);
    expect(parseIdTokens(`${A}\n${B}`)).toEqual([A, B]);
    expect(parseIdTokens(`${A} ${B}`)).toEqual([A, B]);
    expect(parseIdTokens(`${A};${B}`)).toEqual([A, B]);
    expect(parseIdTokens(`  ${A} ,,\n\t ${B}  `)).toEqual([A, B]);
  });

  it('strips quotes/brackets left over from a pasted list and de-duplicates', () => {
    expect(parseIdTokens(`["${A}", "${B}", "${A}"]`)).toEqual([A, B]);
  });

  it('is empty for blank input', () => {
    expect(parseIdTokens('')).toEqual([]);
    expect(parseIdTokens('   \n , ; ')).toEqual([]);
  });
});

describe('isUuid', () => {
  it('accepts canonical UUIDs in any case', () => {
    expect(isUuid(A)).toBe(true);
    expect(isUuid(B.toUpperCase())).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isUuid('Mus musculus')).toBe(false);
    expect(isUuid('12345')).toBe(false);
    expect(isUuid(A.slice(0, -1))).toBe(false);
    expect(isUuid(`${A}x`)).toBe(false);
    expect(isUuid(A.replace(/-/g, ''))).toBe(false);
  });
});

describe('splitIdTokens', () => {
  it('partitions tokens into valid ids and invalid ones (which block Apply)', () => {
    const result = splitIdTokens(`${A}, not-a-uuid, ${B}`);
    expect(result.tokens).toEqual([A, 'not-a-uuid', B]);
    expect(result.valid).toEqual([A, B]);
    expect(result.invalid).toEqual(['not-a-uuid']);
  });

  it('reports no invalid tokens for a clean paste', () => {
    expect(splitIdTokens(`${A}\n${B}`).invalid).toEqual([]);
  });
});
