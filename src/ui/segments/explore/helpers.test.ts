import { describe, expect, it } from 'vitest';

import { getEntityTypeFromUrlOnEntityScope } from './helpers';

describe('getEntityTypeFromUrlOnEntityScope()', () => {
  it('extracts the entity type from a simple browse URL', () => {
    expect(getEntityTypeFromUrlOnEntityScope('/browse/entity/cell-morphology')).toBe(
      'cell-morphology'
    );
  });

  it('strips host prefix and query string', () => {
    expect(getEntityTypeFromUrlOnEntityScope('/app/x/y/browse/entity/emodel?foo=bar')).toBe(
      'emodel'
    );
  });

  it('stops at the next slash after the entity segment', () => {
    expect(getEntityTypeFromUrlOnEntityScope('/browse/entity/emodel/details')).toBe('emodel');
  });

  it('returns null when the URL does not match the browse/entity pattern', () => {
    expect(getEntityTypeFromUrlOnEntityScope('/something-else')).toBeNull();
  });

  it('returns null when the captured segment is empty', () => {
    expect(getEntityTypeFromUrlOnEntityScope('/browse/entity/')).toBeNull();
  });

  it('is case-sensitive', () => {
    expect(getEntityTypeFromUrlOnEntityScope('/Browse/Entity/foo')).toBeNull();
  });
});
