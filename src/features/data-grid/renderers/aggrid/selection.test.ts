import { describe, expect, it } from 'vitest';

import { mergePageSelection } from './selection';

describe('mergePageSelection', () => {
  it('single mode REPLACES the whole selection with the current page pick', () => {
    // a was picked on a previous page; picking b on this page replaces it (radio)
    expect(mergePageSelection('single', ['a'], ['b', 'c'], ['b'])).toEqual(['b']);
  });

  it('single mode with an empty page pick clears the selection', () => {
    expect(mergePageSelection('single', ['a'], ['b', 'c'], [])).toEqual([]);
  });

  it('multiRow mode ACCUMULATES across pages (off-page ids preserved)', () => {
    // a is selected on page 1 (off this page); b newly checked on page 2
    expect(mergePageSelection('multiRow', ['a'], ['b', 'c'], ['b'])).toEqual(['a', 'b']);
  });

  it('multiRow mode drops an id when its row is unchecked on the current page', () => {
    // b was selected but is unchecked now; a (off-page) stays
    expect(mergePageSelection('multiRow', ['a', 'b'], ['b', 'c'], [])).toEqual(['a']);
  });

  it('multiRow defaults (mode undefined) behave like multiRow', () => {
    expect(mergePageSelection(undefined, ['a'], ['b'], ['b'])).toEqual(['a', 'b']);
  });
});
