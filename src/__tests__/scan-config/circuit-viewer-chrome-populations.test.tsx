import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POPULATIONS_MENU_INTRODUCED_KEY } from '@/features/circuit-nodes/components/populations-menu';
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
    { name: 'vpm', type: 'virtual', file: 'inputs.h5' },
  ],
  hidden: [],
  onChange: vi.fn(),
  selected: 'cortex',
  onSelect: vi.fn(),
};

function renderChrome(viz: ICircuitViewerChromeProps['viz'], vizActive = true) {
  render(<CircuitViewerChrome vizActive={vizActive} viz={viz} />);
}

// A user who has met the checklist before, so it stays shut and its own "Show
// all" is not on screen beside the notices below.
beforeEach(() => localStorage.setItem(POPULATIONS_MENU_INTRODUCED_KEY, '1'));

/** The checklist's props with a given hidden set, and a fresh `onChange` to read. */
function withHidden(hidden: string[], overrides: Partial<PopulationsControls> = {}) {
  const onChange = vi.fn();
  return { populations: { ...POPULATIONS, hidden, onChange, ...overrides }, onChange };
}

describe('CircuitViewerChrome populations pill', () => {
  // Which populations are in the scene belongs with the rest of what the scene
  // is made of, not with how it is painted. It also stops the pill jumping: the
  // colour toolbar is right-anchored and its width follows the property name,
  // so anything to its left moves every time a property is picked.
  it('puts the pill with the scene controls, not the colour ones', () => {
    renderChrome({ menu: MENU, colorBy: COLOR_BY, populations: POPULATIONS });

    const pill = screen.getByTestId('populations-menu-trigger');
    expect(screen.getByTestId('viewer-chrome-left')).toContainElement(pill);
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

/**
 * Said here rather than in either viewer: the chrome is the one layer over both
 * of them, and it already holds the way back.
 */
describe('CircuitViewerChrome population notices', () => {
  it('says nothing while every population is on screen', () => {
    renderChrome({ menu: MENU, populations: withHidden([]).populations });

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('names the population being coloured when that is the one hidden, and puts it back', () => {
    const { populations, onChange } = withHidden(['cortex', 'vpm']);
    renderChrome({ menu: MENU, populations });

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('“cortex” is selected but hidden');
    // Under the checklist it is about, so the way back sits beside the control
    // that got the user here.
    expect(screen.getByTestId('viewer-chrome-left')).toContainElement(notice);
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    // That one back, and only that one: the notice is about the population on
    // show, not about everything the user has taken out of the scene.
    expect(onChange).toHaveBeenCalledWith(['vpm']);
  });

  it('leaves the notice out while a population other than the one on show is hidden', () => {
    renderChrome({ menu: MENU, populations: withHidden(['thalamus']).populations });

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reports an emptied scene, and offers every population back at once', () => {
    const { populations, onChange } = withHidden(['cortex', 'thalamus', 'vpm']);
    renderChrome({ menu: MENU, populations });

    expect(screen.getByRole('status')).toHaveTextContent('Every population is hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  // Naming the selected one too would be two notices saying the same thing, and
  // a Show that leaves the scene as empty as the user found it.
  it('says only that the scene is empty, not which population is missing from it', () => {
    renderChrome({
      menu: MENU,
      populations: withHidden(['cortex', 'thalamus', 'vpm']).populations,
    });

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Show' })).toBeNull();
  });

  // There is no 3D scene to be empty in image mode.
  it('keeps the emptied-scene notice off a view that is not the 3D one', () => {
    renderChrome(
      { menu: MENU, populations: withHidden(['cortex', 'thalamus', 'vpm']).populations },
      false
    );

    expect(screen.queryByText('Every population is hidden')).toBeNull();
  });

  it('does not read a circuit that declares no populations as a scene the user emptied', () => {
    renderChrome({ menu: MENU, populations: withHidden([], { populations: [] }).populations });

    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('CircuitViewerChrome checklist introduction', () => {
  beforeEach(() => localStorage.clear());

  it('opens the checklist the first time the 3D view is on show', () => {
    renderChrome({ menu: MENU, populations: POPULATIONS });

    expect(screen.getByTestId('populations-menu-content')).toBeInTheDocument();
  });

  // The chrome stays mounted behind the views it is not on, invisible and
  // inert, so the introduction has to wait for the 3D one.
  it('keeps it back while another view is on show', () => {
    renderChrome({ menu: MENU, populations: POPULATIONS }, false);

    expect(screen.queryByTestId('populations-menu-content')).toBeNull();
    expect(localStorage.getItem(POPULATIONS_MENU_INTRODUCED_KEY)).toBeNull();
  });
});
