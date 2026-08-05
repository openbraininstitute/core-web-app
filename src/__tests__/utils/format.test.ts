import { describe, expect, it } from 'vitest';

import { toSentenceCase } from '@/utils/format';

/**
 * `toSentenceCase` is used on scientific labels (brain region names), where a naive
 * lower-casing would corrupt acronyms — "Field CA1" must not become "Field ca1".
 */
describe('toSentenceCase', () => {
  it('lowers a title-cased sentence and keeps the leading capital', () => {
    expect(toSentenceCase('Primary Somatosensory Area, Barrel Field')).toBe(
      'Primary somatosensory area, barrel field'
    );
  });

  it('leaves an already sentence-cased string untouched', () => {
    const text = 'Anterior cingulate area, dorsal part';
    expect(toSentenceCase(text)).toBe(text);
  });

  it('lowers a shouted string', () => {
    expect(toSentenceCase('CEREBELLUM')).toBe('Cerebellum');
  });

  it('preserves acronyms and identifiers', () => {
    expect(toSentenceCase('Field CA1')).toBe('Field CA1');
    expect(toSentenceCase('VISp Layer 4')).toBe('VISp layer 4');
    expect(toSentenceCase('Primary Motor Area, Layer 6a')).toBe('Primary motor area, layer 6a');
  });

  it('takes no capital when the sentence opens on a numeral', () => {
    expect(toSentenceCase('3rd Ventricle')).toBe('3rd ventricle');
  });

  it('capitalises through leading punctuation', () => {
    expect(toSentenceCase('(Caudal) Part')).toBe('(Caudal) part');
  });

  it('lowers a long all-caps word but keeps a short acronym', () => {
    expect(toSentenceCase('the CEREBELLUM and the DNA')).toBe('The cerebellum and the DNA');
  });

  it('returns an empty string for nullish or blank input', () => {
    expect(toSentenceCase(undefined)).toBe('');
    expect(toSentenceCase(null)).toBe('');
    expect(toSentenceCase('')).toBe('');
  });
});
