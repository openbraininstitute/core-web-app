import { render, screen } from '@testing-library/react';
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

describe('CircuitViewerChrome Debug menu slot', () => {
  it('gives a place beside the settings to a host that asks', () => {
    const debugSlotRef = vi.fn();
    render(
      <CircuitViewerChrome
        vizActive
        viz={{ menu: MENU, onResetView: vi.fn() }}
        debugSlotRef={debugSlotRef}
      />
    );

    const slot = debugSlotRef.mock.calls[0][0] as HTMLElement;
    expect(screen.getByTestId('viewer-chrome-left')).toContainElement(slot);
    expect(slot.previousElementSibling).toBe(
      screen.getByRole('button', { name: 'Viewer settings' })
    );
  });

  it('stands down with the rest of the 3D chrome', () => {
    const debugSlotRef = vi.fn();
    render(
      <CircuitViewerChrome
        vizActive={false}
        viz={{ menu: MENU, onResetView: vi.fn() }}
        debugSlotRef={debugSlotRef}
      />
    );

    expect((debugSlotRef.mock.calls[0][0] as HTMLElement).closest('[inert]')).not.toBeNull();
  });

  it('has none without the 3D chrome', () => {
    const debugSlotRef = vi.fn();
    render(<CircuitViewerChrome vizActive debugSlotRef={debugSlotRef} />);

    expect(debugSlotRef).not.toHaveBeenCalled();
  });
});
