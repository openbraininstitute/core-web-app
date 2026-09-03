import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';

import type { ViewerControlsMenuProps } from '@/features/scan-config/components/color-by/viewer-controls-menu';

const MENU: ViewerControlsMenuProps = {
  onResetView: vi.fn(),
  onCaptureImage: vi.fn(),
  backgroundDark: false,
  onBackgroundDarkChange: vi.fn(),
  hasSavedConfig: false,
  onResetConfig: vi.fn(),
};

/**
 * One control, and only where the host has somewhere to put the view. Which
 * element goes fullscreen is the host's to say — the scene is rarely the whole
 * of what the user means by the view — so the chrome only draws the button when
 * it is handed the way to do it.
 */
describe('CircuitViewerChrome fullscreen', () => {
  it('leaves the button out for a host that offers fullscreen itself', () => {
    render(<CircuitViewerChrome vizActive viz={{ menu: MENU }} />);

    expect(screen.queryByRole('button', { name: 'Full screen' })).toBeNull();
  });

  it('blows the view up with the control the host supplied', () => {
    const onToggleFullscreen = vi.fn();
    render(
      <CircuitViewerChrome vizActive onToggleFullscreen={onToggleFullscreen} viz={{ menu: MENU }} />
    );

    const button = screen.getByRole('button', { name: 'Full screen' });
    expect(screen.getByTestId('viewer-chrome-left')).toContainElement(button);
    fireEvent.click(button);
    expect(onToggleFullscreen).toHaveBeenCalledOnce();
  });

  // The 3D controls stand down with the scene, but fullscreen is about the
  // viewer rather than the view inside it: a designer image is worth filling
  // the screen with too.
  it('stays on offer in a view that is not the 3D one', () => {
    render(
      <CircuitViewerChrome vizActive={false} onToggleFullscreen={vi.fn()} viz={{ menu: MENU }} />
    );

    expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Viewer settings' })).toBeNull();
  });
});
