import { expect, test } from 'vitest';

import { entityQuery } from '@/features/logbook/api/entities';

const PROJECT = { virtualLabId: 'vl', projectId: 'p' };

test('an entity card asks EntityCore only for a real id, never a path from the page text', () => {
  const id = '3f2a8c1e-0b9d-4c6e-9a7f-1d2e3f4a5b6c';
  expect(entityQuery('circuit', id, PROJECT).enabled).toBe(true);
  expect(entityQuery('circuit', '../../logbook/v1/research/x?a=', PROJECT).enabled).toBe(false);
  expect(entityQuery('circuit', '', PROJECT).enabled).toBe(false);
});
