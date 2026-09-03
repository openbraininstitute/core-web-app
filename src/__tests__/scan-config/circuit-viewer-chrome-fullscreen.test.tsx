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

  // A designer image is worth filling the screen with too, so the button sits
  // outside the 3D cluster that stands down with the scene.
  it('stays on offer in a view that is not the 3D one', () => {
    render(
      <CircuitViewerChrome vizActive={false} onToggleFullscreen={vi.fn()} viz={{ menu: MENU }} />
    );

    expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Viewer settings' })).toBeNull();
  });
});
