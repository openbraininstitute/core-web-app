import { describe, expect, it } from 'vitest';

import {
  buildRunTargets,
  sessionsRefreshInterval,
} from '@/features/notebooks/hooks/use-run-notebook';

import type { NotebookSession } from '@/services/notebooks';

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

describe('sessionsRefreshInterval', () => {
  const withState = (state: NotebookSession['state']): NotebookSession => ({
    session_number: 0,
    kind: 'notebook',
    state,
    profile: null,
    started_on: null,
    url: 'u',
  });

  it('refreshes slowly when every session is running or there are none', () => {
    expect(sessionsRefreshInterval(undefined)).toBe(15_000);
    expect(sessionsRefreshInterval([withState('running')])).toBe(15_000);
  });

  it.each(['starting', 'stopping'] as const)('refreshes quickly while a session is %s', (state) => {
    expect(sessionsRefreshInterval([withState('running'), withState(state)])).toBe(3_000);
  });
});
