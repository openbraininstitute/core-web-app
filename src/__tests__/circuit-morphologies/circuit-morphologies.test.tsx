import { MorphoViewerSignals } from '@openbraininstitute/morphoviewer/dist/components/signals';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CircuitMorphologies,
  type CircuitMorphologiesProps,
} from '@/features/circuit-viewer/morphologies/circuit-morphologies';

import type {
  CellColors,
  CircuitMorphologyData,
} from '@/features/circuit-viewer/morphologies/types';

const h = vi.hoisted(() => {
  /** Takes what the view hands the engine, and draws nothing. */
  class FakeViewer {
    setData = vi.fn();
    setCellColors = vi.fn();
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
    expect(viewer.setData).toHaveBeenCalledTimes(1);
    expect(h.viewers).toHaveLength(1);
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
