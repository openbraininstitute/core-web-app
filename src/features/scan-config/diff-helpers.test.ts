import { describe, expect, it } from 'vitest';

import {
  hasHighlightsForRoot,
  highlightedEntries,
  lookupFieldType,
  resolveDominantType,
  resolveEntryHighlightType,
  resolveRootHighlightType,
} from './diff-helpers';

import type { ConfigHighlight } from '@/state/config-highlights';
import type { DiffType } from '@/utils/diff';

function highlight(path: string[], type: DiffType): ConfigHighlight {
  return { path, type } as ConfigHighlight;
}

describe('resolveDominantType()', () => {
  it('returns null for an empty set', () => {
    expect(resolveDominantType(new Set())).toBeNull();
  });

  it('returns "add" when the set only contains "add"', () => {
    expect(resolveDominantType(new Set<DiffType>(['add']))).toBe('add');
  });

  it('returns "remove" when the set only contains "remove"', () => {
    expect(resolveDominantType(new Set<DiffType>(['remove']))).toBe('remove');
  });

  it('returns "replace" when the set only contains "replace"', () => {
    expect(resolveDominantType(new Set<DiffType>(['replace']))).toBe('replace');
  });

  it('returns "replace" for mixed add/remove', () => {
    expect(resolveDominantType(new Set<DiffType>(['add', 'remove']))).toBe('replace');
  });

  it('returns "replace" when "replace" is present in a mix', () => {
    expect(resolveDominantType(new Set<DiffType>(['add', 'replace']))).toBe('replace');
  });
});

describe('hasHighlightsForRoot()', () => {
  it('returns true when at least one highlight has the given root', () => {
    const highlights = [highlight(['foo', 'a'], 'add'), highlight(['bar'], 'remove')];
    expect(hasHighlightsForRoot(highlights, 'foo')).toBe(true);
  });

  it('returns false when no highlight matches the root', () => {
    const highlights = [highlight(['bar'], 'remove')];
    expect(hasHighlightsForRoot(highlights, 'foo')).toBe(false);
  });
});

describe('resolveRootHighlightType()', () => {
  it('returns null when no highlight matches the root', () => {
    const highlights = [highlight(['bar'], 'remove')];
    expect(resolveRootHighlightType(highlights, 'foo')).toBeNull();
  });

  it('returns the dominant type across matching highlights', () => {
    const highlights = [
      highlight(['foo', 'a'], 'add'),
      highlight(['foo', 'b'], 'remove'),
      highlight(['bar'], 'add'),
    ];
    expect(resolveRootHighlightType(highlights, 'foo')).toBe('replace');
  });

  it('returns the single type when all matching highlights agree', () => {
    const highlights = [highlight(['foo', 'a'], 'add'), highlight(['foo', 'b'], 'add')];
    expect(resolveRootHighlightType(highlights, 'foo')).toBe('add');
  });
});

describe('resolveEntryHighlightType()', () => {
  it('returns null when no highlight matches both root and entry', () => {
    const highlights = [highlight(['foo', 'a'], 'add'), highlight(['bar', 'b'], 'remove')];
    expect(resolveEntryHighlightType(highlights, 'foo', 'b')).toBeNull();
  });

  it('ignores highlights with path length < 2', () => {
    const highlights = [highlight(['foo'], 'add')];
    expect(resolveEntryHighlightType(highlights, 'foo', 'a')).toBeNull();
  });

  it('returns the dominant type for matching highlights', () => {
    const highlights = [
      highlight(['foo', 'a'], 'add'),
      highlight(['foo', 'a'], 'remove'),
      highlight(['foo', 'b'], 'add'),
    ];
    expect(resolveEntryHighlightType(highlights, 'foo', 'a')).toBe('replace');
  });
});

describe('highlightedEntries()', () => {
  it('returns unique entry names matching root and type', () => {
    const highlights = [
      highlight(['foo', 'a'], 'add'),
      highlight(['foo', 'a'], 'add'),
      highlight(['foo', 'b'], 'add'),
      highlight(['foo', 'c'], 'remove'),
      highlight(['bar', 'd'], 'add'),
    ];
    expect(highlightedEntries(highlights, 'foo', 'add').sort()).toEqual(['a', 'b']);
  });

  it('honors the exclude set', () => {
    const highlights = [highlight(['foo', 'a'], 'add'), highlight(['foo', 'b'], 'add')];
    expect(highlightedEntries(highlights, 'foo', 'add', new Set(['a']))).toEqual(['b']);
  });

  it('returns an empty array when no highlights match', () => {
    const highlights = [highlight(['bar', 'a'], 'add')];
    expect(highlightedEntries(highlights, 'foo', 'add')).toEqual([]);
  });

  it('skips highlights with path length < 2', () => {
    const highlights = [highlight(['foo'], 'add')];
    expect(highlightedEntries(highlights, 'foo', 'add')).toEqual([]);
  });
});

describe('lookupFieldType()', () => {
  it('returns null when rootElement is undefined', () => {
    expect(
      lookupFieldType(
        'field',
        undefined,
        undefined,
        () => undefined,
        () => undefined
      )
    ).toBeNull();
  });

  it('prefers fieldLookup("<entry>/<field>") when selectedEntry is set', () => {
    const result = lookupFieldType(
      'name',
      'root',
      'entry1',
      () => ({ type: 'replace' }),
      (key) => (key === 'entry1/name' ? { type: 'add' } : undefined)
    );
    expect(result).toBe('add');
  });

  it('falls back to entryLookup when field-level lookup misses (and entry type is not "replace")', () => {
    const result = lookupFieldType(
      'name',
      'root',
      'entry1',
      (entry) => (entry === 'entry1' ? { type: 'add' } : undefined),
      () => undefined
    );
    expect(result).toBe('add');
  });

  it('returns null when selectedEntry is set, no field match, and entry type is "replace"', () => {
    const result = lookupFieldType(
      'name',
      'root',
      'entry1',
      () => ({ type: 'replace' }),
      () => undefined
    );
    expect(result).toBeNull();
  });

  it('returns null when selectedEntry is set and neither lookup finds anything', () => {
    const result = lookupFieldType(
      'name',
      'root',
      'entry1',
      () => undefined,
      () => undefined
    );
    expect(result).toBeNull();
  });

  it('uses fieldLookup(fieldName) directly when selectedEntry is unset', () => {
    const result = lookupFieldType(
      'name',
      'root',
      undefined,
      () => undefined,
      (key) => (key === 'name' ? { type: 'remove' } : undefined)
    );
    expect(result).toBe('remove');
  });

  it('returns null when selectedEntry is unset and field lookup misses', () => {
    const result = lookupFieldType(
      'name',
      'root',
      undefined,
      () => undefined,
      () => undefined
    );
    expect(result).toBeNull();
  });
});
