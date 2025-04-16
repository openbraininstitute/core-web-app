import { expect, describe, it } from 'vitest';
import { ensureArray } from '../../src/utils/array';

describe('Array Utils', () => {
  describe('ensureArray', () => {
    it('should convert a single item to an array', () => {
      const result = ensureArray({ input: 'test' });
      expect(result).toEqual(['test']);
    });

    it('should return the original array if input is already an array', () => {
      const testArray = ['test1', 'test2'];
      const result = ensureArray({ input: testArray });
      expect(result).toBe(testArray);
    });

    it('should return an empty array if input is null', () => {
      const result = ensureArray({ input: null });
      expect(result).toEqual([]);
    });

    it('should return an empty array if input is undefined', () => {
      const result = ensureArray({ input: undefined });
      expect(result).toEqual([]);
    });

    it('should return true when checkNotEmpty is true and array is not empty', () => {
      const result = ensureArray({ input: ['test'], checkNotEmpty: true });
      expect(result).toBe(true);
    });

    it('should return false when checkNotEmpty is true and array is empty', () => {
      const result = ensureArray({ input: [], checkNotEmpty: true });
      expect(result).toBe(false);
    });

    it('should throw error when throwIfEmpty is true and array is empty', () => {
      expect(() => {
        ensureArray({ input: [], checkNotEmpty: true, throwIfEmpty: true });
      }).toThrow('Resulting array must not be empty when throwIfEmpty is true.');
    });

    it('should throw error when throwIfEmpty is true and input is null', () => {
      expect(() => {
        ensureArray({ input: null, checkNotEmpty: true, throwIfEmpty: true });
      }).toThrow('Resulting array must not be empty when throwIfEmpty is true.');
    });
  });
});
