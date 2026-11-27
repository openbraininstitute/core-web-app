import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Logout from '@/app/app/log-out/Logout';

const signOut = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/client', () => ({ signOut }));
const dropCleanCopies = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/features/logbook/collaboration/local-sync', () => ({ dropCleanCopies }));

afterEach(() => {
  vi.unstubAllGlobals();
  signOut.mockReset();
  dropCleanCopies.mockClear();
});

describe('logging out', () => {
  it('drops the logbook pages this browser kept, before signing out', async () => {
    vi.stubGlobal('caches', { delete: async () => true });

    render(<Logout />);

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(dropCleanCopies).toHaveBeenCalledTimes(1);
  });

  it('drops the project files the viewers kept in the browser, then signs out', async () => {
    const dropped: string[] = [];
    vi.stubGlobal('caches', {
      delete: async (name: string) => {
        expect(signOut).not.toHaveBeenCalled();
        dropped.push(name);
        return true;
      },
      keys: async () => ['project-data:202611011:cache:circuit-h5', 'unrelated'],
    });

    render(<Logout />);

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(dropped.sort()).toEqual([
      'analysis-pdf-cache-v1',
      'circuit-morphology-mpack',
      'em-cell-mesh-full',
      'em-cell-mesh-glb',
      'em-cell-mesh-stand-in',
      'ephys-nwb-assets',
      'obi-circuit-h5-v1',
      'obi-connectivity-h5-v1',
      'obi-ephys-nwb-v1',
      'project-data:202611011:cache:circuit-h5',
      'project-data:202611201:cache:analysis-assets',
      'project-data:202611201:cache:circuit-h5',
      'project-data:202611201:cache:circuit-morphology-pack',
      'project-data:202611201:cache:connectivity-h5',
      'project-data:202611201:cache:em-cell-mesh-full',
      'project-data:202611201:cache:em-cell-mesh-glb',
      'project-data:202611201:cache:em-cell-mesh-stand-in',
      'project-data:202611201:cache:ephys-nwb',
      'project-data:202611201:cache:ephys-nwb-assets',
    ]);
  });

  it('signs out all the same where a cache will not be dropped', async () => {
    vi.stubGlobal('caches', {
      delete: () => Promise.reject(new Error('blocked')),
      keys: async () => [],
    });

    render(<Logout />);

    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it('goes to the home page once signed out, and stays when signing out fails', async () => {
    const assign = vi.fn();
    vi.stubGlobal('caches', { delete: async () => true, keys: async () => [] });
    vi.stubGlobal('location', { ...window.location, assign });

    const { unmount } = render(<Logout />);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    unmount();

    assign.mockClear();
    signOut.mockRejectedValueOnce(new Error('offline'));
    render(<Logout />);
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not wait more than two seconds for the caches to go', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('caches', { delete: () => new Promise(() => {}), keys: async () => [] });

      render(<Logout />);

      await vi.advanceTimersByTimeAsync(1999);
      expect(signOut).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(signOut).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
