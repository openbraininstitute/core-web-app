import { describe, expect, it } from 'vitest';

import { isEMailFromForbiddenCountry, isValidEMail } from './email';

describe('isValidEMail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEMail('foo@bar.com')).toBe(true);
    expect(isValidEMail('a.b@c.de')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEMail('no-at')).toBe(false);
    expect(isValidEMail('@nodomain.com')).toBe(false);
    expect(isValidEMail('foo@bar')).toBe(false);
  });

  it('rejects addresses with empty TLD', () => {
    expect(isValidEMail('foo@bar.')).toBe(false);
  });

  // Regression test: the regex is /g-flagged and shares lastIndex across calls.
  // The function explicitly resets lastIndex; this test guards against
  // accidental removal of that reset.
  it('is safe under repeated calls (stateful /g regex)', () => {
    expect(isValidEMail('foo@bar.com')).toBe(true);
    expect(isValidEMail('foo@bar.com')).toBe(true);
    expect(isValidEMail('foo@bar.com')).toBe(true);
  });
});

describe('isEMailFromForbiddenCountry', () => {
  it('returns the country name when TLD is in the forbidden list', () => {
    expect(isEMailFromForbiddenCountry('x@y.ru')).toBe('Russia');
    expect(isEMailFromForbiddenCountry('a@b.ir')).toBe('Iran');
  });

  it('returns false for non-forbidden TLDs', () => {
    expect(isEMailFromForbiddenCountry('a@b.com')).toBe(false);
  });

  it('is case-sensitive — the map is lowercase, so uppercase TLDs are not matched', () => {
    // The map has only lowercase keys; the extractor does not lowercase.
    // This locks down current behavior so changes are intentional.
    expect(isEMailFromForbiddenCountry('X@Y.RU')).toBe(false);
  });
});
