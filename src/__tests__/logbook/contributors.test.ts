import { afterEach, expect, test, vi } from 'vitest';

import { contributorsOf } from '@/features/logbook/api/contributors';

const { getResearchContributors } = vi.hoisted(() => ({ getResearchContributors: vi.fn() }));
vi.mock('@/api/logbook/queries/research', () => ({ getResearchContributors }));

const PROJECT = { virtualLabId: 'lab', projectId: 'p1' };
const writer = (label: string) => ({ actorId: 1, userId: 'u', label, via: 'ui', lastAt: '' });

afterEach(() => getResearchContributors.mockReset());

test('cards asking together share one request, and each gets its own writers', async () => {
  getResearchContributors.mockResolvedValue({
    items: [
      { researchId: 'a', contributors: [writer('alice')] },
      { researchId: 'b', contributors: [writer('bob')] },
    ],
  });

  const [a, b, c] = await Promise.all([
    contributorsOf(PROJECT, 'a'),
    contributorsOf(PROJECT, 'b'),
    contributorsOf(PROJECT, 'c'),
  ]);

  expect(getResearchContributors).toHaveBeenCalledTimes(1);
  expect(getResearchContributors.mock.calls[0]?.[0]).toMatchObject({ ids: ['a', 'b', 'c'] });
  expect(a.map((w) => w.label)).toEqual(['alice']);
  expect(b.map((w) => w.label)).toEqual(['bob']);
  expect(c).toEqual([]);
});

test('a failed request fails every card that asked', async () => {
  getResearchContributors.mockRejectedValue(new Error('down'));

  const results = await Promise.allSettled([
    contributorsOf(PROJECT, 'a'),
    contributorsOf(PROJECT, 'b'),
  ]);

  expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
});
