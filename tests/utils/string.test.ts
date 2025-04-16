import { expect, describe, it } from 'vitest';
import { toPascalCase } from '../../src/utils/string';

describe('String Utils', () => {
  describe('toPascalCase', () => {
    it('should convert kebab-case to PascalCase', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
    });

    it('should convert snake_case to PascalCase', () => {
      expect(toPascalCase('hello_world')).toBe('HelloWorld');
    });

    it('should convert camelCase to PascalCase', () => {
      expect(toPascalCase('helloWorld')).toBe('HelloWorld');
    });

    it('should handle spaces', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld');
    });

    it('should handle uppercase', () => {
      expect(toPascalCase('HELLO_WORLD')).toBe('HelloWorld');
    });

    it('should handle empty strings', () => {
      expect(toPascalCase('')).toBe('');
    });
  });
});
