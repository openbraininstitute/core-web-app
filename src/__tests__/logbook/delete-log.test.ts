import { expect, test } from 'vitest';

import { typedOf } from '@/features/logbook/ui/ConfirmDeleteDialog';

test('the typed confirmation counts the right letters from the start; a wrong one is -1', () => {
  expect(typedOf('')).toBe(0);
  expect(typedOf('del')).toBe(3);
  expect(typedOf('  DELETE ')).toBe(6); // case and spaces around do not matter
  expect(typedOf('dex')).toBe(-1);
  expect(typedOf('deleted')).toBe(-1); // more than the word is not the word
});
