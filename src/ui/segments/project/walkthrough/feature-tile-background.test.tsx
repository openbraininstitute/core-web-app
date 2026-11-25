import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const renderer = vi.hoisted(() => ({
  create: vi.fn(),
  visible: vi.fn(),
  source: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('./feature-tile-renderer', () => ({ createFeatureTileRenderer: renderer.create }));

import { FeatureTileBackground } from './feature-tile-background';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('min-width'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  renderer.create.mockReturnValue({
    resize: vi.fn(),
    setVisible: renderer.visible,
    setSource: renderer.source,
    dispose: renderer.dispose,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const field = (active: boolean) => (
  <div data-public-tour>
    <FeatureTileBackground active={active} chapterId="shared" stationary />
  </div>
);

it('does not initialize WebGL on the homepage; keeps one engine across chapter visits', async () => {
  const view = render(field(false));
  expect(renderer.create).not.toHaveBeenCalled();
  await act(async () => {
    view.rerender(field(true));
  });
  expect(renderer.create).toHaveBeenCalledTimes(1);
  expect(renderer.visible).toHaveBeenLastCalledWith(true);
  await act(async () => {
    view.rerender(field(false));
  });
  expect(renderer.visible).toHaveBeenLastCalledWith(false);
  await act(async () => {
    view.rerender(field(true));
  });
  expect(renderer.create).toHaveBeenCalledTimes(1);
});

it('suspends rendering when the browser tab is hidden', async () => {
  await act(async () => {
    render(field(true));
  });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(renderer.visible).toHaveBeenLastCalledWith(false);
});
