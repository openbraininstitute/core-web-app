import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';

import type { ICircuitViewerChromeProps } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';
import type {
  ColorByControls,
  PopulationsControls,
} from '@/features/scan-config/components/color-by/use-circuit-color-by';
import type { ViewerControlsMenuProps } from '@/features/scan-config/components/color-by/viewer-controls-menu';

const MENU: ViewerControlsMenuProps = {
  onFullscreen: vi.fn(),
  onResetView: vi.fn(),
  onCaptureImage: vi.fn(),
  backgroundDark: false,
  onBackgroundDarkChange: vi.fn(),
  hasSavedConfig: false,
  onResetConfig: vi.fn(),
};

const COLOR_BY: ColorByControls = {
  selectedProperty: null,
  onSelectProperty: vi.fn(),
  properties: [{ name: 'mtype', kind: 'string', label: 'M-type' }],
  propertiesLoading: false,
  mapping: null,
  legendLoading: false,
  propertiesError: false,
  onRetryProperties: vi.fn(),
  onChangeCategoryColor: vi.fn(),
};

const POPULATIONS: PopulationsControls = {
  populations: [
    { name: 'cortex', type: 'biophysical', file: 'nodes.h5' },
    { name: 'thalamus', type: 'biophysical', file: 'nodes.h5' },
  ],
  hidden: [],
  onChange: vi.fn(),
  selected: 'cortex',
  onSelect: vi.fn(),
};

function renderChrome(viz: ICircuitViewerChromeProps['viz']) {
  render(<CircuitViewerChrome vizActive viz={viz} />);
}

describe('CircuitViewerChrome populations pill', () => {
  it('keeps the pill out of the element the colour key is measured from', () => {
    renderChrome({ menu: MENU, colorBy: COLOR_BY, populations: POPULATIONS });

    const pill = screen.getByTestId('populations-menu-trigger');
    // The key below the toolbar is sized from this element, so anything counted
    // into it is something the key then stretches out to cover.
    expect(screen.getByTestId('color-by-toolbar')).not.toContainElement(pill);
  });

  it('offers the pill to a host that has turned colour-by off', () => {
    renderChrome({ menu: MENU, populations: POPULATIONS });

    expect(screen.getByTestId('populations-menu-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('color-by-toolbar')).toBeNull();
  });

  it('leaves the corner alone when the host offers neither', () => {
    renderChrome({ menu: MENU });

    expect(screen.queryByTestId('populations-menu-trigger')).toBeNull();
    expect(screen.queryByTestId('color-by-toolbar')).toBeNull();
  });
});
