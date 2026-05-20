import { describe, expect, it } from 'vitest';

import { DEFAULT_SECTION, SECTIONS } from './constants';
import { EnumSection } from './sections/sections';
import { getSanityPagesSlugPredicate, getSection } from './utils';

describe('getSanityPagesSlugPredicate()', () => {
  it('returns the home predicate for an empty string', () => {
    expect(getSanityPagesSlugPredicate('')).toBe('(slug.current == "/" || slug.current == "home")');
  });

  it('returns the home predicate for "/"', () => {
    expect(getSanityPagesSlugPredicate('/')).toBe(
      '(slug.current == "/" || slug.current == "home")'
    );
  });

  it('builds a predicate for a single segment', () => {
    expect(getSanityPagesSlugPredicate('foo')).toBe('slug.current == "foo"');
  });

  it('uses the last segment for a nested slug', () => {
    expect(getSanityPagesSlugPredicate('parent/child')).toBe('slug.current == "child"');
  });

  it('filters out empty segments from trailing slash', () => {
    expect(getSanityPagesSlugPredicate('foo/')).toBe('slug.current == "foo"');
  });

  it('JSON-escapes quoted characters in the slug', () => {
    expect(getSanityPagesSlugPredicate('with "quotes"')).toBe(
      'slug.current == "with \\"quotes\\""'
    );
  });
});

describe('getSection()', () => {
  it('returns the matching section for a known slug', () => {
    const about = SECTIONS.find((s) => s.index === EnumSection.About);
    expect(getSection('about')).toBe(about);
  });

  it('returns the default section for an unknown slug', () => {
    expect(getSection('this-slug-does-not-exist')).toBe(DEFAULT_SECTION);
  });

  it('trims and lowercases the slug before matching', () => {
    const about = SECTIONS.find((s) => s.index === EnumSection.About);
    expect(getSection('  ABOUT  ')).toBe(about);
  });

  it('returns the matching section for a known enum index', () => {
    const about = SECTIONS.find((s) => s.index === EnumSection.About);
    expect(getSection(EnumSection.About)).toBe(about);
  });

  it('returns the default section for an unknown enum index', () => {
    expect(getSection(9999 as EnumSection)).toBe(DEFAULT_SECTION);
  });
});
