import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Logout from '@/app/app/log-out/Logout';

const signOut = vi.hoisted(() => vi.fn());
vi.mock('next-auth/react', () => ({ signOut }));

afterEach(() => {
  vi.unstubAllGlobals();
  signOut.mockReset();
});

describe('logging out', () => {
  it('drops the project files the viewers kept in the browser, then signs out', async () => {
    const dropped: string[] = [];
    vi.stubGlobal('caches', {
      delete: async (name: string) => {
        expect(signOut).not.toHaveBeenCalled();
        dropped.push(name);
        return true;
      },
    });

    render(<Logout />);

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' }));
    expect(dropped.sort()).toEqual([
      'obi-circuit-h5-v1',
      'obi-connectivity-h5-v1',
      'obi-ephys-nwb-v1',
    ]);
  });

  it('signs out all the same where a cache will not be dropped', async () => {
    vi.stubGlobal('caches', { delete: () => Promise.reject(new Error('blocked')) });

    render(<Logout />);

    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
