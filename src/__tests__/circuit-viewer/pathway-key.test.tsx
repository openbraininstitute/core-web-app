import { render, screen, within } from '@testing-library/react';
import chroma from 'chroma-js';
import { describe, expect, it, vi } from 'vitest';

import { pathwayColors } from '@/features/circuit-viewer/pathway-colors';
import { PathwayKey } from '@/features/circuit-viewer/pathway-key';
import { CircuitViewerChrome } from '@/features/scan-config/components/color-by/circuit-viewer-chrome';
import {
  CANVAS_DARK,
  CANVAS_LIGHT,
  viewerTheme,
} from '@/features/scan-config/components/color-by/contrast';

import type { ColorByControls } from '@/features/scan-config/components/color-by/use-circuit-color-by';
import type { ViewerControlsMenuProps } from '@/features/scan-config/components/color-by/viewer-controls-menu';

const MENU: ViewerControlsMenuProps = {
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

const swatchOf = (label: string) => {
  const swatch = screen.getByText(label).querySelector('span');
  return swatch && chroma(swatch.style.background).hex();
};

describe('PathwayKey', () => {
  it.each([CANVAS_LIGHT, CANVAS_DARK])('names each colour of a pathway on %s', (canvas) => {
    render(<PathwayKey background={canvas} theme={viewerTheme(canvas === CANVAS_DARK)} />);
    const colors = pathwayColors(canvas);

    expect(swatchOf('Presynaptic (row)')).toBe(colors.start);
    expect(swatchOf('Postsynaptic (column)')).toBe(colors.end);
    expect(swatchOf('Both (on the diagonal)')).toBe(colors.both);
    expect(screen.getByText('Other neurons')).toBeInTheDocument();
  });

  it.each([
    ['with a color-by', COLOR_BY],
    ['without', undefined],
  ])('sits in the chrome top right, %s', (_, colorBy) => {
    render(
      <CircuitViewerChrome
        vizActive
        viz={{ menu: MENU, onResetView: vi.fn(), colorBy }}
        keys={<PathwayKey background={CANVAS_LIGHT} />}
      />
    );

    const key = screen.getByTestId('pathway-key');
    expect(key.parentElement?.className).toContain('right-3');
    expect(within(key).getByText(/hover a matrix cell/i)).toBeInTheDocument();
  });

  it("keeps the scene's legends under it in the color-by column", () => {
    const legendSlotRef = vi.fn<(element: HTMLElement | null) => void>();
    render(
      <CircuitViewerChrome
        vizActive
        viz={{ menu: MENU, onResetView: vi.fn(), colorBy: COLOR_BY }}
        legendSlotRef={legendSlotRef}
        keys={<PathwayKey background={CANVAS_LIGHT} />}
      />
    );

    const slot = legendSlotRef.mock.lastCall?.[0];
    expect(slot?.previousElementSibling).toBe(screen.getByTestId('pathway-key'));
  });
});
