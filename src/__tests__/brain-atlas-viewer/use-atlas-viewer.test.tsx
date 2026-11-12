import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** A failed viewer import shows the view's fallback, and the next view to mount tries again. */

const VIEWER = '@/features/brain-atlas-viewer';

afterEach(() => {
  vi.doUnmock(VIEWER);
  vi.resetModules();
});

describe('useAtlasViewer', () => {
  it('hands back the error of a failed import, then loads on the next mount', async () => {
    vi.doMock(VIEWER, () => {
      throw new Error('chunk gone');
    });
    const { useAtlasViewer } = await import('@/features/brain-atlas-viewer/use-atlas-viewer');

    const first = renderHook(() => useAtlasViewer());
    await waitFor(() => expect(first.result.current.error).toBeInstanceOf(Error));
    expect(first.result.current.viewer).toBeNull();
    first.unmount();

    vi.doUnmock(VIEWER);
    vi.doMock(VIEWER, () => ({ AtlasViewer: () => null }));
    const second = renderHook(() => useAtlasViewer());
    await waitFor(() => expect(second.result.current.viewer).not.toBeNull());
    expect(second.result.current.error).toBeNull();
  });
});
