import { expect, test } from 'vitest';

import { caretColourOf } from '@/features/logbook/editor/extensions';

test('a caret colour is used only when it is a plain hex colour', () => {
  expect(caretColourOf({ color: '#1677c9' })).toBe('#1677c9');
  expect(caretColourOf({ color: '#ABCDEF' })).toBe('#ABCDEF');
  // A crafted awareness value must not reach a style attribute.
  expect(caretColourOf({ color: 'red 0%, red); position:fixed; inset:0' })).toBe('#595959');
  expect(caretColourOf({ color: 'url(https://example.test/x.png)' })).toBe('#595959');
  expect(caretColourOf({ color: 42 })).toBe('#595959');
  expect(caretColourOf({})).toBe('#595959');
});
