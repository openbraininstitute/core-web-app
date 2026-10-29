import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LargeCircuitPreview } from '@/features/scan-config/components/model-preview/large-circuit-preview/large-circuit-preview';

import { loadedData, loadedOf, loads, started } from '../circuit-morphologies/pending-loads';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';
import type { CircuitCellsProps } from '@/features/circuit-viewer/morphologies/circuit-cells';
import type { CircuitRepresentation } from '@/features/scan-config/components/color-by/types';
import type { LargeCircuitPreviewProps } from '@/features/scan-config/components/model-preview/large-circuit-preview/large-circuit-preview';

const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };
const VPM: NodePopulation = { name: 'vpm', type: 'virtual', file: 'inputs.h5' };

function placement(positions: number[]): NodeGeometry {
  return {
    count: positions.length / 3,
    positions: new Float32Array(positions),
    orientations: null,
    morphologies: null,
  };
}

const h = vi.hoisted(() => ({
  placement: {
    placed: [],
    failures: new Map(),
    positionless: new Set(),
    settled: true,
    download: null,
  } as ReturnType<typeof usePopulationsPlacement>,
  /** What the viewer was last rendered with, and how many times it was mounted. */
  cells: null as CircuitCellsProps | null,
  mounts: 0,
}));

// Named for what it draws: the somas, or the morphologies in their place.
vi.mock('@/features/circuit-viewer/morphologies/lazy-circuit-cells', () => ({
  LazyCircuitCells: (props: CircuitCellsProps) => {
    h.cells = props;
    useEffect(() => {
      h.mounts++;
    }, []);
    return <div data-testid={props.data ? 'morphologies' : 'somas'} />;
  },
}));

vi.mock(
  '@/features/circuit-viewer/morphologies/load/load',
  () => import('../circuit-morphologies/pending-loads')
);

vi.mock('@/api/small-scale-simulator/circuit/morphology-pack', () => ({
  buildMorphologyPackDownloadRequest: async ({ circuitId }: { circuitId: string }) => ({
    url: `https://bluenaas.test/circuit/${circuitId}/morphology-pack`,
    headers: {},
  }),
}));

vi.mock('@/utils/logger', () => ({ logError: () => {} }));

vi.mock('next/navigation', () => ({
  useParams: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));

vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: { circuitAssetId: 'asset', nodes: [CORTEX, VPM], edges: [], raw: {} },
    error: null,
  }),
}));

vi.mock('@/features/circuit-nodes/hooks/use-populations-placement', () => ({
  usePopulationsPlacement: () => h.placement,
}));

const PACK = { size: 6e6, sha256: 'ab12' };

const circuit = {
  id: 'circuit-id',
  name: 'Circuit',
  subject: { species: { name: 'Mus musculus' } },
} as unknown as ICircuit;

/** As the loader hands it over: the two cortex cells, and no soma for the input. */
const data = () =>
  loadedData(
    [
      { name: 'cortex', cells: 2 },
      { name: 'vpm', cells: 1 },
    ],
    [0, 0, 0, 5, 1, 1, 1, 5, NaN, NaN, NaN, 0]
  );

/** Each representation the preview asked its host for, in order. */
let asked: CircuitRepresentation[] = [];

/** The preview with its host's part: the representation is the host's to keep. */
function Hosted({
  start,
  ...props
}: { start: CircuitRepresentation } & Partial<LargeCircuitPreviewProps>) {
  const [representation, setRepresentation] = useState(start);
  const [offered, setOffered] = useState(true);
  const ask = (next: CircuitRepresentation) => {
    asked.push(next);
    setRepresentation(next);
  };
  return (
    <>
      <button type="button" onClick={() => setRepresentation('morphologies')}>
        switch on
      </button>
      <button type="button" onClick={() => setRepresentation('somas')}>
        switch off
      </button>
      <button type="button" onClick={() => setOffered(false)}>
        stop offering
      </button>
      <LargeCircuitPreview
        circuit={circuit}
        population={CORTEX}
        populations={[CORTEX, VPM]}
        hiddenPopulations={['vpm']}
        backgroundColor="#000000"
        signals={{} as never}
        representation={offered ? representation : 'somas'}
        onRepresentationChange={offered ? ask : undefined}
        onMorphologiesStopped={() => (offered ? ask('somas') : undefined)}
        pack={PACK}
        {...props}
      />
    </>
  );
}

const status = () => screen.queryByRole('status')?.textContent ?? null;

describe('LargeCircuitPreview morphologies', () => {
  beforeEach(() => {
    asked = [];
    loads.length = 0;
    h.cells = null;
    h.mounts = 0;
    h.placement = {
      placed: [
        { population: CORTEX, geometry: placement([0, 0, 0, 1, 1, 1]) },
        { population: VPM, geometry: placement([9, 9, 9]) },
      ],
      failures: new Map(),
      positionless: new Set(),
      settled: true,
      download: null,
    };
  });

  it('asks for no morphologies while the cells are drawn as somas', async () => {
    render(<Hosted start="somas" />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    expect(loads).toHaveLength(0);
    expect(screen.getByTestId('somas')).toBeInTheDocument();
    expect(status()).toBeNull();
  });

  it('keeps the somas on show while the morphologies load, saying how far the pack has come', async () => {
    render(<Hosted start="somas" />);
    fireEvent.click(screen.getByText('switch on'));

    const load = await started();
    expect(status()).toBe('Loading morphologies…');
    expect(screen.getByTestId('somas')).toBeInTheDocument();
    expect(screen.queryByTestId('morphologies')).toBeNull();

    act(() => load.options.onProgress?.(1.5e6, 6e6));
    expect(status()).toBe('Loading morphologies… 1.5 / 6.0 MB');
  });

  it('numbers the cells for the loader as it numbers the somas: through what was placed, in its order', async () => {
    render(<Hosted start="morphologies" />);

    const load = await started();
    expect(load.options.populations).toEqual([
      { name: 'cortex', cells: 2 },
      { name: 'vpm', cells: 1 },
    ]);
  });

  it("draws the morphologies in the somas' place once they are in, in the somas' colours", async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    const colors = h.cells?.cellColors;
    const somas = h.cells?.somas;
    const loaded = data();

    await act(async () => load.resolve(loadedOf(loaded)));
    await screen.findByTestId('morphologies');

    expect(screen.queryByTestId('somas')).toBeNull();
    expect(status()).toBeNull();
    expect(h.cells).toMatchObject({
      data: loaded,
      backgroundColor: '#000000',
      showScalebar: true,
    });
    expect(h.cells?.cellColors).toBe(colors);
    expect(h.cells?.somas).toBe(somas);
    // The input's cell is hidden, as among the somas.
    expect(colors?.palette[colors.columnByCell[2]]).toBe(false);
    // The cell the pack had no soma of is where the page has it, at the species' radius.
    expect([...loaded.somas.subarray(8)]).toEqual([9, 9, 9, 12]);
  });

  it('frames the view on the morphologies as they come where the host says, and not otherwise', async () => {
    const { rerender } = render(<Hosted start="morphologies" />);
    expect(h.cells?.follow).toBe(false);
    rerender(<Hosted start="morphologies" followMorphologies />);
    expect(h.cells?.follow).toBe(true);
  });

  it('says how much of the rest of the pack has come in while the morphologies are drawn, the same viewer kept', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    const loaded = data();
    await act(async () => load.resolve(loadedOf(loaded, false, new Promise(() => {}))));
    await screen.findByTestId('morphologies');
    const shown = h.cells;

    act(() => load.options.onProgress?.(3e6, 6e6));
    expect(status()).toBe('Loading morphologies… 3.0 / 6.0 MB');
    expect(screen.getByTestId('morphologies')).toBeInTheDocument();
    expect(h.cells?.data).toBe(shown?.data);
    act(() => load.options.onProgress?.(6e6, 6e6));
    expect(status()).toBeNull();
    expect(h.mounts).toBe(1);
  });

  it('says what is left out, or drawn with WebGL 2, over how much of the rest has come in', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    await act(async () => load.resolve(loadedOf(data(), false, new Promise(() => {}))));
    await screen.findByTestId('morphologies');
    act(() => load.options.onProgress?.(3e6, 6e6));

    act(() => h.cells?.onLeftOut?.(true));
    expect(status()).toBe('Too many morphologies in view: zoom in to see them');
    act(() => h.cells?.onLeftOut?.(false));
    act(() => h.cells?.onFallback?.('memory'));
    expect(status()).toBe('Drawn with WebGL 2: the graphics ran out of memoryDismiss');
  });

  it("asks Bluenaas for the circuit's pack, with the size and digest it gave", async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();

    expect(load.options.request).toEqual({
      url: 'https://bluenaas.test/circuit/circuit-id/morphology-pack',
      headers: {},
      pack: { size: 6e6, sha256: 'ab12' },
    });
  });

  it('loads nothing for a circuit without a pack ready, its somas on show and nothing said', async () => {
    render(<Hosted start="morphologies" pack={null} />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    expect(loads).toHaveLength(0);
    expect(screen.getByTestId('somas')).toBeInTheDocument();
    expect(status()).toBeNull();
  });

  it('says so while morphologies in view are left out for the budget', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    await act(async () => load.resolve(loadedOf(data())));
    await screen.findByTestId('morphologies');

    act(() => h.cells?.onLeftOut?.(true));
    expect(status()).toBe('Too many morphologies in view: zoom in to see them');
    act(() => h.cells?.onLeftOut?.(false));
    expect(status()).toBeNull();
  });

  it.each([
    ['the browser has no WebGPU', 'missing', '. A browser with WebGPU shows them all'],
    ['WebGPU gave out', 'reset', ''],
  ] as const)('says a browser with WebGPU shows them only where %s', async (_case, fallback, more) => {
    await shown();
    act(() => h.cells?.onFallback?.(fallback));
    act(() => h.cells?.onLeftOut?.(true));
    expect(status()).toBe(`Too many morphologies in view: zoom in to see them${more}`);
  });

  it.each([
    ['reset', 'Drawn with WebGL 2 after the graphics were reset'],
    ['memory', 'Drawn with WebGL 2: the graphics ran out of memory'],
  ] as const)('says so once the morphologies are in where WebGPU gave out (%s), until dismissed', async (fallback, text) => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    act(() => h.cells?.onFallback?.(fallback));
    expect(status()).toBe('Loading morphologies…');
    await act(async () => load.resolve(loadedOf(data())));
    await screen.findByTestId('morphologies');

    expect(screen.getByRole('status')).toHaveTextContent(text);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(status()).toBeNull();
  });

  it('says nothing of the tier where the browser has no WebGPU and nothing is left out', async () => {
    await shown();
    act(() => h.cells?.onFallback?.('missing'));
    expect(status()).toBeNull();
  });

  /** The morphologies on show, as the view was last rendered. */
  async function shown(props: Partial<LargeCircuitPreviewProps> = {}): Promise<CircuitCellsProps> {
    render(<Hosted start="morphologies" {...props} />);
    const load = await started();
    await act(async () => load.resolve(loadedOf(data())));
    await screen.findByTestId('morphologies');
    return h.cells as CircuitCellsProps;
  }

  it("draws a morphology with no colour of its own in the circuit viewer's default colour", async () => {
    expect((await shown()).defaultColor).toBe('#2b5cd9');
  });

  it('draws it in the colour its host has for that', async () => {
    expect((await shown({ defaultColor: '#7aa2ff' })).defaultColor).toBe('#7aa2ff');
  });

  it('highlights the morphology under the pointer', async () => {
    expect((await shown()).cellHover).toBe(true);
  });

  it('highlights none where the host has no cell hover', async () => {
    expect((await shown({ features: { cellHover: false } })).cellHover).toBe(false);
  });

  it('puts the population of a clicked morphology on show, as of a clicked soma', async () => {
    const onPopulationClick = vi.fn();
    const view = await shown({ hiddenPopulations: [], onPopulationClick });

    // The cells are numbered through the populations placed: two of the cortex, then the input's.
    view.onCellClick?.(2);
    expect(onPopulationClick).toHaveBeenCalledExactlyOnceWith('vpm');

    view.onCellClick?.(1);
    expect(onPopulationClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no other population is on show', { hiddenPopulations: ['vpm'], onPopulationClick: vi.fn() }],
    ['the host has the population pinned', { hiddenPopulations: [] }],
  ])('takes no click on a morphology where %s', async (_, props) => {
    expect((await shown(props)).onCellClick).toBeUndefined();
  });

  it('draws the electrodes over the morphologies as over the somas, and lets them be moved where the form takes it', async () => {
    const overlays = [
      {
        name: 'probe',
        id: 'probe',
        kind: 'electrodes' as const,
        color: '#1b6ef3',
        coordinates: Float32Array.of(1, 2, 3),
      },
    ];
    const onOverlayTransform = vi.fn();
    const view = await shown({
      overlays,
      electrodeRadius: 12,
      highlightedOverlayId: 'probe',
      overlaysInteractive: true,
      onOverlayTransform,
    });

    expect(view).toMatchObject({
      electrodes: overlays,
      electrodeRadius: 12,
      selectedElectrode: 'probe',
      onElectrodeTransform: onOverlayTransform,
    });
  });

  it('replays the spikes over the morphologies as over the somas', async () => {
    const spikes = {
      data: {
        cellIndices: Uint32Array.of(1),
        times: Float32Array.of(5),
        timeMinInMs: 0,
        timeMaxInMs: 10,
      },
      playing: true,
      onTimeChange: vi.fn(),
    };
    expect((await shown({ spikes })).spikes).toBe(spikes);
  });

  it('holds the electrodes still where the form cannot take a move', async () => {
    const view = await shown({ overlaysInteractive: false, onOverlayTransform: vi.fn() });
    expect(view.onElectrodeTransform).toBeUndefined();
    expect(view.electrodeRadius).toBe(5);
  });

  it('goes back to the somas, and lets go of the morphologies, when switched off', async () => {
    await shown();

    fireEvent.click(screen.getByText('switch off'));

    expect(screen.queryByTestId('morphologies')).toBeNull();
    expect(screen.getByTestId('somas')).toBeInTheDocument();

    fireEvent.click(screen.getByText('switch on'));
    await started(2);
    expect(screen.getByTestId('somas')).toBeInTheDocument();
  });

  it('keeps one viewer, with the same somas and replay, through the switch both ways', async () => {
    const spikes = { playing: true, timeInMs: 40 };
    await shown({ spikes });
    const { somas } = h.cells as CircuitCellsProps;

    fireEvent.click(screen.getByText('switch off'));
    fireEvent.click(screen.getByText('switch on'));
    const load = await started(2);
    await act(async () => load.resolve(loadedOf(data(), true)));
    await screen.findByTestId('morphologies');

    expect(h.mounts).toBe(1);
    expect(h.cells?.somas).toBe(somas);
    expect(h.cells?.spikes).toBe(spikes);
  });

  it('stops a load when switched off before it ends', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();

    fireEvent.click(screen.getByText('switch off'));

    expect(load.options.signal.aborted).toBe(true);
    expect(status()).toBeNull();
  });

  it('puts its status where the host says, loading and failed alike', async () => {
    const placed = () => screen.getByRole('status').parentElement;
    render(<Hosted start="morphologies" statusPlace={{ top: 52, left: 52 }} />);
    const load = await started();
    expect(placed()).toHaveStyle({ top: '52px', left: '52px' });

    await act(async () => load.reject(new Error('Download failed (HTTP 500)')));
    expect(placed()).toHaveStyle({ top: '52px', left: '52px' });
  });

  it('stays on the somas and offers another try when the load fails, until dismissed', async () => {
    render(<Hosted start="morphologies" />);
    const first = await started();

    await act(async () => first.reject(new Error('Download failed (HTTP 500)')));

    expect(asked).toEqual(['somas']);
    expect(screen.getByTestId('somas')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The morphologies could not be loaded');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(asked).toEqual(['somas', 'morphologies']);
    const second = await started(2);
    expect(status()).toBe('Loading morphologies…');

    await act(async () => second.reject(new Error('Download failed (HTTP 500)')));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(status()).toBeNull();
  });

  it('keeps what is drawn where the rest of the pack does not come in, says so over what is left out, and loads it again', async () => {
    render(<Hosted start="morphologies" />);
    const first = await started();
    const cut = Promise.reject(new Error('Download cut short'));
    await act(async () => first.resolve(loadedOf(data(), false, cut)));
    await screen.findByTestId('morphologies');
    act(() => h.cells?.onLeftOut?.(true));

    await waitFor(() =>
      expect(status()).toBe('Not all of the morphologies could be loadedTry againDismiss')
    );
    expect(screen.getByTestId('morphologies')).toBeInTheDocument();
    expect(asked).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(asked).toEqual([]);
    await started(2);
    expect(status()).toBe('Loading morphologies…');
  });

  it('leaves it to the host what to draw where the load fails', async () => {
    const onMorphologiesStopped = vi.fn();
    render(<Hosted start="morphologies" onMorphologiesStopped={onMorphologiesStopped} />);
    const load = await started();

    await act(async () => load.reject(new Error('Download failed (HTTP 500)')));

    expect(onMorphologiesStopped).toHaveBeenCalledOnce();
    expect(asked).toEqual([]);
  });

  it('loads them again on another try where the host stayed on the morphologies', async () => {
    render(<Hosted start="morphologies" onMorphologiesStopped={() => {}} />);
    const first = await started();
    await act(async () => first.reject(new Error('Download failed (HTTP 500)')));

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(asked).toEqual([]);
    await started(2);
    expect(status()).toBe('Loading morphologies…');
  });

  it('does not tell the host where the rest of the pack does not come in', async () => {
    const onMorphologiesStopped = vi.fn();
    render(<Hosted start="morphologies" onMorphologiesStopped={onMorphologiesStopped} />);
    const load = await started();
    await act(async () =>
      load.resolve(loadedOf(data(), false, Promise.reject(new Error('Download cut short'))))
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    );

    expect(onMorphologiesStopped).not.toHaveBeenCalled();
    expect(screen.getByTestId('morphologies')).toBeInTheDocument();
  });

  it('says nothing of a pack cut short once switched back to the somas', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    await act(async () =>
      load.resolve(loadedOf(data(), false, Promise.reject(new Error('Download cut short'))))
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText('switch off'));

    expect(status()).toBeNull();
  });

  it('says nothing of morphologies the circuit is no longer offered as', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    await act(async () => load.reject(new Error('Download failed (HTTP 500)')));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('stop offering'));

    expect(status()).toBeNull();
  });

  it('waits for the cells to be placed before it asks for their morphologies', async () => {
    h.placement = {
      placed: [],
      failures: new Map(),
      positionless: new Set(),
      settled: false,
      download: null,
    };
    const { rerender } = render(<Hosted start="morphologies" />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));
    expect(loads).toHaveLength(0);

    h.placement = {
      placed: [{ population: CORTEX, geometry: placement([0, 0, 0, 1, 1, 1]) }],
      failures: new Map(),
      positionless: new Set(),
      settled: true,
      download: null,
    };
    rerender(<Hosted start="morphologies" />);

    const load = await started();
    expect(load.options.populations).toEqual([{ name: 'cortex', cells: 2 }]);
  });
});
