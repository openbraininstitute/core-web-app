import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/error';
import { useMorphologyLocationPreviews } from '@/features/scan-config/components/hooks/use-morphology-location-previews';

import type { ReactNode } from 'react';
import type { Config } from '@/features/scan-config/types';

const preview = vi.fn();
vi.mock('@/api/one/morphology-locations', () => ({
  previewMorphologyLocations: (options: { block: Record<string, unknown> }) =>
    preview(options.block),
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));

const RANDOM = { type: 'RandomMorphologyLocations', number_of_locations: 1 };
const CLUSTERED = { type: 'ClusteredMorphologyLocations', n_clusters: 1 };
const EXPLICIT = {
  type: 'ExplicitMorphologyLocations',
  locations: [{ section_id: 1, offset: 0.1 }],
};

function configWith(blocks: Record<string, unknown>): Config {
  return { morphology_locations: blocks } as unknown as Config;
}

function render(initial: Config, client = new QueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    ({ config }) => useMorphologyLocationPreviews({ config, entityId: 'memodel', enabled: true }),
    { wrapper, initialProps: { config: initial } }
  );
}

beforeEach(() => {
  preview.mockReset();
  preview.mockResolvedValue([{ section_id: 3, offset: 0.5 }]);
});

describe('useMorphologyLocationPreviews', () => {
  it('previews only the generated blocks and tags what comes back', async () => {
    const { result } = render(configWith({ picked: EXPLICIT, sampled: RANDOM }));

    await waitFor(() => expect(result.current.locations).toHaveLength(1));
    expect(preview).toHaveBeenCalledExactlyOnceWith(RANDOM);
    expect(result.current.locations[0]).toEqual({
      section_id: 3,
      offset: 0.5,
      entry: 'sampled',
      index: 0,
      generated: true,
    });
  });

  it('says why a block could not be previewed', async () => {
    preview.mockRejectedValue(
      new ApiError('422', { message: 'Parameter sweeps cannot be previewed' })
    );
    const { result } = render(configWith({ sampled: RANDOM }));

    await waitFor(() =>
      expect(result.current.errors.get('sampled')).toBe('Parameter sweeps cannot be previewed')
    );
    expect(result.current.locations).toEqual([]);
  });

  it('does not refetch a block that did not change', async () => {
    const { result, rerender } = render(configWith({ first: RANDOM, second: CLUSTERED }));
    await waitFor(() => expect(result.current.locations).toHaveLength(2));

    rerender({ config: configWith({ first: { ...RANDOM, random_seed: 1 }, second: CLUSTERED }) });

    await waitFor(() => expect(preview).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(preview).toHaveBeenLastCalledWith({ ...RANDOM, random_seed: 1 });
  });

  it('drops the markers once the last generated block is gone', async () => {
    const { result, rerender } = render(configWith({ sampled: RANDOM }));
    await waitFor(() => expect(result.current.locations).toHaveLength(1));

    rerender({ config: configWith({ picked: EXPLICIT }) });

    await waitFor(() => expect(result.current.locations).toEqual([]));
  });

  it('does not bring a deleted block back while a new one is previewed', async () => {
    const { result, rerender } = render(configWith({ sampled: RANDOM }));
    await waitFor(() => expect(result.current.locations).toHaveLength(1));
    rerender({ config: configWith({ picked: EXPLICIT }) });
    await waitFor(() => expect(result.current.locations).toEqual([]));

    let resolve: (rows: unknown[]) => void = () => {};
    preview.mockReturnValue(new Promise((settle) => (resolve = settle)));
    rerender({ config: configWith({ clustered: CLUSTERED }) });
    await waitFor(() => expect(preview).toHaveBeenLastCalledWith(CLUSTERED));

    // Still on its way: nothing from `sampled` may stand in for it.
    expect(result.current.locations).toEqual([]);

    resolve([{ section_id: 4, offset: 0.2 }]);
    await waitFor(() =>
      expect(result.current.locations.map(({ entry }) => entry)).toEqual(['clustered'])
    );
  });

  it('asks again for a block that failed, once the viewer is back', async () => {
    const client = new QueryClient();
    preview.mockRejectedValue(new TypeError('Failed to fetch'));
    const first = render(configWith({ sampled: RANDOM }), client);
    await waitFor(() => expect(first.result.current.errors.get('sampled')).toBeDefined());
    first.unmount();

    preview.mockResolvedValue([{ section_id: 3, offset: 0.5 }]);
    const { result } = render(configWith({ sampled: RANDOM }), client);

    await waitFor(() => expect(result.current.locations).toHaveLength(1));
    expect(result.current.errors.size).toBe(0);
  });
});
