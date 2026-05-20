import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  tryType,
  typeBooleanOrNull,
  typeImage,
  typeNumberOrNull,
  typeStringOrNull,
} from './type-utils';

describe('tryType()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when the value matches the type', () => {
    expect(tryType('field', 'hello', 'string')).toBe(true);
  });

  it('returns true for matching number type', () => {
    expect(tryType('field', 42, 'number')).toBe(true);
  });

  it('re-throws when assertType fails', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => tryType('field', 42, 'string')).toThrow();
  });

  it('logs the failing type before re-throwing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => tryType('field', 42, 'string')).toThrow();
    expect(spy).toHaveBeenCalledWith('Failing type:', 'string');
  });

  describe('typeStringOrNull', () => {
    it('accepts a string', () => {
      expect(tryType('x', 'foo', typeStringOrNull)).toBe(true);
    });

    it('accepts null', () => {
      expect(tryType('x', null, typeStringOrNull)).toBe(true);
    });

    it('accepts undefined', () => {
      expect(tryType('x', undefined, typeStringOrNull)).toBe(true);
    });

    it('rejects a number', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(() => tryType('x', 42, typeStringOrNull)).toThrow();
    });
  });

  describe('typeNumberOrNull', () => {
    it('accepts a number', () => {
      expect(tryType('x', 42, typeNumberOrNull)).toBe(true);
    });

    it('accepts null', () => {
      expect(tryType('x', null, typeNumberOrNull)).toBe(true);
    });

    it('rejects a string', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(() => tryType('x', 'foo', typeNumberOrNull)).toThrow();
    });
  });

  describe('typeBooleanOrNull', () => {
    it('accepts a boolean', () => {
      expect(tryType('x', true, typeBooleanOrNull)).toBe(true);
    });

    it('accepts null', () => {
      expect(tryType('x', null, typeBooleanOrNull)).toBe(true);
    });

    it('rejects a string', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(() => tryType('x', 'foo', typeBooleanOrNull)).toThrow();
    });
  });

  describe('typeImage', () => {
    it('accepts a well-formed image object', () => {
      expect(
        tryType('image', { imageURL: '/foo.png', imageWidth: 100, imageHeight: 50 }, typeImage)
      ).toBe(true);
    });
  });
});
