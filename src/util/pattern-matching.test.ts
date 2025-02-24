import { checkMatchPatterns } from '@/util/pattern-matching';

describe('util/pattern-matching.ts', () => {
  describe('checkMatchPatterns()', () => {
    it('should match basic strings', () => {
      expect(checkMatchPatterns('a', ['a'])).toBeTruthy();

      expect(checkMatchPatterns('aa', ['a', 'aa'])).toBeTruthy();

      expect(checkMatchPatterns('aa', ['a', 'aaa'])).toBeFalsy();
    });

    it('should handle regular expressions to allow for partial matching', () => {
      expect(checkMatchPatterns('lorem', [/^.ore.$/])).toBeTruthy();

      expect(checkMatchPatterns(' lorem', [/^lorem$/])).toBeFalsy();

      expect(
        checkMatchPatterns('/app/build/connectome-definition/interactive', [
          '/app/build/cell-composition',
          /^\/app\/build\/connectome-definition\//,
        ])
      ).toBeTruthy();

      expect(
        checkMatchPatterns('/app/build/cell-composition/build', [
          '/app/build/cell-composition',
          /^\/app\/build\/connectome-definition\//,
        ])
      ).toBeFalsy();
    });
  });
});
