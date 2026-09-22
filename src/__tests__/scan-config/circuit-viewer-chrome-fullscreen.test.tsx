import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';

import type { ViewerControlsMenuProps } from '@/features/scan-config/components/color-by/viewer-controls-menu';

const MENU: ViewerControlsMenuProps = {
  onCaptureImage: vi.fn(),
  backgroundDark: false,
  onBackgroundDarkChange: vi.fn(),
  hasSavedConfig: false,
  onResetConfig: vi.fn(),
};

const VIZ = { menu: MENU, onResetView: vi.fn() };

/** The host's root, with the fullscreen call jsdom does not implement. */
function viewerRoot() {
  const root = document.createElement('div');
  root.requestFullscreen = vi.fn();
  return root;
}

/** jsdom has no fullscreen API, so stub the property the button reads. */
function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: element });
}

afterEach(() => setFullscreenElement(null));

describe('CircuitViewerChrome fullscreen', () => {
  it('leaves the button out for a host that offers fullscreen itself', () => {
    render(<CircuitViewerChrome vizActive viz={VIZ} />);

    expect(screen.queryByRole('button', { name: 'Full screen' })).toBeNull();
  });

  it('blows up the element the host named', () => {
    const root = viewerRoot();
    render(<CircuitViewerChrome vizActive fullscreen={{ target: root }} viz={VIZ} />);

    const button = screen.getByRole('button', { name: 'Full screen' });
    expect(screen.getByTestId('viewer-chrome-left')).toContainElement(button);
    expect(button).toBe(screen.getByTestId('viewer-full-screen'));
    fireEvent.click(button);
    expect(root.requestFullscreen).toHaveBeenCalledOnce();
  });

  // A button that came and went between renders would be worse than one that
  // does nothing.
  it('stands there inert until the host has an element to offer', () => {
    render(<CircuitViewerChrome vizActive fullscreen={{ target: null }} viz={VIZ} />);

    const button = screen.getByRole('button', { name: 'Full screen' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
  });

  it('offers the way back once its own element fills the screen', () => {
    const root = viewerRoot();
    document.exitFullscreen = vi.fn();
    setFullscreenElement(root);

    render(<CircuitViewerChrome vizActive fullscreen={{ target: root }} viz={VIZ} />);

    const button = screen.getByRole('button', { name: 'Exit full screen' });
    fireEvent.click(button);
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
    expect(root.requestFullscreen).not.toHaveBeenCalled();
  });

  // Both viewers on the scan-config page stay mounted, so one filling the
  // screen must not turn the other's button into an exit.
  it('ignores another viewer filling the screen', () => {
    const root = viewerRoot();
    setFullscreenElement(document.createElement('div'));

    render(<CircuitViewerChrome vizActive fullscreen={{ target: root }} viz={VIZ} />);

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(root.requestFullscreen).toHaveBeenCalledOnce();
  });

  // A designer image is worth filling the screen with too, so the button sits
  // outside the 3D cluster that stands down with the scene.
  it('stays on offer in a view that is not the 3D one', () => {
    render(
      <CircuitViewerChrome vizActive={false} fullscreen={{ target: viewerRoot() }} viz={VIZ} />
    );

    expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Viewer settings' })).toBeNull();
  });
});
