import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';

import type { ViewerControlsMenuProps } from '@/features/scan-config/components/color-by/viewer-controls-menu';

const MENU: ViewerControlsMenuProps = {
  onCaptureImage: vi.fn(),
  backgroundDark: false,
  onBackgroundDarkChange: vi.fn(),
  hasSavedConfig: false,
  onResetConfig: vi.fn(),
};

describe('CircuitViewerChrome re-centre button', () => {
  it('frames the population on show from the viewer, not from a menu', () => {
    const onResetView = vi.fn();
    render(<CircuitViewerChrome vizActive viz={{ menu: MENU, onResetView }} />);

    const button = screen.getByTestId('viewer-reset-view');
    // In the left cluster, under the row that says what the scene is made of.
    expect(screen.getByTestId('viewer-chrome-left')).toContainElement(button);
    fireEvent.click(button);
    expect(onResetView).toHaveBeenCalledOnce();
  });

  // It acts on the 3D camera, so it stands down with the rest of the 3D chrome
  // rather than sitting over a designer image doing nothing.
  it('stands down in a view that is not the 3D one', () => {
    render(<CircuitViewerChrome vizActive={false} viz={{ menu: MENU, onResetView: vi.fn() }} />);

    expect(screen.getByTestId('viewer-reset-view').closest('[inert]')).not.toBeNull();
  });

  it('is left out where the host offers no 3D chrome at all', () => {
    render(<CircuitViewerChrome vizActive />);

    expect(screen.queryByTestId('viewer-reset-view')).toBeNull();
  });
});
