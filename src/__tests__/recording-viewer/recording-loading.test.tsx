import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RecordingViewer from '@/features/recording-viewer/recording-viewer';

const pending = vi.hoisted(() => ({
  windows: [] as ((value: unknown) => void)[],
  envelopes: [] as ((value: unknown) => void)[],
}));

const WINDOW = {
  name: 'window',
  traces: [],
  nodeCount: 2,
  timeConfig: { startTime: 0, endTime: 1, timeStep: 0.001, units: 's' },
  dataUnits: 'µV',
};
const ENVELOPES = {
  width: 1,
  numChannels: 2,
  lows: new Float32Array(2),
  highs: new Float32Array(2),
  peakToPeak: new Float32Array(2),
  noise: 1,
};

vi.mock('@/features/recording-viewer/components/electrodes-grid', () => ({
  ElectrodesGrid: () => null,
}));
vi.mock('@/features/sonata-viewer/components/report-details-view', () => ({
  default: () => null,
  MAX_SHARED_TRACES: 50,
}));
vi.mock('@/features/recording-viewer/hooks/use-recording', () => ({
  useRecording: () => ({
    error: null,
    recordings: [
      {
        name: 'recording',
        numFrames: 300_000,
        numChannels: 2,
        samplingFrequency: 30_000,
        startTime: 0,
        units: 'µV',
        channelNames: ['AP0', 'AP1'],
        electrodes: { columns: [], rows: [] },
        contacts: null,
      },
    ],
    worker: {
      loadWindow: () => new Promise((resolve) => pending.windows.push(resolve)),
      getEnvelopes: () => new Promise((resolve) => pending.envelopes.push(resolve)),
    },
  }),
}));

const CONTEXT = { virtualLabId: 'lab', projectId: 'project' };

async function settle(queue: ((value: unknown) => void)[], value: unknown) {
  await act(async () => {
    queue.shift()?.(value);
  });
}

describe('loading a window of a recording', () => {
  beforeEach(() => {
    pending.windows.length = 0;
    pending.envelopes.length = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
  });

  it('shows a spinner until the window is read and drawn', async () => {
    render(<RecordingViewer source={{ kind: 'nwb', entityId: 'id' }} context={CONTEXT} />);
    expect(screen.getByTestId('recording-loading')).toBeTruthy();

    await settle(pending.windows, WINDOW);
    expect(screen.getByTestId('recording-loading')).toBeTruthy();

    await settle(pending.envelopes, ENVELOPES);
    expect(screen.queryByTestId('recording-loading')).toBeNull();
  });

  it('shows it again over the traces on moving to another window', async () => {
    render(<RecordingViewer source={{ kind: 'nwb', entityId: 'id' }} context={CONTEXT} />);
    await settle(pending.windows, WINDOW);
    await settle(pending.envelopes, ENVELOPES);

    fireEvent.click(screen.getByLabelText('Later'));

    expect(screen.getByTestId('recording-loading')).toBeTruthy();
    expect(screen.getByTestId('recording-stacked-traces')).toBeTruthy();

    await settle(pending.windows, { ...WINDOW, name: 'next window' });
    await settle(pending.envelopes, ENVELOPES);
    expect(screen.queryByTestId('recording-loading')).toBeNull();
  });
});
