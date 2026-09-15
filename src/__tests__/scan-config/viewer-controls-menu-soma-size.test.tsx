import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ViewerControlsMenu } from '@/features/scan-config/components/color-by/viewer-controls-menu';

import type { ViewerControlsMenuProps } from '@/features/scan-config/components/color-by/viewer-controls-menu';

const MENU: ViewerControlsMenuProps = {
  onCaptureImage: vi.fn(),
  backgroundDark: false,
  onBackgroundDarkChange: vi.fn(),
  hasSavedConfig: false,
  onResetConfig: vi.fn(),
};

describe('ViewerControlsMenu soma size', () => {
  it('shows the slider with a multiplier readout', () => {
    render(<ViewerControlsMenu {...MENU} somaSizeScale={1.5} onSomaSizeScaleChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('viewer-settings'));

    expect(screen.getByTestId('viewer-slider-soma-size')).toHaveTextContent('1.5×');
  });

  it('leaves the slider out without a handler', () => {
    render(<ViewerControlsMenu {...MENU} />);
    fireEvent.click(screen.getByTestId('viewer-settings'));

    expect(screen.queryByTestId('viewer-slider-soma-size')).toBeNull();
  });
});
