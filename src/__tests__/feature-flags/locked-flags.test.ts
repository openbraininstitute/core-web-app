import { afterEach, describe, expect, it, vi } from 'vitest';

const cookie = { value: JSON.stringify({ logbook: true, learn: true }) };

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => cookie }) }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

/** The flags as read on a deployment of the kind given, with the cookie asking for logbook and learn. */
async function flagsOn(environment: string) {
  vi.stubEnv('DEPLOYMENT_ENV', environment);
  vi.resetModules();
  const { getAllFlags } = await import('@/features/feature-flags');
  return getAllFlags();
}

afterEach(() => vi.unstubAllEnvs());

describe('feature flags / environments', () => {
  it.each(['local', 'staging'])('lets the cookie switch Logbook on in %s', async (environment) => {
    expect((await flagsOn(environment)).logbook).toBe(true);
  });

  it.each([
    'preview',
    'development',
    'production',
  ])('keeps Logbook off in %s, whatever the cookie holds', async (environment) => {
    const flags = await flagsOn(environment);
    expect(flags.logbook).toBe(false);
    // a flag with no list of environments is the cookie's to set, as before
    expect(flags.learn).toBe(true);
  });
});
