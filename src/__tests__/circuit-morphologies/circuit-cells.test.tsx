import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CircuitCells,
  type CircuitCellsProps,
} from '@/features/circuit-viewer/morphologies/circuit-cells';
import { CircuitViewerSignals } from '@/features/circuit-viewer/signals';

import type {
  CellColors,
  CircuitMorphologyData,
  CircuitSomas,
  ElectrodeGroup,
} from '@/features/circuit-viewer/morphologies/types';

const h = vi.hoisted(() => {
  /** Takes what the view hands the engine, and draws nothing. */
  class FakeViewer {
    setSomas = vi.fn();
    setSomaRadius = vi.fn();
    setSomaOpacity = vi.fn();
    setCrowding = vi.fn();
    setData = vi.fn();
    setCellColors = vi.fn();
    setDefaultColor = vi.fn();
    zoom = 1;
    setZoom = vi.fn();
    pixelScaleListeners = new Set<(scale: number | null) => void>();
    setHighlight = vi.fn();
    /** Every pick finds cell 4. */
    pick = vi.fn(async (_x: number, _y: number): Promise<number | null> => 4);
    moving = false;
    setElectrodes = vi.fn();
    setElectrodeRadius = vi.fn();
    /** Every point is on array A's first contact. */
    electrodeAt = vi.fn(
      (_x: number, _y: number): { id: string; contact: [number, number, number] } | null => ({
        id: 'A',
        contact: [1, 2, 3],
      })
    );
    /** An orthographic view facing down z, at a µm a pixel. */
    fromScreen = vi.fn(
      (x: number, y: number, depthOf: [number, number, number]): [number, number, number] => [
        x,
        -y,
        depthOf[2],
      ]
    );
    setDark = vi.fn();
    resetView = vi.fn();
    dispose = vi.fn();
    snapshot = vi.fn((): HTMLCanvasElement | null => null);
    /** Tells of the replay starting again, as the engine does. */
    setSpikes = vi.fn(() => {
      for (const listener of this.spikeTimeListeners) listener(0);
    });
    seekSpikes = vi.fn();
    setSpikesPlaying = vi.fn();
    setSpikeSpeed = vi.fn();
    setSpikeAfterglow = vi.fn();
    spikeTimeListeners = new Set<(timeInMs: number) => void>();
    spikesPlayingListeners = new Set<(playing: boolean) => void>();

    constructor(readonly host: HTMLElement) {
      state.viewers.push(this);
    }

    onSpikeTime(listener: (timeInMs: number) => void) {
      this.spikeTimeListeners.add(listener);
      return () => this.spikeTimeListeners.delete(listener);
    }

    onSpikesPlaying(listener: (playing: boolean) => void) {
      this.spikesPlayingListeners.add(listener);
      return () => this.spikesPlayingListeners.delete(listener);
    }

    onWheelWithoutCtrl() {
      return () => {};
    }

    onPixelScaleChange(listener: (scale: number | null) => void) {
      this.pixelScaleListeners.add(listener);
      return () => this.pixelScaleListeners.delete(listener);
    }

    onViewChange(listener: (orientation: { x: number; y: number; z: number; w: number }) => void) {
      listener({ x: 0, y: 0, z: 0, w: 1 });
      return () => {};
    }
  }
  const state = {
    viewers: [] as FakeViewer[],
    FakeViewer,
    /** Every crowding asked for, each waiting for the test to answer it. */
    crowdings: [] as {
      positions: Float32Array;
      signal: AbortSignal;
      resolve(bytes: Uint8Array | null): void;
      reject(e: unknown): void;
    }[],
    logError: vi.fn(),
  };
  return state;
});

vi.mock('@/features/circuit-viewer/morphologies/engine/circuit-morphology-viewer', () => ({
  CircuitMorphologyViewer: h.FakeViewer,
}));

// jsdom has no Worker.
vi.mock('@/features/circuit-viewer/morphologies/load/load-crowding', () => ({
  loadCrowding: (positions: Float32Array, signal: AbortSignal) =>
    new Promise((resolve, reject) => h.crowdings.push({ positions, signal, resolve, reject })),
}));

vi.mock('@/utils/logger', () => ({ logError: h.logError }));

// The ruler draws on a canvas of its own; what is asked of it is its colour.
vi.mock('@/features/viewer-3d/chrome/scalebar', () => ({
  Scalebar: ({ color }: { color: string }) => <div data-testid="scalebar" data-color={color} />,
}));

const SOMAS: CircuitSomas = {
  positions: Float32Array.of(0, 0, 0, 10, 0, 0),
  populations: [{ name: 'cortex', cells: 2 }],
};
const DATA = { somas: new Float32Array(8) } as CircuitMorphologyData;
const COLORS: CellColors = { palette: ['#ff0000'], columnByCell: Uint16Array.of(0, 0) };

function view(props: Partial<CircuitCellsProps> = {}) {
  const signals = props.signals ?? new CircuitViewerSignals();
  const element = (patch: Partial<CircuitCellsProps> = {}) => (
    <CircuitCells
      somas={SOMAS}
      somaRadius={15}
      data={DATA}
      cellColors={COLORS}
      defaultColor="#2b5cd9"
      electrodeRadius={5}
      backgroundColor="#ffffff"
      showScalebar
      {...props}
      {...patch}
      signals={signals}
    />
  );
  const rendered = render(element());
  const viewer = h.viewers.at(-1) as InstanceType<typeof h.FakeViewer>;
  // jsdom has no pointer capture.
  viewer.host.setPointerCapture = vi.fn();
  return {
    ...rendered,
    viewer,
    signals,
    update: (patch: Partial<CircuitCellsProps>) => rendered.rerender(element(patch)),
  };
}

/** Where the `nth` call of a mock falls among every mock's calls. */
const calledAt = (mock: { mock: { invocationCallOrder: number[] } }, nth = 0) =>
  mock.mock.invocationCallOrder[nth];

const click = (host: HTMLElement) => {
  fireEvent.pointerDown(host, { isPrimary: true, clientX: 30, clientY: 20 });
  fireEvent.pointerUp(host, { isPrimary: true, clientX: 30, clientY: 20 });
};

/** Array A: two contacts 20 µm apart, from its origin. */
const ARRAY: ElectrodeGroup[] = [
  {
    id: 'A',
    color: '#1b6ef3',
    kind: 'electrodes',
    coordinates: Float32Array.of(1, 2, 3, 1, 22, 3),
    origin: [1, 2, 3],
    rotation: { x: 0, y: 0, z: 0 },
  },
];

/** Takes hold at 30, 20 and lets go 10 pixels right and up. */
const drag = (host: HTMLElement) => {
  const at = { isPrimary: true, pointerId: 1 };
  fireEvent.pointerDown(host, { ...at, button: 0, buttons: 1, clientX: 30, clientY: 20 });
  fireEvent.pointerMove(host, { ...at, buttons: 1, clientX: 40, clientY: 10 });
  fireEvent.pointerUp(host, { ...at, clientX: 40, clientY: 10 });
};

afterEach(() => {
  h.viewers = [];
  h.crowdings = [];
  h.logError.mockClear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CircuitCells', () => {
  it('hands the engine its host, the somas, the morphologies, the colours and the theme of the background', () => {
    const { viewer } = view({ backgroundColor: '#000000', somaOpacity: 0.2 });

    expect(h.viewers).toHaveLength(1);
    expect(viewer.host.parentElement).toBe(screen.getByTestId('circuit-cells'));
    expect(viewer.setSomas).toHaveBeenCalledExactlyOnceWith(SOMAS);
    expect(viewer.setSomaRadius).toHaveBeenCalledExactlyOnceWith(15);
    expect(viewer.setSomaOpacity).toHaveBeenCalledExactlyOnceWith(0.2);
    expect(viewer.setData).toHaveBeenCalledExactlyOnceWith(DATA);
    expect(viewer.setCellColors).toHaveBeenCalledExactlyOnceWith(COLORS);
    expect(viewer.setDefaultColor).toHaveBeenCalledExactlyOnceWith('#2b5cd9');
    expect(viewer.setDark).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('paints and sizes the somas before it hands them over, and the morphologies after', () => {
    const { viewer } = view();

    expect(calledAt(viewer.setCellColors)).toBeLessThan(calledAt(viewer.setSomas));
    expect(calledAt(viewer.setSomaRadius)).toBeLessThan(calledAt(viewer.setSomas));
    expect(calledAt(viewer.setSomas)).toBeLessThan(calledAt(viewer.setData));
  });

  it('takes a radius, an opacity and morphologies without handing the somas over again', () => {
    const { viewer, update } = view({ data: null });
    expect(viewer.setData).toHaveBeenCalledExactlyOnceWith(null);

    update({ data: null, somaRadius: 30, somaOpacity: 0.5 });
    update({ data: DATA, somaRadius: 30, somaOpacity: 0.5 });
    expect(viewer.setSomaRadius).toHaveBeenLastCalledWith(30);
    expect(viewer.setSomaOpacity).toHaveBeenLastCalledWith(0.5);
    expect(viewer.setData.mock.calls).toEqual([[null], [DATA]]);
    expect(viewer.setSomas).toHaveBeenCalledTimes(1);
    expect(h.crowdings).toHaveLength(1);
  });

  it('works out how crowded the somas are, and hands that over for these somas alone', async () => {
    const { viewer, update } = view();
    const [first] = h.crowdings;
    expect(first.positions).toBe(SOMAS.positions);

    const others = { ...SOMAS };
    update({ somas: others });
    expect(first.signal.aborted).toBe(true);
    first.resolve(Uint8Array.of(1, 2));
    const second = h.crowdings[1];
    expect(second.positions).toBe(others.positions);
    const bytes = Uint8Array.of(255, 0);
    second.resolve(bytes);

    await vi.waitFor(() => expect(viewer.setCrowding).toHaveBeenCalledExactlyOnceWith(bytes));
    expect(calledAt(viewer.setSomas, 1)).toBeLessThan(calledAt(viewer.setCrowding));
  });

  it('leaves the somas half crowded, and says so, where that cannot be worked out', async () => {
    const { viewer } = view();
    const error = new Error('the worker failed');
    h.crowdings[0].reject(error);

    await vi.waitFor(() =>
      expect(h.logError).toHaveBeenCalledWith('Could not work out how crowded the somas are', error)
    );
    expect(viewer.setCrowding).not.toHaveBeenCalled();
  });

  it('tells of the zoom whenever the scale changes, and zooms on the signal, within the slider’s range', async () => {
    const onZoomChange = vi.fn();
    const { viewer, signals } = view({ onZoomChange });
    viewer.zoom = 2.5;
    for (const listener of viewer.pixelScaleListeners) listener(0.4);
    expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(2.5);

    await signals.setZoom.dispatch(4);
    await signals.setZoom.dispatch(1000);
    expect(viewer.setZoom.mock.calls).toEqual([[4], [100]]);
  });

  it('hands on only what changes, keeping the engine and the view it frames', () => {
    const { viewer, update } = view();
    const recoloured: CellColors = { palette: [false], columnByCell: Uint16Array.of(0, 0) };

    update({ cellColors: recoloured });
    expect(viewer.setCellColors).toHaveBeenLastCalledWith(recoloured);
    expect(viewer.setData).toHaveBeenCalledTimes(1);

    update({ cellColors: recoloured, backgroundColor: '#000000' });
    expect(viewer.setDark.mock.calls).toEqual([[false], [true]]);

    update({ cellColors: recoloured, backgroundColor: '#000000', defaultColor: '#7aa2ff' });
    expect(viewer.setDefaultColor.mock.calls).toEqual([['#2b5cd9'], ['#7aa2ff']]);
    expect(viewer.setCellColors).toHaveBeenCalledTimes(2);
    expect(viewer.setData).toHaveBeenCalledTimes(1);
    expect(h.viewers).toHaveLength(1);
  });

  it('tells of the cell clicked in the view, through whichever listener it has by then', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { viewer, update } = view({ onCellClick: first });

    click(viewer.host);
    await vi.waitFor(() => expect(first).toHaveBeenCalledExactlyOnceWith(4));
    expect(viewer.pick).toHaveBeenCalledExactlyOnceWith(30, 20);

    update({ onCellClick: second });
    click(viewer.host);
    await vi.waitFor(() => expect(second).toHaveBeenCalledExactlyOnceWith(4));
    expect(first).toHaveBeenCalledTimes(1);
    // Asked for by a click alone, no cell is highlighted.
    expect(viewer.setHighlight).not.toHaveBeenCalled();
  });

  it('highlights the cell the pointer rests on where it is asked to', async () => {
    const { viewer, update } = view({ cellHover: true });

    fireEvent.pointerMove(viewer.host, { clientX: 30, clientY: 20 });
    await vi.waitFor(() => expect(viewer.setHighlight).toHaveBeenCalledExactlyOnceWith(4));

    update({ cellHover: false });
    expect(viewer.setHighlight).toHaveBeenLastCalledWith(null);
  });

  it('leaves the pointer alone where it has neither to highlight nor to tell of a click', async () => {
    const { viewer } = view();

    fireEvent.pointerMove(viewer.host, { clientX: 30, clientY: 20 });
    click(viewer.host);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(viewer.pick).not.toHaveBeenCalled();
    expect(viewer.setHighlight).not.toHaveBeenCalled();
  });

  it('draws the electrodes at the radius it is given, the array the form has selected highlighted', () => {
    const { viewer, update } = view({
      electrodes: ARRAY,
      selectedElectrode: 'A',
      electrodeRadius: 8,
    });
    expect(viewer.setElectrodes).toHaveBeenLastCalledWith(ARRAY, 'A');
    expect(viewer.setElectrodeRadius).toHaveBeenLastCalledWith(8);

    update({ selectedElectrode: null, electrodeRadius: 12 });
    expect(viewer.setElectrodes).toHaveBeenLastCalledWith(ARRAY, null);
    expect(viewer.setElectrodeRadius).toHaveBeenLastCalledWith(12);

    update({ electrodes: undefined });
    expect(viewer.setElectrodes).toHaveBeenLastCalledWith([], 'A');
  });

  it('tells of an array moved with the pointer, through whichever listener it has by then', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { viewer, update } = view({ electrodes: ARRAY, onElectrodeTransform: first });

    drag(viewer.host);
    expect(first).toHaveBeenCalledExactlyOnceWith({
      id: 'A',
      origin: { x: 11, y: 12, z: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      phase: 'end',
    });

    update({ onElectrodeTransform: second });
    drag(viewer.host);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(h.viewers).toHaveLength(1);
  });

  it('holds the electrodes still where the host cannot be told of a move', () => {
    const { viewer } = view({ electrodes: ARRAY });
    viewer.setElectrodes.mockClear();

    drag(viewer.host);

    expect(viewer.electrodeAt).not.toHaveBeenCalled();
    expect(viewer.setElectrodes).not.toHaveBeenCalled();
  });

  it('highlights the electrode the pointer can take hold of, and not the cell behind it', async () => {
    const { viewer } = view({
      cellHover: true,
      electrodes: ARRAY,
      onElectrodeTransform: vi.fn(),
    });

    fireEvent.pointerMove(viewer.host, { clientX: 30, clientY: 20 });

    expect(viewer.setElectrodes).toHaveBeenLastCalledWith(ARRAY, 'A');
    await vi.waitFor(() => expect(viewer.setHighlight).toHaveBeenCalledExactlyOnceWith(null));
    expect(viewer.pick).not.toHaveBeenCalled();
  });

  it('selects no cell with a click on an electrode the pointer can take hold of', async () => {
    const onCellClick = vi.fn();
    const { viewer } = view({ electrodes: ARRAY, onCellClick, onElectrodeTransform: vi.fn() });

    click(viewer.host);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(viewer.pick).not.toHaveBeenCalled();
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it('looks for no cell while an array is moved, though the pointer came to rest on it just before', async () => {
    const { viewer } = view({
      cellHover: true,
      electrodes: [{ ...ARRAY[0], coordinates: Float32Array.of(30, -20, 3) }],
      onElectrodeTransform: vi.fn(),
    });
    // On the contact as it is drawn now, through the fake view's own projection.
    viewer.electrodeAt.mockImplementation((x: number, y: number) => {
      const xyz = viewer.setElectrodes.mock.lastCall?.[0][0].coordinates as Float32Array;
      return Math.hypot(xyz[0] - x, -xyz[1] - y) <= 5
        ? { id: 'A', contact: [xyz[0], xyz[1], xyz[2]] as [number, number, number] }
        : null;
    });
    const at = { isPrimary: true, pointerId: 1 };

    fireEvent.pointerMove(viewer.host, { ...at, clientX: 30, clientY: 20 });
    fireEvent.pointerDown(viewer.host, { ...at, button: 0, buttons: 1, clientX: 30, clientY: 20 });
    fireEvent.pointerMove(viewer.host, { ...at, buttons: 1, clientX: 80, clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(viewer.pick).not.toHaveBeenCalled();
  });

  it("replays no spikes where it is given none, at the somas view's speed and afterglow", () => {
    const { viewer } = view();
    expect(viewer.setSpikes).toHaveBeenCalledExactlyOnceWith(null);
    expect(viewer.setSpikesPlaying).toHaveBeenCalledExactlyOnceWith(false);
    expect(viewer.seekSpikes).not.toHaveBeenCalled();
    expect(viewer.setSpikeSpeed).toHaveBeenCalledExactlyOnceWith(100);
    expect(viewer.setSpikeAfterglow).toHaveBeenCalledExactlyOnceWith(0.25);
  });

  it('hands the engine the spikes and the transport, and seeks only to a moment it is given', () => {
    const data = {
      cellIndices: Uint32Array.of(1),
      times: Float32Array.of(5),
      timeMinInMs: 0,
      timeMaxInMs: 10,
    };
    const transport = { data, playing: false, speed: 50, afterglowInSeconds: 0.5 };
    const { viewer, update } = view({ spikes: transport });
    expect(viewer.setSpikes).toHaveBeenCalledExactlyOnceWith(data);
    expect(viewer.setSpikeSpeed).toHaveBeenCalledExactlyOnceWith(50);
    expect(viewer.setSpikeAfterglow).toHaveBeenCalledExactlyOnceWith(0.5);
    expect(viewer.seekSpikes).not.toHaveBeenCalled();
    // The spikes first, which start the replay again, then where it is to be.
    expect(viewer.setSpikes.mock.invocationCallOrder[0]).toBeLessThan(
      viewer.setSpikesPlaying.mock.invocationCallOrder[0]
    );

    update({ spikes: { ...transport, timeInMs: 7, playing: true } });
    expect(viewer.seekSpikes).toHaveBeenCalledExactlyOnceWith(7);
    expect(viewer.setSpikesPlaying).toHaveBeenLastCalledWith(true);
    expect(viewer.setSpikes).toHaveBeenCalledTimes(1);
    // Let go of, the seek stays where it went.
    update({ spikes: { ...transport, playing: true } });
    expect(viewer.seekSpikes).toHaveBeenCalledTimes(1);
  });

  it("tells of the replay's moment and of its playing, through whichever listeners it has by then", () => {
    const told: string[] = [];
    const spikes = (name: string) => ({
      onTimeChange: (time: number) => told.push(`${name} at ${time}`),
      onPlayingChange: (playing: boolean) => told.push(`${name} ${playing ? 'plays' : 'stops'}`),
    });
    const { viewer, update, unmount } = view({ spikes: spikes('first') });
    // Heard before the spikes were handed over: the replay starting with them.
    expect(told).toEqual(['first at 0']);

    update({ spikes: spikes('second') });
    for (const listener of viewer.spikeTimeListeners) listener(12);
    for (const listener of viewer.spikesPlayingListeners) listener(false);
    expect(told).toEqual(['first at 0', 'second at 12', 'second stops']);

    unmount();
    expect(viewer.spikeTimeListeners.size).toBe(0);
    expect(viewer.spikesPlayingListeners.size).toBe(0);
  });

  it('draws the ruler where the setting has it, in the colour read against the background, and the axes', () => {
    const { update } = view({ backgroundColor: '#000000' });
    expect(screen.getByTestId('scalebar').dataset.color).toBe('rgba(255,255,255,0.92)');
    expect(screen.getByTestId('axes-gizmo')).toBeInTheDocument();

    update({ showScalebar: false });
    expect(screen.queryByTestId('scalebar')).toBeNull();
    expect(screen.getByTestId('axes-gizmo')).toBeInTheDocument();
  });

  it("re-centres on the circuit viewer's signal", async () => {
    const { viewer, signals } = view();

    await signals.cameraReset.dispatch(undefined);

    expect(viewer.resetView).toHaveBeenCalledTimes(1);
  });

  it("answers the snapshot signal with the engine's frame as an image of the kind asked for", async () => {
    const { viewer, signals } = view();
    const blob = new Blob(['png']);
    const canvas = document.createElement('canvas');
    const toBlob = vi.spyOn(canvas, 'toBlob').mockImplementation((done) => done(blob));
    viewer.snapshot.mockReturnValue(canvas);
    const createObjectURL = vi.fn((_: Blob) => 'blob:shot');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    // jsdom loads no image, so one that has loaded as soon as it has a source.
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        private source = '';
        get src() {
          return this.source;
        }
        set src(value: string) {
          this.source = value;
          queueMicrotask(() => this.onload?.());
        }
      }
    );

    const image = await signals.snapshot.dispatch({ type: 'image/jpeg', quality: 0.8 });

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(image?.src).toBe('blob:shot');
  });

  it('answers the snapshot signal with nothing where the engine has no frame to give', async () => {
    const { signals } = view();

    expect(await signals.snapshot.dispatch(undefined)).toBeNull();
  });

  it('frees the engine and leaves the signals unanswered when it goes', async () => {
    const { viewer, signals, unmount } = view();

    unmount();

    expect(viewer.dispose).toHaveBeenCalledTimes(1);
    await expect(signals.cameraReset.dispatch(undefined)).rejects.toThrow('no handler');
    await expect(signals.snapshot.dispatch(undefined)).rejects.toThrow('no handler');
    await expect(signals.setZoom.dispatch(2)).rejects.toThrow('no handler');
  });
});
