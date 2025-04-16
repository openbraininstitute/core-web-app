import { expect, describe, it } from 'vitest';
import { formatCurrency, formatNumber, formatBytes } from '../../src/utils/format';

describe('Format Utils', () => {
  describe('formatCurrency', () => {
    it('should format amount with USD by default', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('should format amount with specified currency', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
    });

    it('should handle decimal values', () => {
      expect(formatCurrency(1000.5)).toBe('$1,000.50');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000.00');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
    });

    it('should handle large numbers', () => {
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should handle decimal values', () => {
      expect(formatNumber(1000.5)).toBe('1,000.5');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative values', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes to the appropriate unit', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format large values', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('should handle decimal places', () => {
      expect(formatBytes(1024 + 512)).toBe('1.5 KB');
    });

    it('should use custom decimal places', () => {
      expect(formatBytes(1024 + 512, 0)).toBe('2 KB');
      expect(formatBytes(1024 + 512, 3)).toBe('1.5 KB');
    });

    it('should handle zero', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });
  });
});
