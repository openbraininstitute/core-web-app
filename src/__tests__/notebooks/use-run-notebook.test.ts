import { describe, expect, it } from 'vitest';

import { buildRunTargets } from '@/features/notebooks/hooks/use-run-notebook';

describe('buildRunTargets', () => {
  it('exposes only the default run target on non-dev deployments', () => {
    expect(buildRunTargets('production').map((t) => t.key)).toEqual(['default']);
    expect(buildRunTargets('staging').map((t) => t.key)).toEqual(['default']);
  });

  it('adds the single-pod AWS/Azure targets on dev/preview/local deployments', () => {
    for (const env of ['local', 'preview', 'development']) {
      expect(buildRunTargets(env).map((t) => t.key)).toEqual(['default', 'aws-dev', 'azure-dev']);
    }
  });

  it('dev targets carry their cloud override and a brand icon', () => {
    const [, aws, azure] = buildRunTargets('development');
    expect(aws).toMatchObject({ key: 'aws-dev', cloud: 'aws' });
    expect(azure).toMatchObject({ key: 'azure-dev', cloud: 'azure' });
    expect(typeof aws.Icon).toBe('function');
    expect(typeof azure.Icon).toBe('function');
  });

  it('the default target has no cloud override', () => {
    expect(buildRunTargets('development')[0].cloud).toBeUndefined();
  });
});
