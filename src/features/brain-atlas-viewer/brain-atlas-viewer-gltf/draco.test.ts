import { beforeEach, describe, expect, it, vi } from 'vitest';

const setLoaderOptions = vi.hoisted(() => vi.fn());
vi.mock('@loaders.gl/core', () => ({ setLoaderOptions }));

describe('configureLocalDracoDecoder', () => {
  beforeEach(() => {
    vi.resetModules();
    setLoaderOptions.mockClear();
  });

  it('points loaders.gl to the self-hosted Draco assets', async () => {
    const { configureLocalDracoDecoder } = await import('./draco');

    configureLocalDracoDecoder();

    expect(setLoaderOptions).toHaveBeenCalledWith({
      useLocalLibraries: true,
      CDN: `${window.location.origin}/draco`,
      draco: { workerUrl: '/draco/draco-worker.js' },
    });
  });

  it('configures loaders.gl only once', async () => {
    const { configureLocalDracoDecoder } = await import('./draco');

    configureLocalDracoDecoder();
    configureLocalDracoDecoder();

    expect(setLoaderOptions).toHaveBeenCalledTimes(1);
  });
});
