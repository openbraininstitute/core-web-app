import { describe, expect, it } from 'vitest';

import { checkMatchPatterns } from './pattern-matching';

describe('checkMatchPatterns', () => {
  it('matches by string equality', () => {
    expect(checkMatchPatterns('hello', ['hello'])).toBe(true);
    expect(checkMatchPatterns('hello', ['world'])).toBe(false);
  });

  it('matches by RegExp', () => {
    expect(checkMatchPatterns('apple', [/^a/])).toBe(true);
    expect(checkMatchPatterns('banana', [/^a/])).toBe(false);
  });

  it('mixes strings and RegExps in the same list', () => {
    expect(checkMatchPatterns('banana', ['apple', /^b/])).toBe(true);
    expect(checkMatchPatterns('cherry', ['apple', /^b/])).toBe(false);
  });

  it('returns false for an empty patterns list', () => {
    expect(checkMatchPatterns('anything', [])).toBe(false);
  });

  it('returns true as soon as any pattern matches (first-match-wins via .some)', () => {
    expect(checkMatchPatterns('foo', [/no/, 'foo', /also-no/])).toBe(true);
  });

  // Confirmed stateful-regex bug: a /g-flagged regex used with .test()
  // advances lastIndex, so a second call with the same RegExp instance
  // starts past the match and returns false. The function does not reset
  // lastIndex (unlike isValidEMail in src/util/email.ts), so callers
  // must avoid passing /g regexes. This test locks down current behavior.
  it('does not reset lastIndex on /g regexes — second call returns false (confirmed bug)', () => {
    const pattern = /foo/g;
    expect(checkMatchPatterns('foo', [pattern])).toBe(true);
    expect(checkMatchPatterns('foo', [pattern])).toBe(false);
  });
});
