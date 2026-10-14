import { MorphoViewerSignals } from '@openbraininstitute/morphoviewer/dist/components/signals';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CircuitMorphologies,
  type CircuitMorphologiesProps,
} from '@/features/circuit-viewer/morphologies/circuit-morphologies';

import type {
  CellColors,
  CircuitMorphologyData,
  ElectrodeGroup,
} from '@/features/circuit-viewer/morphologies/types';

const h = vi.hoisted(() => {
  /** Takes what the view hands the engine, and draws nothing. */
  class FakeViewer {
    setData = vi.fn();
    setCellColors = vi.fn();
    setDefaultColor = vi.fn();
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

    constructor(readonly host: HTMLElement) {
      state.viewers.push(this);
    }

    onWheelWithoutCtrl() {
      return () => {};
    }

    onViewChange(listener: (orientation: { x: number; y: number; z: number; w: number }) => void) {
      listener({ x: 0, y: 0, z: 0, w: 1 });
      return () => {};
    }
  }
  const state = { viewers: [] as FakeViewer[], FakeViewer };
  return state;
});

vi.mock('@/features/circuit-viewer/morphologies/engine/circuit-morphology-viewer', () => ({
  CircuitMorphologyViewer: h.FakeViewer,
}));

// morphoviewer's ruler, which draws on a canvas of its own.
vi.mock('@/features/viewer-3d/chrome/scalebar', () => ({
  Scalebar: ({ color }: { color: string }) => <div data-testid="scalebar" data-color={color} />,
}));

const DATA = { somas: new Float32Array(8) } as CircuitMorphologyData;
const COLORS: CellColors = { palette: ['#ff0000'], columnByCell: Uint16Array.of(0, 0) };

function view(props: Partial<CircuitMorphologiesProps> = {}) {
  const signals = props.signals ?? new MorphoViewerSignals();
  const element = (patch: Partial<CircuitMorphologiesProps> = {}) => (
    <CircuitMorphologies
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
  return {
    ...rendered,
    viewer,
    signals,
    update: (patch: Partial<CircuitMorphologiesProps>) => rendered.rerender(element(patch)),
  };
}

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
  host.setPointerCapture = vi.fn();
  const at = { isPrimary: true, pointerId: 1 };
  fireEvent.pointerDown(host, { ...at, button: 0, buttons: 1, clientX: 30, clientY: 20 });
  fireEvent.pointerMove(host, { ...at, buttons: 1, clientX: 40, clientY: 10 });
  fireEvent.pointerUp(host, { ...at, clientX: 40, clientY: 10 });
};

afterEach(() => {
  h.viewers = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CircuitMorphologies', () => {
  it('hands the engine its host, the morphologies, the colours and the theme of the background', () => {
    const { viewer } = view({ backgroundColor: '#000000' });

    expect(h.viewers).toHaveLength(1);
    expect(viewer.host.parentElement).toBe(screen.getByTestId('circuit-morphologies'));
    expect(viewer.setData).toHaveBeenCalledExactlyOnceWith(DATA);
    expect(viewer.setCellColors).toHaveBeenCalledExactlyOnceWith(COLORS);
    expect(viewer.setDefaultColor).toHaveBeenCalledExactlyOnceWith('#2b5cd9');
    expect(viewer.setDark).toHaveBeenCalledExactlyOnceWith(true);
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
    viewer.host.setPointerCapture = vi.fn();

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
    viewer.host.setPointerCapture = vi.fn();
    const at = { isPrimary: true, pointerId: 1 };

    fireEvent.pointerMove(viewer.host, { ...at, clientX: 30, clientY: 20 });
    fireEvent.pointerDown(viewer.host, { ...at, button: 0, buttons: 1, clientX: 30, clientY: 20 });
    fireEvent.pointerMove(viewer.host, { ...at, buttons: 1, clientX: 80, clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(viewer.pick).not.toHaveBeenCalled();
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
  });
});
