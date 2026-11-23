import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useObjectUrl } from '@/features/logbook/hooks/use-object-url';

// jsdom has no object URLs.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

test('an SVG gets a data: URL, which can never open as a page of this site', async () => {
  const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'], {
    type: 'image/svg+xml',
  });
  const { result } = renderHook(() => useObjectUrl(svg));
  await waitFor(() => expect(result.current).toMatch(/^data:image\/svg\+xml/));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('other files get a blob: URL, revoked when they go', () => {
  const png = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
  const { result, unmount } = renderHook(() => useObjectUrl(png));
  expect(result.current).toBe('blob:fake');
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
});
