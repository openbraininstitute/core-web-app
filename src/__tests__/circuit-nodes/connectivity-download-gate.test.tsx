import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONFIRM_DOWNLOAD_BYTES,
  useConnectivityDownloadGate,
} from '@/features/circuit-nodes/connectivity/use-connectivity';

import type { ReactNode } from 'react';
import type { ConnectivityEntry } from '@/features/circuit-nodes/connectivity/use-connectivity';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab', projectId: 'proj' }),
}));
vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildAssetDownloadRequest: async ({ assetPath }: { assetPath: string }) => ({
    url: `https://entitycore/download?asset_path=${assetPath}`,
    headers: {},
  }),
}));

const cachedUrls = new Set<string>();

beforeEach(() => {
  cachedUrls.clear();
  vi.stubGlobal('caches', {
    open: async () => ({ match: async (url: string) => (cachedUrls.has(url) ? {} : undefined) }),
  });
});
afterEach(() => vi.unstubAllGlobals());

const entry = (path: string, size: number): ConnectivityEntry => ({
  population: 'S1nonbarrel_neurons__S1nonbarrel_neurons__chemical',
  path,
  description: '',
  size,
});

function gate(of: ConnectivityEntry) {
  const client = new QueryClient();
  return renderHook(() => useConnectivityDownloadGate('circuit', 'asset', of), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe('useConnectivityDownloadGate', () => {
  it('lets a matrix up to the threshold through at once', () => {
    const { result } = gate(entry('small.h5', CONFIRM_DOWNLOAD_BYTES));

    expect(result.current.waiting).toBe(false);
    expect(result.current.checking).toBe(false);
  });

  it('holds a larger one until the user says to download it, then remembers', async () => {
    const large = entry('large.h5', CONFIRM_DOWNLOAD_BYTES + 1);
    const { result } = gate(large);

    expect(result.current.waiting).toBe(true);
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.waiting).toBe(true);

    act(() => result.current.allow());
    expect(result.current.waiting).toBe(false);
    // shown again later in the visit, it is not asked about twice
    expect(gate(large).result.current.waiting).toBe(false);
  });

  it('asks nothing of a large matrix the browser already holds', async () => {
    cachedUrls.add('https://entitycore/download?asset_path=cached.h5');
    const { result } = gate(entry('cached.h5', CONFIRM_DOWNLOAD_BYTES * 4));

    await waitFor(() => expect(result.current.waiting).toBe(false));
  });
});
