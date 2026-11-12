import { describe, expect, it } from 'vitest';

import { dirOf, isRelativeMarkdownLink, resolveLogPath } from './files';

describe('isRelativeMarkdownLink', () => {
  it.each([
    'notes.md',
    './notes/a.md',
    '../b.markdown',
    'notes/a.md#section',
    'notes/a.MD?x=1',
  ])('accepts %s', (href) => expect(isRelativeMarkdownLink(href)).toBe(true));

  it.each([
    undefined,
    '',
    'https://x.org/a.md',
    'mailto:a@b.md',
    '/reports/a.md',
    '#top',
    'plot.png',
    'notes/',
  ])('rejects %s', (href) => expect(isRelativeMarkdownLink(href)).toBe(false));
});

describe('resolveLogPath', () => {
  it('resolves against the folder of the file holding the link', () => {
    expect(resolveLogPath('', 'notes/a.md')).toBe('notes/a.md');
    expect(resolveLogPath('notes', './b.md')).toBe('notes/b.md');
    expect(resolveLogPath('notes/deep', '../c.md#x')).toBe('notes/c.md');
  });

  it('cannot climb out of the files folder', () => {
    expect(resolveLogPath('notes', '../../../secret.md')).toBe('secret.md');
  });

  it('decodes escaped characters', () => {
    expect(resolveLogPath('', 'my%20notes.md')).toBe('my notes.md');
  });
});

describe('dirOf', () => {
  it('gives the folder of a path', () => {
    expect(dirOf('notes/deep/a.md')).toBe('notes/deep');
    expect(dirOf('a.md')).toBe('');
  });
});
