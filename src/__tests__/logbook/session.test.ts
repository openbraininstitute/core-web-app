import { expect, test } from 'vitest';

import { meOf } from '@/features/logbook/auth/session';

// A JWT payload is base64url of UTF-8 JSON.
const tokenOf = (claims: Record<string, unknown>): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(claims));
  const payload = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
};

test('a name with accents reads as written', () => {
  expect(meOf(tokenOf({ sub: 'u-1', name: 'Zoë Müller' })).name).toBe('Zoë Müller');
});
