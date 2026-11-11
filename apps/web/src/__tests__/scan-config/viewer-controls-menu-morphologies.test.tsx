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

describe('ViewerControlsMenu morphologies', () => {
  it('switches the cells between somas and morphologies', () => {
    const onToggleMorphologies = vi.fn();
    render(
      <ViewerControlsMenu
        {...MENU}
        showMorphologies={false}
        onToggleMorphologies={onToggleMorphologies}
      />
    );
    fireEvent.click(screen.getByTestId('viewer-settings'));

    const toggle = screen.getByTestId('viewer-toggle-morphologies');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);

    expect(onToggleMorphologies.mock.calls[0][0]).toBe(true);
  });

  it('shows the switch on while the cells are morphologies', () => {
    render(<ViewerControlsMenu {...MENU} showMorphologies onToggleMorphologies={vi.fn()} />);
    fireEvent.click(screen.getByTestId('viewer-settings'));

    expect(screen.getByTestId('viewer-toggle-morphologies')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('leaves the switch out where morphologies are not offered', () => {
    render(<ViewerControlsMenu {...MENU} />);
    fireEvent.click(screen.getByTestId('viewer-settings'));

    expect(screen.queryByTestId('viewer-toggle-morphologies')).toBeNull();
    expect(screen.queryByTestId('viewer-morphologies-note')).toBeNull();
  });

  it('shows the switch off and disabled, with why, where the morphologies are coming or never will', () => {
    render(
      <ViewerControlsMenu
        {...MENU}
        showMorphologies
        morphologiesNote="Preparing morphologies, this takes a few minutes"
      />
    );
    fireEvent.click(screen.getByTestId('viewer-settings'));

    const toggle = screen.getByTestId('viewer-toggle-morphologies');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toBeDisabled();
    expect(screen.getByTestId('viewer-morphologies-note')).toHaveTextContent(
      'Preparing morphologies, this takes a few minutes'
    );
  });
});
