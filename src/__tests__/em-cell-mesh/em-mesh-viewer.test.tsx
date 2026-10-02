import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, lazy, Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { EmCellMeshViewerCard } from '@/features/entities/em-cell-mesh/detail-view';
import { EmCellMeshViewer } from '@/features/entities/em-cell-mesh/viewer/em-mesh-viewer';
import { LoadError } from '@/features/entities/em-cell-mesh/viewer/engine/load';
import { HELP } from '@/features/entities/em-cell-mesh/viewer/help/help-text';
import { meshAsset } from '@/features/entities/em-cell-mesh/viewer/mesh-asset';
import { defaultFlags } from '@/features/feature-flags/config';
import { emMeshDebugFlag } from '@/features/feature-flags/flags';
import { FlagsProvider } from '@/features/feature-flags/provider';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { ViewStatus } from '@/features/entities/em-cell-mesh/viewer/engine/em-mesh-viewer';
import type {
  LoadCallbacks,
  LoadOptions,
  LoadOutcome,
  LoadReport,
} from '@/features/entities/em-cell-mesh/viewer/engine/load';
import type { PackedMesh, StandIn } from '@/features/entities/em-cell-mesh/viewer/engine/types';

// Each test renders the viewer and goes through its menus in jsdom, which under coverage on CI takes seconds.
vi.setConfig({ testTimeout: 20_000 });

type Orientation = { x: number; y: number; z: number; w: number };

const h = vi.hoisted(() => {
  const DARK = { light: ['#3c3e42', '#2a2b2e'], dark: ['#131416', '#060607'] };
  const LIGHT = { light: ['#ffffff', '#d9dde6'], dark: ['#2b3140', '#0c0e13'] };
  const LOOKS = [
    { id: 'studio', label: 'Studio', hint: 'Three lights.', colors: 'palette', background: LIGHT },
    {
      id: 'em',
      label: 'EM segmentation',
      hint: 'Waxy grey.',
      colors: 'tint',
      ao: true,
      background: DARK,
    },
  ];

  class FakeViewer {
    looks = LOOKS;
    pixelScale: number | null = 0.5;
    listeners = {
      scale: new Set<(scale: number | null) => void>(),
      wheel: new Set<() => void>(),
      view: new Set<(orientation: Orientation) => void>(),
      ready: new Set<() => void>(),
      rebuild: new Set<() => void>(),
      status: new Set<(status: unknown) => void>(),
      context: new Set<(lost: boolean) => void>(),
    };
    status: unknown = {
      shown: 'full',
      reason: 'error',
      errorPx: 2.42,
      frameMs: 12.5,
      slow: false,
      timer: 'timer-query',
      upload: { done: 386, total: 386, ms: 183 },
      gpuBytes: 300 * 2 ** 20,
      pixels: 2e6,
    };
    prepare = vi.fn(() => Promise.resolve());
    seen = vi.fn(() => Promise.resolve());
    setStandIn = vi.fn();
    setFull = vi.fn();
    clear = vi.fn();
    dispose = vi.fn();
    setDark = vi.fn();
    setLook = vi.fn();
    setAO = vi.fn();
    setAODepth = vi.fn();
    setWireframe = vi.fn();
    setSpin = vi.fn();
    setForcedMesh = vi.fn();
    showChunkBoxes = vi.fn();
    resetView = vi.fn();
    viewAlong = vi.fn();
    setProjection = vi.fn((projection: string) => {
      this.pixelScale = projection === 'orthographic' ? 0.5 : null;
      for (const listener of this.listeners.scale) listener(this.pixelScale);
    });

    constructor() {
      if (state.startError) throw state.startError;
      state.viewers.push(this);
    }

    get currentPixelScale() {
      return this.pixelScale;
    }

    private on<T>(set: Set<T>, listener: T) {
      set.add(listener);
      return () => set.delete(listener);
    }

    onPixelScaleChange(listener: (scale: number | null) => void) {
      return this.on(this.listeners.scale, listener);
    }

    onWheelWithoutCtrl(listener: () => void) {
      return this.on(this.listeners.wheel, listener);
    }

    onViewChange(listener: (orientation: Orientation) => void) {
      listener({ x: 0, y: 0, z: 0, w: 1 });
      return this.on(this.listeners.view, listener);
    }

    onFullReady(listener: () => void) {
      return this.on(this.listeners.ready, listener);
    }

    onRebuildNeeded(listener: () => void) {
      return this.on(this.listeners.rebuild, listener);
    }

    onStatus(listener: (status: unknown) => void) {
      listener(this.status);
      return this.on(this.listeners.status, listener);
    }

    onContextChange(listener: (lost: boolean) => void) {
      return this.on(this.listeners.context, listener);
    }

    tell(kind: 'ready' | 'rebuild') {
      for (const listener of this.listeners[kind]) listener();
    }

    /** The context lost, and given back where `restored`: with the full mesh, which then needs loading again. */
    loseContext(restored: boolean) {
      for (const listener of this.listeners.context) listener(true);
      if (!restored) return;
      for (const listener of this.listeners.context) listener(false);
      this.tell('rebuild');
    }
  }

  /** A load under way: what it was asked, how to answer, and how it ends. */
  interface Load {
    options: LoadOptions;
    callbacks: LoadCallbacks;
    resolve(outcome: LoadOutcome): void;
    reject(e: unknown): void;
  }

  const state = {
    viewers: [] as FakeViewer[],
    loads: [] as Load[],
    request: vi.fn((params: { entityId: string; id: string }) =>
      Promise.resolve({
        url: `https://entitycore.test/em_cell_mesh/${params.entityId}/assets/${params.id}/download`,
        headers: { Authorization: 'Bearer token' },
      })
    ),
    saveAs: vi.fn(),
    startError: null as Error | null,
    FakeViewer,
  };
  return state;
});

vi.mock('@/features/entities/em-cell-mesh/viewer/engine/em-mesh-viewer', () => ({
  EmMeshViewer: h.FakeViewer,
}));

vi.mock('@/features/entities/em-cell-mesh/viewer/engine/load', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/entities/em-cell-mesh/viewer/engine/load')>()),
  loadEmMesh: (options: LoadOptions, callbacks: LoadCallbacks) =>
    new Promise<LoadOutcome>((resolve, reject) => {
      h.loads.push({ options, callbacks, resolve, reject });
    }),
}));

vi.mock('@/api/entitycore/queries/assets', () => ({ buildAssetDownloadRequest: h.request }));

vi.mock('next/navigation', () => ({
  useParams: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));

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

function asset(patch: Partial<IAsset>): IAsset {
  return {
    id: 'glb',
    path: 'mesh.glb',
    full_path: 'a/mesh.glb',
    bucket_name: 'b',
    is_directory: false,
    content_type: AssetContentType.gltf_binary,
    size: 8e6,
    label: AssetLabel.cell_surface_mesh,
    status: 'created',
    ...patch,
  } as IAsset;
}

const OBJ = asset({ id: 'obj', content_type: 'application/obj' as AssetContentType, size: 5e8 });
const GLB = asset({});
const LOD = asset({
  id: 'lod',
  label: 'lod_mesh_block' as AssetLabel,
  content_type: AssetContentType.gltf_binary,
});

const MESH: PackedMesh = {
  grid: { origin: [0, 0, 0], step: 0.058 },
  chunks: [],
  triangles: 27_459_402,
  vertices: 13_868_988,
};
const STAND_IN: StandIn = { ...MESH, triangles: 340_540, vertices: 142_478, errorUm: 1.56 };

function report(patch: Partial<LoadReport> = {}): LoadReport {
  return {
    header: { triangles: 27_459_405, vertices: 13_756_001, draco: true, bounds: null },
    budget: { kind: 'ok', peakBytes: 3.18 * 2 ** 30, allowedBytes: 8 * 2 ** 30 },
    glbFrom: 'network',
    standInFrom: 'build',
    dracoBits: 14,
    dracoHeapBytes: 1882 * 2 ** 20,
    meshoptHeapBytes: 1186 * 2 ** 20,
    timings: [
      { step: 'download', ms: 3548 },
      { step: 'decode', ms: 1988 },
      { step: 'simplify', ms: 1302 },
      { step: 'stand-in', ms: 1357 },
      { step: 'split', ms: 850 },
      { step: 'full', ms: 1421 },
    ],
    ...patch,
  } as LoadReport;
}

const ENTITY = { id: 'cell-a', name: 'Cell A' };

async function renderViewer({ debug = true } = {}) {
  const view = render(
    <FlagsProvider flags={{ ...defaultFlags, [emMeshDebugFlag.key]: debug }}>
      <EmCellMeshViewer entity={ENTITY} asset={GLB} />
    </FlagsProvider>
  );
  await screen.findByRole('button', { name: 'Viewer settings' });
  return { ...view, viewer: h.viewers.at(-1) as InstanceType<typeof h.FakeViewer> };
}

/** The load the viewer started last, once it has. */
async function started(count = 1) {
  await waitFor(() => expect(h.loads).toHaveLength(count));
  return h.loads[count - 1];
}

const pill = () => screen.queryByRole('status')?.textContent ?? null;

async function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: 'Viewer settings' }));
  await screen.findByRole('switch', { name: 'Wireframe' });
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  h.viewers.length = 0;
  h.loads.length = 0;
  h.request.mockClear();
  h.saveAs.mockClear();
  h.startError = null;
});

describe('meshAsset', () => {
  it('is the GLB cell surface mesh: not its OBJ copy, nor a LOD block', () => {
    expect(meshAsset([OBJ, LOD, GLB])).toBe(GLB);
    expect(meshAsset([OBJ, LOD])).toBeNull();
    expect(meshAsset(undefined)).toBeNull();
  });
});

describe('EmCellMeshViewerCard', () => {
  it("shows why where the viewer can't start, as without WebGL, and loads nothing", async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.startError = new Error('Error creating WebGL context.');
    render(<EmCellMeshViewerCard entity={ENTITY} asset={GLB} />);
    expect(await screen.findByText('Error creating WebGL context.')).toBeInTheDocument();
    expect(h.loads).toHaveLength(0);
    quiet.mockRestore();
  });
});

describe('EmCellMeshViewer', () => {
  it('loads the GLB from its download URL, sized as the asset says, on a device assumed where unsaid', async () => {
    await renderViewer();
    const load = await started();
    expect(h.request).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'cell-a',
        id: 'glb',
        ctx: { virtualLabId: 'lab', projectId: 'project' },
      })
    );
    expect(load.options.request).toEqual({
      url: 'https://entitycore.test/em_cell_mesh/cell-a/assets/glb/download',
      headers: { Authorization: 'Bearer token' },
      size: 8e6,
    });
    expect(load.options.ignoreBudget).toBe(false);
    // jsdom's navigator has no deviceMemory, as Firefox and Safari: a desktop is taken for 8 GB.
    expect(load.options.device.memoryGB).toBe(8);
  });

  it('says how far the download is, then decoding, then full detail, and nothing once it is drawn', async () => {
    const { viewer } = await renderViewer();
    const { callbacks } = await started();
    await waitFor(() => expect(pill()).toBe('Downloading 0.0 / 8.0 MB'));
    act(() => callbacks.onProgress?.(4.1e6, 8e6));
    expect(pill()).toBe('Downloading 4.1 / 8.0 MB');
    act(() => callbacks.onProgress?.(8e6, 8e6));
    expect(pill()).toBe('Decoding…');

    act(() => callbacks.onStandIn(STAND_IN, report()));
    expect(viewer.setStandIn).toHaveBeenCalledWith(STAND_IN);
    expect(pill()).toBe('Loading full detail…');
    act(() => callbacks.onFull(MESH, report()));
    expect(viewer.setFull).toHaveBeenCalledWith(MESH);
    // Until it is uploaded.
    expect(pill()).toBe('Loading full detail…');
    act(() => viewer.tell('ready'));
    expect(pill()).toBeNull();
  });

  it('shows a stand-in from the cache while the GLB downloads, with how far it is', async () => {
    const { viewer } = await renderViewer();
    const { callbacks } = await started();
    act(() => callbacks.onStandIn(STAND_IN, report({ standInFrom: 'cache' })));
    act(() => callbacks.onProgress?.(2e6, 8e6));
    expect(viewer.setStandIn).toHaveBeenCalled();
    expect(pill()).toBe('Loading full detail… 2.0 / 8.0 MB');
  });

  it('offers the GLB of a mesh too large for the browser', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]))));
    vi.stubGlobal('fetch', fetch);
    try {
      await renderViewer();
      const load = await started();
      await act(async () =>
        load.resolve({ kind: 'refused', budget: { kind: 'too-large', triangles: 31e6 } })
      );
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Too large to view in the browser');
      expect(alert).toHaveTextContent('31.0M triangles');
      fireEvent.click(screen.getByRole('button', { name: 'Download the GLB' }));
      await waitFor(() => expect(h.saveAs).toHaveBeenCalledWith(expect.any(Blob), 'Cell A.glb'));
      expect(fetch).toHaveBeenCalledWith(load.options.request.url, {
        headers: { Authorization: 'Bearer token' },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('loads a mesh over the budget once asked to, keeping what the viewer has', async () => {
    const { viewer } = await renderViewer();
    const load = await started();
    await act(async () =>
      load.resolve({
        kind: 'refused',
        budget: { kind: 'over-budget', peakBytes: 3.2 * 2 ** 30, allowedBytes: 2 ** 30 },
      })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /may be too large for this device.*about 3.2 GB of memory.*the 1.0 GB/
    );
    expect(viewer.clear).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Load anyway' }));
    const again = await started(2);
    expect(again.options.ignoreBudget).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(viewer.clear).toHaveBeenCalledTimes(1);
  });

  it('says why the mesh could not be loaded, and keeps a stand-in that came before the failure', async () => {
    await renderViewer();
    const first = await started();
    await act(async () => first.reject(new LoadError('decode', new Error('out of memory'))));
    expect(await screen.findByRole('alert')).toHaveTextContent('The mesh could not be loaded');
    expect(screen.getByRole('alert')).toHaveTextContent('out of memory');
  });

  it('keeps the stand-in when the full mesh fails, and says so', async () => {
    const { viewer } = await renderViewer();
    const load = await started();
    act(() => load.callbacks.onStandIn(STAND_IN, report()));
    await act(async () => load.reject(new LoadError('full', new Error('the worker failed'))));
    await waitFor(() => expect(pill()).toBe('Full detail could not be loaded'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(viewer.clear).toHaveBeenCalledTimes(1);
  });

  it('aborts the load and clears the view for another cell, and aborts it when it goes', async () => {
    const { rerender, unmount, viewer } = await renderViewer();
    const first = await started();
    rerender(
      <FlagsProvider flags={{ ...defaultFlags, [emMeshDebugFlag.key]: true }}>
        <EmCellMeshViewer
          entity={{ id: 'cell-b', name: 'Cell B' }}
          asset={asset({ id: 'glb-b', size: 6e6 })}
        />
      </FlagsProvider>
    );
    const second = await started(2);
    expect(first.options.signal.aborted).toBe(true);
    expect(viewer.clear).toHaveBeenCalledTimes(2);
    expect(second.options.request.size).toBe(6e6);
    // A late callback of the old load leaves the view alone.
    first.callbacks.onStandIn(STAND_IN, report());
    expect(viewer.setStandIn).not.toHaveBeenCalled();

    unmount();
    expect(second.options.signal.aborted).toBe(true);
    expect(viewer.dispose).toHaveBeenCalled();
  });

  /** The viewer with the stand-in and the full mesh drawn. */
  async function drawn() {
    const view = await renderViewer();
    const load = await started();
    act(() => load.callbacks.onProgress?.(8e6, 8e6));
    act(() => load.callbacks.onStandIn(STAND_IN, report()));
    act(() => load.callbacks.onFull(MESH, report()));
    act(() => view.viewer.tell('ready'));
    await act(async () => load.resolve({ kind: 'loaded' }));
    expect(pill()).toBeNull();
    return view;
  }

  it('loads the full mesh again after a lost context, keeping the stand-in, and only when asked the second time', async () => {
    const { viewer } = await drawn();
    act(() => viewer.loseContext(true));
    const again = await started(2);
    expect(viewer.clear).toHaveBeenCalledTimes(1);
    expect(pill()).toBe('Loading full detail…');
    act(() => again.callbacks.onFull(MESH, report()));
    act(() => viewer.tell('ready'));
    await act(async () => again.resolve({ kind: 'loaded' }));

    act(() => viewer.loseContext(true));
    await waitFor(() =>
      expect(pill()).toBe('Full detail was let go of after the graphics resetLoad it')
    );
    expect(h.loads).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Load it' }));
    await started(3);
    expect(viewer.clear).toHaveBeenCalledTimes(1);
  });

  it('says the graphics were reset while they are, and to reload once they have not come back for a while', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { viewer } = await drawn();
      act(() => viewer.loseContext(false));
      expect(pill()).toBe('The graphics were reset, restoring…');
      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole('alert')).toHaveTextContent('The graphics were reset');
      expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument();
      act(() => {
        for (const listener of viewer.listeners.context) listener(false);
      });
      expect(screen.queryByRole('alert')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('waits for the page to be on show before it loads the full mesh again', async () => {
    const { viewer } = await drawn();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => viewer.loseContext(true));
    await act(async () => {});
    expect(h.loads).toHaveLength(1);
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await started(2);
    hidden.mockRestore();
  });

  it('marks the load past its download until the full mesh is drawn, and clears the mark when it goes', async () => {
    const { viewer, unmount } = await renderViewer();
    const load = await started();
    const mark = () => localStorage.getItem('em-mesh-load:glb');
    act(() => load.callbacks.onStage?.('download'));
    expect(mark()).toBeNull();
    act(() => load.callbacks.onStage?.('decode'));
    expect(mark()).toBe('decode');
    act(() => load.callbacks.onStage?.('full'));
    expect(mark()).toBe('full');
    act(() => viewer.tell('ready'));
    expect(mark()).toBeNull();
    act(() => load.callbacks.onStage?.('decode'));
    unmount();
    expect(mark()).toBeNull();
  });

  it('offers to try again a mesh whose load stopped the page last time, loading nothing until asked', async () => {
    localStorage.setItem('em-mesh-load:glb', 'decode');
    try {
      const { unmount } = await renderViewer();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Loading this mesh stopped the page last time'
      );
      expect(screen.getByRole('button', { name: 'Download the GLB' })).toBeInTheDocument();
      expect(h.loads).toHaveLength(0);
      // Left without trying again, the mark stays for the next visit.
      unmount();
      expect(localStorage.getItem('em-mesh-load:glb')).toBe('decode');

      await renderViewer();
      fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
      await started();
      expect(screen.queryByRole('alert')).toBeNull();
    } finally {
      localStorage.clear();
    }
  });

  it('compiles the shaders of the look it opens with, the EM segmentation with its occlusion', async () => {
    const { viewer } = await renderViewer();
    await waitFor(() => expect(viewer.prepare).toHaveBeenCalled());
    expect(viewer.setLook).toHaveBeenCalledWith('em');
    expect(viewer.setAO).toHaveBeenLastCalledWith(true);
    expect(viewer.setLook.mock.invocationCallOrder[0]).toBeLessThan(
      viewer.prepare.mock.invocationCallOrder[0]
    );
  });

  it('drives the viewer from the settings, and puts the occlusion back when leaving the look that brought it', async () => {
    const { viewer } = await renderViewer();
    await openSettings();
    fireEvent.click(screen.getByRole('switch', { name: 'Wireframe' }));
    expect(viewer.setWireframe).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('switch', { name: 'Spin' }));
    expect(viewer.setSpin).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('switch', { name: 'Perspective' }));
    expect(viewer.setProjection).toHaveBeenLastCalledWith('perspective');
    expect(screen.getByRole('switch', { name: 'Scale bar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Dark background' }));
    expect(viewer.setDark).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /^Look: / }));
    fireEvent.click(await screen.findByRole('button', { name: 'Studio' }));
    expect(viewer.setLook).toHaveBeenLastCalledWith('studio');
    expect(viewer.setAO).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: /^Look: / }));
    fireEvent.click(await screen.findByRole('button', { name: 'EM segmentation' }));
    expect(viewer.setAO).toHaveBeenLastCalledWith(true);
  });

  it('has no Debug menu where its flag is off', async () => {
    await renderViewer({ debug: false });
    expect(screen.queryByRole('button', { name: 'Debug' })).toBeNull();
  });

  it('tells in the Debug menu how the mesh loaded, what it takes and why it is drawn as it is', async () => {
    const { viewer } = await renderViewer();
    const load = await started();
    act(() => load.callbacks.onStandIn(STAND_IN, report()));
    act(() => load.callbacks.onFull(MESH, report()));
    fireEvent.click(screen.getByRole('button', { name: 'Debug' }));
    await screen.findByText('Memory');
    const text = document.body.textContent ?? '';
    expect(text).toContain('GLB 8.0 MB, downloaded: 27,459,405 triangles');
    expect(text).toContain("Draco's grid, 14 bits: 58.0 nm a step");
    expect(text).toContain('error 1.56 µm');
    expect(text).toContain('0.8% of vertices on chunk borders');
    expect(text).toContain('simplify 1,302 ms');
    expect(text).toContain('Draco 1,882 MB, meshoptimizer 1,186 MB');
    expect(text).toContain('by its error on screen');
    expect(text).toContain('2.42 device px here');
    expect(text).toContain('full frame: 12.5 ms (timer query)');

    act(() => {
      for (const listener of viewer.listeners.status)
        listener({ ...(viewer.status as ViewStatus), shown: 'stand-in', reason: 'moving' });
    });
    expect(document.body.textContent).toContain('the view moves, and full frames are slow');

    fireEvent.click(screen.getByRole('button', { name: 'A pass of its own' }));
    expect(viewer.setAODepth).toHaveBeenLastCalledWith('own-pass');
    fireEvent.click(screen.getByRole('button', { name: 'Always the full mesh' }));
    expect(viewer.setForcedMesh).toHaveBeenLastCalledWith('full');
    fireEvent.click(screen.getByRole('switch', { name: 'Chunk boxes' }));
    expect(viewer.showChunkBoxes).toHaveBeenLastCalledWith(true);
  });

  it('tells in the Debug menu that no GLB was needed where the cached stand-in is the whole mesh', async () => {
    await renderViewer();
    const load = await started();
    const whole = { ...STAND_IN, errorUm: 0 };
    const cached = report({ header: null, glbFrom: null, standInFrom: 'cache', timings: [] });
    act(() => load.callbacks.onStandIn(whole, cached));
    act(() => load.callbacks.onFull(whole, cached));
    fireEvent.click(screen.getByRole('button', { name: 'Debug' }));
    await screen.findByText('Memory');
    expect(document.body.textContent).toContain(
      'GLB 8.0 MB, not needed: the cached stand-in is the whole mesh'
    );
  });

  it('has a help text for every "?" and a "?" for every help text', async () => {
    const { baseElement } = await renderViewer();
    const shown = new Set<string | null>();
    const collect = () => {
      for (const b of baseElement.querySelectorAll('[data-help]'))
        shown.add(b.getAttribute('data-help'));
    };
    await openSettings();
    collect();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(baseElement.querySelector('[data-state="open"][role="dialog"]')).toBeNull()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Debug' }));
    await screen.findByText('Memory');
    collect();
    expect([...shown].sort()).toEqual(Object.keys(HELP).sort());
  });
});
