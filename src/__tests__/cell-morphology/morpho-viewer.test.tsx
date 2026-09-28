import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, lazy, Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HELP } from '@/features/entities/cell-morphology/morpho-viewer/help/help-text';
import { MorphoViewer } from '@/features/entities/cell-morphology/morpho-viewer/morpho-viewer';

import type { DistanceData } from '@/features/entities/cell-morphology/morpho-viewer/engine/colors';
import type { MeshStats } from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import type { MorphologySummary } from '@/features/entities/cell-morphology/morpho-viewer/engine/protocol';

const h = vi.hoisted(() => {
  const DARK = { light: ['#000000', '#000000'], dark: ['#000000', '#000000'] };
  const LIGHT = { light: ['#ffffff', '#d9dde6'], dark: ['#2b3140', '#0c0e13'] };
  const LOOKS = [
    { id: 'studio', label: 'Studio', hint: 'Three lights.', colors: 'palette', background: LIGHT },
    {
      id: 'em',
      label: 'EM segmentation',
      hint: 'Waxy grey.',
      colors: 'tint',
      ao: true,
      bumps: { amplitude: 0.1, scale: 2, smoothness: 0.3 },
      background: DARK,
    },
    { id: 'golgi', label: 'Golgi', hint: 'Sepia.', colors: 'own', background: LIGHT },
    {
      id: 'fluorescence',
      label: 'Fluorescence',
      hint: 'Glow.',
      colors: 'own',
      legend: {
        kind: 'swatches',
        items: [
          { label: 'Soma and dendrites', color: '#63ff5a' },
          { label: 'Axon', color: '#ff4d6a' },
        ],
      },
      background: DARK,
    },
    {
      id: 'depth-coded',
      label: 'Depth-coded',
      hint: 'Spectrum.',
      colors: 'own',
      legend: { kind: 'ramp', stops: ['#f00', '#00f'], from: 'Near', to: 'Far' },
      background: DARK,
    },
  ];

  class FakeViewer {
    looks = LOOKS;
    pixelScale: number | null = 0.5;
    scaleListeners = new Set<(scale: number | null) => void>();
    wheelListeners = new Set<() => void>();
    setDark = vi.fn();
    setColors = vi.fn();
    setHiddenTypes = vi.fn();
    setLook = vi.fn();
    setTypeTint = vi.fn();
    setAO = vi.fn();
    setBumps = vi.fn();
    setMinWidth = vi.fn();
    showMesh = vi.fn();
    setWireframe = vi.fn();
    showSkeleton = vi.fn();
    setSpin = vi.fn();
    resetView = vi.fn();
    setMesh = vi.fn();
    clearMesh = vi.fn();
    setSkeleton = vi.fn();
    dispose = vi.fn();
    setProjection = vi.fn((projection: string) => {
      this.pixelScale = projection === 'orthographic' ? 0.5 : null;
      for (const listener of this.scaleListeners) listener(this.pixelScale);
    });

    constructor() {
      state.viewers.push(this);
    }

    get currentPixelScale() {
      return this.pixelScale;
    }

    onPixelScaleChange(listener: (scale: number | null) => void) {
      this.scaleListeners.add(listener);
      return () => this.scaleListeners.delete(listener);
    }

    onWheelWithoutCtrl(listener: () => void) {
      this.wheelListeners.add(listener);
      return () => this.wheelListeners.delete(listener);
    }
  }

  class FakePool {
    load = vi.fn(() => Promise.resolve({ summary: state.summary, skeleton: state.skeleton }));
    probeGpu = vi.fn((): Promise<string | null> => Promise.resolve(null));
    build = vi.fn((): Promise<unknown> => Promise.resolve(state.result));
    distances = vi.fn((request: { mesh?: { types: Uint8Array } }) =>
      Promise.resolve({
        max: 1234.4,
        original: new Float32Array(1),
        mesh: request.mesh && new Float32Array(request.mesh.types.length),
      })
    );
    cancel = vi.fn();
    dispose = vi.fn();
    isDisposed = false;

    constructor() {
      state.pools.push(this);
      state.setup?.(this);
    }
  }

  const state = {
    exportLoaded: false,
    exportMesh: vi.fn((..._args: unknown[]) => Promise.resolve(new Blob(['glb']))),
    saveAs: vi.fn(),
    viewers: [] as FakeViewer[],
    pools: [] as FakePool[],
    setup: null as ((pool: FakePool) => void) | null,
    summary: null as unknown,
    skeleton: { positions: new Float32Array(6), types: new Uint8Array(1), count: 1 },
    result: null as unknown,
    FakeViewer,
    FakePool,
  };
  return state;
});

vi.mock('@/features/entities/cell-morphology/morpho-viewer/engine/viewer', () => ({
  Viewer: h.FakeViewer,
}));

vi.mock('@/features/entities/cell-morphology/morpho-viewer/engine/pool', () => ({
  MeshPool: h.FakePool,
  defaultPoolSize: () => 1,
}));

vi.mock('@/features/entities/cell-morphology/morpho-viewer/export', () => {
  h.exportLoaded = true;
  return { exportMesh: h.exportMesh };
});

vi.mock('file-saver', () => ({ saveAs: h.saveAs }));

vi.mock('next/dynamic', () => ({
  default: (load: () => Promise<ComponentType<object>>) => {
    const Lazy = lazy(() => load().then((component) => ({ default: component })));
    return (props: object) => (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  },
}));

const SUMMARY: MorphologySummary = {
  nodeCount: 10,
  sectionCount: 3,
  types: [1, 2, 3].map((type) => ({
    type,
    sections: 1,
    nodes: 3,
    cableLength: 1500,
    minRadius: 0.2,
    medianRadius: 0.5,
  })),
  soma: { model: 'none', radius: 0, pointCount: 0 },
  somaStems: {
    center: [0, 0, 0],
    baseRadius: 5,
    source: 'fitted',
    neckDistance: 0,
    arbors: [],
    stats: {
      arbors: 0,
      valid: 0,
      tooClose: 0,
      far: 0,
      cut: 0,
      detached: 0,
      minD: Number.NaN,
      maxD: Number.NaN,
      meanD: Number.NaN,
    },
  },
  size: [100, 100, 100],
  center: [0, 0, 0],
};

function meshStats(patch: Partial<MeshStats> = {}): MeshStats {
  return {
    voxel: 0.126,
    sections: 3,
    segments: 10,
    points: 8,
    rawPoints: 10,
    blocks: 5,
    bandVoxels: 1e6,
    vertices: 142,
    triangles: 285,
    rawTriangles: 285,
    defects: 0,
    nonManifoldEdges: 0,
    fieldMs: 1,
    extractMs: 1,
    simplifyMs: 0,
    simplifyPasses: 0,
    mergeMs: 1,
    totalMs: 12,
    fieldMB: 1,
    slabs: 2,
    workers: 1,
    ...patch,
  };
}

async function renderViewer() {
  const view = render(<MorphoViewer swc="1 1 0 0 0 5 -1" name="Cell A" />);
  await screen.findByRole('button', { name: 'Viewer settings' });
  return { ...view, viewer: h.viewers.at(-1)!, pool: h.pools.at(-1)! };
}

/** From the first row of the settings, which are closed again after. */
async function chooseLook(label: string) {
  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: /^Look: / }));
  fireEvent.click(await screen.findByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
  await waitFor(() => expect(screen.queryByRole('switch', { name: 'Mesh' })).toBeNull());
}

async function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: 'Viewer settings' }));
  await screen.findByRole('switch', { name: 'Mesh' });
}

beforeEach(() => {
  // jsdom has no 2D canvas: the ruler draws nothing.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  h.viewers.length = 0;
  h.pools.length = 0;
  h.setup = null;
  h.summary = SUMMARY;
  h.result = { stats: meshStats() };
  h.exportMesh.mockClear();
  h.saveAs.mockClear();
});

// First, and in this order: the GPU's state lasts the session, as the module does.
describe('GPU', () => {
  it('builds on the CPU when the GPU build fails for another reason, and keeps the GPU on', async () => {
    h.setup = (pool) => {
      pool.probeGpu.mockResolvedValue('test adapter');
      pool.build
        .mockRejectedValueOnce(new Error('nothing to mesh'))
        .mockResolvedValueOnce({ stats: meshStats() });
    };
    const { pool } = await renderViewer();

    await waitFor(() => expect(pool.build).toHaveBeenCalledTimes(2));
    expect(pool.build.mock.calls.map((call) => (call as unknown[])[1])).toMatchObject([
      { backend: 'gpu' },
      { backend: 'cpu' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Statistics' }));
    expect(await screen.findByText('built on the CPU')).toBeInTheDocument();
  });

  // The GPU is still on from the test before: its first build is on the GPU.
  it('builds on the CPU when the GPU leaves the surface open, and says why', async () => {
    h.setup = (pool) => {
      pool.probeGpu.mockResolvedValue('test adapter');
      pool.build
        .mockResolvedValueOnce({ stats: meshStats({ defects: 3 }) })
        .mockResolvedValueOnce({ stats: meshStats() });
    };
    const { pool } = await renderViewer();

    await waitFor(() => expect(pool.build).toHaveBeenCalledTimes(2));
    expect(pool.build.mock.calls.map((call) => (call as unknown[])[1])).toMatchObject([
      { backend: 'gpu', mesher: 'hybrid' },
      { backend: 'cpu', mesher: 'hybrid' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Statistics' }));
    expect(
      await screen.findByText(/built on the CPU \(GPU turned off: 3 open quads\)/)
    ).toBeInTheDocument();
  });
});

describe('MorphoViewer', () => {
  it('shows the traced skeleton until the mesh, then what the Skeleton choice says', async () => {
    const build = Promise.withResolvers<unknown>();
    h.setup = (pool) => pool.build.mockReturnValue(build.promise);
    const { viewer } = await renderViewer();

    await waitFor(() =>
      expect(viewer.setSkeleton).toHaveBeenCalledWith('original', h.skeleton, SUMMARY.size)
    );
    expect(viewer.showSkeleton).toHaveBeenLastCalledWith('original');
    expect(await screen.findByRole('status')).toHaveTextContent('Building mesh… 0 %');
    await openSettings();
    const traced = screen.getByRole('button', { name: 'Traced skeleton' });
    expect(traced).toBeDisabled();
    expect(traced).toHaveAttribute('aria-pressed', 'true');

    await act(async () => build.resolve(h.result));
    expect(viewer.setMesh).toHaveBeenCalledWith(h.result);
    expect(viewer.showSkeleton).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('button', { name: 'No skeleton' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Processed skeleton' }));
    expect(viewer.showSkeleton).toHaveBeenLastCalledWith('processed');
  });

  it('keeps the skeleton and says so when the mesh cannot be built', async () => {
    h.setup = (pool) => pool.build.mockRejectedValue(new Error('boom'));
    const { viewer } = await renderViewer();

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('The surface could not be built: boom')
    );
    expect(viewer.showSkeleton).toHaveBeenLastCalledWith('original');
  });

  it('says when the file cannot be read', async () => {
    h.setup = (pool) => pool.load.mockRejectedValue(new Error('no soma, no points'));
    await renderViewer();

    expect(await screen.findByText('Could not read the morphology')).toBeInTheDocument();
    expect(screen.getByText('no soma, no points')).toBeInTheDocument();
  });

  it('chooses the look from the first row of the settings, which stay open', async () => {
    const { viewer } = await renderViewer();
    expect(screen.queryByRole('button', { name: /^Look: / })).toBeNull();

    await openSettings();
    const trigger = screen.getByRole('button', { name: 'Look: Studio' });
    const first = screen.getByRole('switch', { name: 'Ambient occlusion' });
    expect(trigger.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Golgi' }));
    expect(viewer.setLook).toHaveBeenLastCalledWith('golgi');
    expect(screen.getByRole('button', { name: 'Look: Golgi' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Mesh' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Looks' })).toBeNull());
  });

  it('disables the neurite colours, saying why, in a look with colours of its own', async () => {
    await renderViewer();
    const swatch = await screen.findByRole('button', { name: 'Change the colour of the axon' });

    await chooseLook('Golgi');
    expect(screen.getByText('Golgi draws in colours of its own.')).toBeInTheDocument();
    expect(swatch).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset colours' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Colour by: Section' })).toBeDisabled();
    // The eyes rebuild the mesh, which every look shows.
    expect(screen.getByRole('button', { name: 'Hide axon' })).toBeEnabled();
  });

  it('enables the neurite colours in EM segmentation once Type tint is on, and turns its bumps and AO on', async () => {
    const { viewer } = await renderViewer();

    await chooseLook('EM segmentation');
    expect(
      screen.getByText('Turn on Type tint in the settings to use the neurite colours.')
    ).toBeInTheDocument();
    expect(viewer.setAO).toHaveBeenLastCalledWith(true);
    expect(viewer.setBumps).toHaveBeenLastCalledWith({ amplitude: 0.1, scale: 2, smoothness: 0.3 });

    await openSettings();
    fireEvent.click(screen.getByRole('switch', { name: 'Type tint' }));
    expect(
      screen.queryByText('Turn on Type tint in the settings to use the neurite colours.')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change the colour of the axon' })).toBeEnabled();
    expect(viewer.setTypeTint).toHaveBeenLastCalledWith(true);
  });

  it('colours by path distance once the workers have measured it, measuring each layer once', async () => {
    const mesh = {
      stats: meshStats(),
      positions: new Float32Array(6),
      vertexTypes: new Uint8Array([1, 3]),
    };
    h.result = mesh;
    const { viewer, pool } = await renderViewer();
    await waitFor(() => expect(viewer.setMesh).toHaveBeenCalledWith(mesh));
    const colourBy = async (from: string, to: string) => {
      fireEvent.click(screen.getByRole('button', { name: `Colour by: ${from}` }));
      fireEvent.click(await screen.findByRole('button', { name: to }));
    };

    await colourBy('Section', 'Distance');
    expect(await screen.findByText('1234 µm')).toBeInTheDocument();
    expect(pool.distances).toHaveBeenCalledWith({
      original: h.skeleton,
      mesh: { positions: mesh.positions, types: mesh.vertexTypes },
    });
    await waitFor(() => {
      const distances = viewer.setColors.mock.lastCall?.[1] as DistanceData | undefined;
      expect(distances?.max).toBe(1234.4);
      expect(distances?.of(mesh)).toBeInstanceOf(Float32Array);
    });

    await colourBy('Distance', 'Section');
    expect(screen.queryByText('1234 µm')).not.toBeInTheDocument();
    await waitFor(() => expect(viewer.setColors).toHaveBeenLastCalledWith(expect.anything(), null));

    await colourBy('Section', 'Distance');
    expect(await screen.findByText('1234 µm')).toBeInTheDocument();
    expect(pool.distances).toHaveBeenCalledTimes(1);
  });

  it('says when the path distances cannot be measured, and tries again when Distance is chosen again', async () => {
    h.result = {
      stats: meshStats(),
      positions: new Float32Array(6),
      vertexTypes: new Uint8Array([1, 3]),
    };
    h.setup = (pool) => pool.distances.mockRejectedValueOnce(new Error('no memory'));
    const { viewer, pool } = await renderViewer();
    await waitFor(() => expect(viewer.setMesh).toHaveBeenCalled());
    const colourBy = async (from: string, to: string) => {
      fireEvent.click(screen.getByRole('button', { name: `Colour by: ${from}` }));
      fireEvent.click(await screen.findByRole('button', { name: to }));
    };

    await colourBy('Section', 'Distance');
    expect(
      await screen.findByText('The path distances could not be measured: no memory')
    ).toBeInTheDocument();

    await colourBy('Distance', 'Section');
    await colourBy('Section', 'Distance');
    expect(await screen.findByText('1234 µm')).toBeInTheDocument();
    expect(screen.queryByText(/could not be measured/)).not.toBeInTheDocument();
    expect(pool.distances).toHaveBeenCalledTimes(2);
  });

  it("shows the key to a look's own colours", async () => {
    await renderViewer();

    await chooseLook('Fluorescence');
    expect(screen.getByText('Soma and dendrites')).toBeInTheDocument();
    await chooseLook('Depth-coded');
    expect(screen.getByText('Near')).toBeInTheDocument();
    expect(screen.getByText('Far')).toBeInTheDocument();
    await chooseLook('Studio');
    expect(screen.queryByText('Near')).not.toBeInTheDocument();
  });

  it('shows the ruler in the orthographic view only', async () => {
    const { container, viewer } = await renderViewer();
    expect(container.querySelector('canvas')).not.toBeNull();

    await openSettings();
    fireEvent.click(screen.getByRole('switch', { name: 'Perspective' }));
    expect(viewer.setProjection).toHaveBeenLastCalledWith('perspective');
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Scale bar' })).toBeDisabled();
  });

  it('says to hold Ctrl when a plain wheel turns over the view', async () => {
    const { viewer } = await renderViewer();
    const hint = screen.getByText(/to zoom/);
    expect(hint).toHaveAttribute('aria-hidden', 'true');

    act(() => {
      for (const listener of viewer.wheelListeners) listener();
    });
    expect(hint).toHaveAttribute('aria-hidden', 'false');
  });

  it('rebuilds the mesh without a hidden type after a pause, keeping the old one until then', async () => {
    const rebuilt = Promise.withResolvers<unknown>();
    const next = { stats: meshStats({ triangles: 100 }) };
    h.setup = (pool) =>
      pool.build.mockResolvedValueOnce(h.result).mockReturnValueOnce(rebuilt.promise);
    const { viewer, pool } = await renderViewer();
    await waitFor(() => expect(viewer.setMesh).toHaveBeenCalledWith(h.result));
    expect(pool.build).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeTypes: [2, 3] }),
      expect.anything()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide axon' }));
    expect(viewer.setHiddenTypes).toHaveBeenLastCalledWith([2]);
    expect(await screen.findByRole('status')).toHaveTextContent('Building mesh… 0 %');
    expect(pool.build).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(pool.build).toHaveBeenCalledTimes(2));
    expect(pool.build).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeTypes: [3] }),
      expect.anything()
    );
    // The one at load: the old mesh stays while the new one is built.
    expect(viewer.clearMesh).toHaveBeenCalledTimes(1);

    await act(async () => rebuilt.resolve(next));
    expect(viewer.setMesh).toHaveBeenLastCalledWith(next);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('rebuilds once for quick toggles, and not at all when they end where they started', async () => {
    h.summary = { ...SUMMARY, soma: { model: 'point', radius: 5, pointCount: 1 } };
    const { pool } = await renderViewer();
    await waitFor(() => expect(pool.build).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Hide axon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show axon' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(pool.build).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Hide axon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide dendrite' }));
    await waitFor(() => expect(pool.build).toHaveBeenCalledTimes(2));
    // The soma alone.
    expect(pool.build).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeTypes: [] }),
      expect.anything()
    );
  });

  it('falls back to the skeleton when a rebuild fails', async () => {
    h.setup = (pool) =>
      pool.build.mockResolvedValueOnce(h.result).mockRejectedValueOnce(new Error('boom'));
    const { viewer } = await renderViewer();
    await waitFor(() => expect(viewer.setMesh).toHaveBeenCalledWith(h.result));

    fireEvent.click(screen.getByRole('button', { name: 'Hide axon' }));
    expect(await screen.findByText('The surface could not be built: boom')).toBeInTheDocument();
    expect(viewer.clearMesh).toHaveBeenCalledTimes(2);
    expect(viewer.showSkeleton).toHaveBeenLastCalledWith('original');

    fireEvent.click(screen.getByRole('button', { name: 'Statistics' }));
    expect(await screen.findByText('Could not be built: boom')).toBeInTheDocument();
  });

  it('holds the export while the mesh is built again, and says why there is none after a failed build', async () => {
    const rebuilt = Promise.withResolvers<unknown>();
    h.setup = (pool) =>
      pool.build.mockResolvedValueOnce(h.result).mockReturnValueOnce(rebuilt.promise);
    const { viewer, pool } = await renderViewer();
    await waitFor(() => expect(viewer.setMesh).toHaveBeenCalledWith(h.result));

    fireEvent.click(screen.getByRole('button', { name: 'Hide axon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export mesh' }));
    expect(await screen.findByText('The mesh is being built again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GLB' })).toBeDisabled();

    await waitFor(() => expect(pool.build).toHaveBeenCalledTimes(2));
    await act(async () => rebuilt.reject(new Error('boom')));
    expect(await screen.findByText('The mesh could not be built.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GLB' })).toBeDisabled();
  });

  it('closes the settings on a press that was stopped before the document', async () => {
    await renderViewer();
    render(
      <button type="button" onPointerDown={(e) => e.stopPropagation()}>
        Elsewhere
      </button>
    );
    await openSettings();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    await waitFor(() => expect(screen.queryByRole('switch', { name: 'Mesh' })).toBeNull());
  });

  it('keeps the swatch, and the focus on it, when its picker opens', async () => {
    await renderViewer();
    const swatch = await screen.findByRole('button', { name: 'Change the colour of the axon' });
    swatch.focus();

    fireEvent.click(swatch);
    await waitFor(() => expect(document.querySelector('.ant-color-picker')).not.toBeNull());
    expect(swatch).toBeInTheDocument();
    expect(swatch).toHaveFocus();
  });

  it('opens a help card on click and closes it on Escape, keeping its menu open', async () => {
    await renderViewer();
    await openSettings();

    fireEvent.click(screen.getByRole('button', { name: 'About Ambient occlusion' }));
    expect(await screen.findByText(/Fibres shade each other/)).toBeInTheDocument();
    expect(screen.getByText('Changes the view only, at once')).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText(/Fibres shade each other/)).not.toBeInTheDocument()
    );
  });

  it('has a help text for every "?" and a "?" for every help text', async () => {
    const { baseElement } = await renderViewer();
    const shown = new Set<string | null>();
    const collect = () => {
      for (const b of baseElement.querySelectorAll('[data-help]'))
        shown.add(b.getAttribute('data-help'));
    };
    // Waits for the focus to come back from the menu, which would otherwise close the next one.
    const close = async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
      await waitFor(() =>
        expect(baseElement.querySelector('[data-state="open"][role="dialog"]')).toBeNull()
      );
    };

    // EM segmentation brings the type tint and, with its bumps, their sliders.
    await chooseLook('EM segmentation');
    await openSettings();
    collect();
    await close();
    fireEvent.click(screen.getByRole('button', { name: 'Statistics' }));
    await screen.findByText('Morphology');
    collect();
    await close();
    fireEvent.click(screen.getByRole('button', { name: 'Export mesh' }));
    await screen.findByRole('button', { name: 'About Export mesh' });
    collect();
    await close();
    // The key comes with a look that has one; Colour by works in one that takes the colours.
    await chooseLook('Fluorescence');
    collect();
    await chooseLook('Studio');
    fireEvent.click(screen.getByRole('button', { name: 'Colour by: Section' }));
    await screen.findByRole('button', { name: 'Distance' });
    collect();

    expect([...shown].sort()).toEqual(Object.keys(HELP).sort());
  });

  it('shows the statistics from a button of their own', async () => {
    await renderViewer();

    fireEvent.click(screen.getByRole('button', { name: 'Statistics' }));
    expect(await screen.findByText('285')).toBeInTheDocument();
    expect(screen.getByText('Cell A')).toBeInTheDocument();
  });

  it('loads the exporters on the first export only, and saves the file under the name of the cell', async () => {
    const build = Promise.withResolvers<unknown>();
    h.setup = (pool) => pool.build.mockReturnValue(build.promise);
    await renderViewer();
    fireEvent.click(screen.getByRole('button', { name: 'Export mesh' }));
    expect(await screen.findByText('The mesh is still being built.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draco GLB' })).toBeDisabled();

    await act(async () => build.resolve(h.result));
    expect(h.exportLoaded).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Draco GLB' }));
    await waitFor(() =>
      expect(h.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'Cell A.draco.glb')
    );
    expect(h.exportLoaded).toBe(true);
    expect(h.exportMesh).toHaveBeenCalledWith(
      'draco',
      h.result,
      expect.objectContaining({ axon: '#0033aa' })
    );
  });

  it('says when an export fails', async () => {
    h.exportMesh.mockRejectedValueOnce(new Error('out of memory'));
    const { viewer } = await renderViewer();
    await waitFor(() => expect(viewer.setMesh).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Export mesh' }));
    fireEvent.click(await screen.findByRole('button', { name: 'STL' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The export failed: out of memory');
    expect(h.saveAs).not.toHaveBeenCalled();
  });

  it('frees the viewer and the workers when it goes', async () => {
    const { unmount, viewer, pool } = await renderViewer();

    unmount();
    expect(viewer.dispose).toHaveBeenCalled();
    expect(pool.dispose).toHaveBeenCalled();
  });
});
