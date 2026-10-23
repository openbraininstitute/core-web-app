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

describe('ViewerControlsMenu spin', () => {
  it('turns the spin on', () => {
    const onToggleSpin = vi.fn();
    render(<ViewerControlsMenu {...MENU} spin={false} onToggleSpin={onToggleSpin} />);
    fireEvent.click(screen.getByTestId('viewer-settings'));
    const toggle = screen.getByTestId('viewer-toggle-spin');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);

    expect(onToggleSpin.mock.calls[0][0]).toBe(true);
  });

  it('leaves the switch out without a handler', () => {
    render(<ViewerControlsMenu {...MENU} />);
    fireEvent.click(screen.getByTestId('viewer-settings'));

    expect(screen.queryByTestId('viewer-toggle-spin')).toBeNull();
  });
});
