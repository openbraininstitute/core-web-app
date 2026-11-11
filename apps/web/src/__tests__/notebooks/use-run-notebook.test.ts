import { describe, expect, it } from 'vitest';

import { buildRunTargets } from '@/features/notebooks/hooks/use-run-notebook';

describe('buildRunTargets', () => {
  it('exposes only the default run target on every deployment', () => {
    for (const env of ['production', 'staging', 'local', 'preview', 'development']) {
      expect(buildRunTargets(env).map((t) => t.key)).toEqual(['default']);
    }
  });

  it('the default target has no cloud override', () => {
    expect(buildRunTargets('development')[0].cloud).toBeUndefined();
  });
});
