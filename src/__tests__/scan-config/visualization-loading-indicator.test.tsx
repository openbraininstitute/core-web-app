import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VisualizationLoadingIndicator } from '@/features/scan-config/components/shared/visualization-loading-indicator';

/** 42 MB and 180 MB, which is what the chip should round them to. */
const RECEIVED = 42 * 1024 * 1024;
const TOTAL = 180 * 1024 * 1024;

describe('VisualizationLoadingIndicator', () => {
  // Whether the data was already in hand cannot be asked; whether the user is
  // still waiting can. A wait this short is not one, so a population answered
  // from a cache passes without a flash of chrome over the scene.
  it('shows nothing at all while the wait is still short', () => {
    const { container } = render(<VisualizationLoadingIndicator download={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('names the node download, with the bytes on both sides', async () => {
    render(<VisualizationLoadingIndicator download={{ received: RECEIVED, total: TOTAL }} />);

    expect(await screen.findByText('Downloading nodes… 42 MB of 180 MB')).toBeInTheDocument();
  });

  it('says how far it has got when a file reports no length', async () => {
    render(<VisualizationLoadingIndicator download={{ received: RECEIVED, total: null }} />);

    expect(await screen.findByText('Downloading nodes… 42 MB')).toBeInTheDocument();
  });

  it('counts the morphologies once the nodes are in', async () => {
    render(<VisualizationLoadingIndicator morphologies={{ loaded: 3, total: 12 }} />);

    expect(await screen.findByText('Drawing morphologies… 3 of 12')).toBeInTheDocument();
  });

  // Nothing can be drawn before the node files land, so they are what the
  // viewer is waiting for even where the second phase already has a total.
  it('stays on the nodes while both phases have something to say', async () => {
    render(
      <VisualizationLoadingIndicator
        download={{ received: RECEIVED, total: TOTAL }}
        morphologies={{ loaded: 0, total: 12 }}
      />
    );

    expect(await screen.findByText(/^Downloading nodes/)).toBeInTheDocument();
  });

  // A scene of somas alone: no morphology is coming, so counting them would
  // leave the chip on "0 of 0".
  it('falls back to the plain label where there is nothing to count', async () => {
    render(<VisualizationLoadingIndicator morphologies={{ loaded: 0, total: 0 }} />);

    expect(await screen.findByText('Loading visualization…')).toBeInTheDocument();
  });
});
