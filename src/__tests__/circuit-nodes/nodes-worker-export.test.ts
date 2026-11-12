import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({
  open: vi.fn(async () => ({ rowCount: 3, columns: [] })),
  exportCsv: vi.fn(),
}));

vi.mock('comlink', () => ({
  wrap: () => remote,
  proxy: (value: unknown) => value,
  transfer: (value: unknown) => value,
  releaseProxy: Symbol('releaseProxy'),
}));

import { nodesWorkerRegistry } from '@/features/circuit-nodes/hooks/nodes-worker-manager';

const KEY = 'circuit-asset-population';

async function ready() {
  nodesWorkerRegistry.acquire(KEY, {
    populationKey: 'population',
    buildRequest: async () => ({ url: 'https://nodes', headers: {} }),
  });
  await vi.waitFor(() => expect(nodesWorkerRegistry.getState(KEY).status).toBe('ready'));
}

describe('a CSV export through the nodes registry', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'Worker',
      class {
        terminate() {}
      }
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks the worker for the request, and ends as it does', async () => {
    await ready();
    remote.exportCsv.mockResolvedValueOnce(undefined);
    const onPart = () => true;
    const request = { columns: ['node_id'] };
    await expect(nodesWorkerRegistry.exportCsv(KEY, request, onPart)).resolves.toBeUndefined();
    expect(remote.exportCsv).toHaveBeenLastCalledWith(request, onPart);
    nodesWorkerRegistry.release(KEY);
  });

  it('fails rather than wait on a worker that is gone', async () => {
    await ready();
    remote.exportCsv.mockReturnValueOnce(new Promise(() => {}));
    vi.useFakeTimers();
    const exported = nodesWorkerRegistry.exportCsv(KEY, { columns: ['node_id'] }, () => true);
    const failed = expect(exported).rejects.toThrow('The nodes were closed');
    nodesWorkerRegistry.release(KEY);
    nodesWorkerRegistry.release(KEY);
    await vi.runAllTimersAsync();
    await failed;
  });
});
