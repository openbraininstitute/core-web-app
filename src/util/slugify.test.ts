import { describe, expect, it } from 'vitest';

import Slugify, { extractInitials } from './slugify';

describe('Slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(Slugify('Hello World')).toBe('hello-world');
  });

  it('strips non-word punctuation', () => {
    expect(Slugify('hi!@#$')).toBe('hi');
  });

  it('preserves underscores and hyphens (both are \\w / kept)', () => {
    expect(Slugify('foo_bar-baz')).toBe('foo_bar-baz');
  });

  it('returns an empty string for empty input', () => {
    expect(Slugify('')).toBe('');
  });
});

describe('extractInitials', () => {
  it('returns empty string for undefined / null / empty', () => {
    expect(extractInitials(undefined)).toBe('');
    expect(extractInitials(null)).toBe('');
    expect(extractInitials('')).toBe('');
  });

  it('extracts initials from a two-word name', () => {
    expect(extractInitials('Pavlo Getta')).toBe('PG');
  });

  it('treats hyphens, dots, and underscores as separators and caps at 2 chars', () => {
    expect(extractInitials('a-b.c_d')).toBe('AB');
  });

  it('returns N/A when no letters are present', () => {
    expect(extractInitials('123')).toBe('N/A');
  });
});
