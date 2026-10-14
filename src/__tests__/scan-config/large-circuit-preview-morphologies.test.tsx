import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LargeCircuitPreview } from '@/features/scan-config/components/model-preview/large-circuit-preview/large-circuit-preview';

import { loadedData, loads, started } from '../circuit-morphologies/pending-loads';

import type { MorphoViewerSomasOnlyProps } from '@openbraininstitute/morphoviewer';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';
import type { CircuitMorphologiesProps } from '@/features/circuit-viewer/morphologies/circuit-morphologies';
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
  placement: { placed: [], failures: new Map(), settled: true, download: null } as ReturnType<
    typeof usePopulationsPlacement
  >,
  /** What each view was last rendered with. */
  somas: null as MorphoViewerSomasOnlyProps | null,
  morphologies: null as CircuitMorphologiesProps | null,
}));

vi.mock('@/morpho-viewer', () => ({
  MorphoViewerCircuitMultipleNeuronsSomaOnly: (props: MorphoViewerSomasOnlyProps) => {
    h.somas = props;
    return <div data-testid="somas" />;
  },
  useMorphoViewerDebugMode: () => false,
}));

vi.mock('@/features/circuit-viewer/morphologies/circuit-morphologies', () => ({
  CircuitMorphologies: (props: CircuitMorphologiesProps) => {
    h.morphologies = props;
    return <div data-testid="morphologies" />;
  },
}));

vi.mock(
  '@/features/circuit-viewer/morphologies/load/load',
  () => import('../circuit-morphologies/pending-loads')
);

vi.mock('@/api/one/circuit-visualization', () => ({
  buildCircuitMorphologyPackRequest: async (circuitId: string) => ({
    url: `https://obi-one.test/circuit/viz/${circuitId}/morphology-pack`,
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

const circuit = {
  id: 'circuit-id',
  name: 'Circuit',
  subject: { species: { name: 'Mus musculus' } },
} as ICircuit;

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
        onRepresentationChange={
          offered
            ? (next) => {
                asked.push(next);
                setRepresentation(next);
              }
            : undefined
        }
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
    h.placement = {
      placed: [
        { population: CORTEX, geometry: placement([0, 0, 0, 1, 1, 1]) },
        { population: VPM, geometry: placement([9, 9, 9]) },
      ],
      failures: new Map(),
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
    act(() => load.options.onProgress?.(2.5e6, 0));
    expect(status()).toBe('Loading morphologies… 2.5 MB');
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
    const colors = h.somas?.cellColors;
    const loaded = data();

    await act(async () => load.resolve({ kind: 'loaded', data: loaded, fromCache: false }));
    await screen.findByTestId('morphologies');

    expect(screen.queryByTestId('somas')).toBeNull();
    expect(status()).toBeNull();
    expect(h.morphologies).toMatchObject({
      data: loaded,
      backgroundColor: '#000000',
      showScalebar: true,
    });
    expect(h.morphologies?.cellColors).toBe(colors);
    // The input's cell is hidden, as among the somas.
    expect(colors?.palette[colors.columnByCell[2]]).toBe(false);
    // The cell the pack had no soma of is where the page has it, at the species' radius.
    expect([...loaded.somas.subarray(8)]).toEqual([9, 9, 9, 12]);
  });

  /** The morphologies on show, as the view was last rendered. */
  async function shown(
    props: Partial<LargeCircuitPreviewProps> = {}
  ): Promise<CircuitMorphologiesProps> {
    render(<Hosted start="morphologies" {...props} />);
    const load = await started();
    await act(async () => load.resolve({ kind: 'loaded', data: data(), fromCache: false }));
    await screen.findByTestId('morphologies');
    return h.morphologies as CircuitMorphologiesProps;
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

  it('stops a load when switched off before it ends', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();

    fireEvent.click(screen.getByText('switch off'));

    expect(load.options.signal.aborted).toBe(true);
    expect(status()).toBeNull();
  });

  it.each([
    ['too_many_neurons', 'This circuit is too large to show as morphologies'],
    ['files_too_large', 'This circuit is too large to show as morphologies'],
    ['too_many_points', 'This circuit is too large to show as morphologies'],
    ['too_many_segments', 'This circuit is too large to show as morphologies'],
    ['no_morphologies', 'This circuit has no morphologies to show'],
    ['something_new', 'The morphologies cannot be shown'],
  ])('stays on the somas and says why when OBI-One refuses with %s', async (reason, text) => {
    render(<Hosted start="morphologies" />);
    const load = await started();

    await act(async () => load.resolve({ kind: 'refused', reason, detail: 'In numbers' }));

    expect(asked).toEqual(['somas']);
    expect(screen.getByTestId('somas')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(text);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(status()).toBeNull();
  });

  it('puts its status where the host says, loading and refused alike', async () => {
    const placed = () => screen.getByRole('status').parentElement;
    render(<Hosted start="morphologies" statusPlace={{ top: 52, left: 52 }} />);
    const load = await started();
    expect(placed()).toHaveStyle({ top: '52px', left: '52px' });

    await act(async () => load.resolve({ kind: 'refused', reason: 'busy', detail: '' }));
    expect(placed()).toHaveStyle({ top: '52px', left: '52px' });
  });

  it('offers another try when OBI-One is busy with another circuit', async () => {
    render(<Hosted start="morphologies" />);
    const first = await started();
    await act(async () => first.resolve({ kind: 'refused', reason: 'busy', detail: 'Try again' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Morphologies are being built for another circuit'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(asked).toEqual(['somas', 'morphologies']);
    await started(2);
    expect(status()).toBe('Loading morphologies…');
  });

  it('offers another try when the load fails', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();

    await act(async () => load.reject(new Error('Download failed (HTTP 500)')));

    expect(asked).toEqual(['somas']);
    expect(screen.getByRole('status')).toHaveTextContent('The morphologies could not be loaded');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('says nothing of morphologies the circuit is no longer offered as', async () => {
    render(<Hosted start="morphologies" />);
    const load = await started();
    await act(async () => load.resolve({ kind: 'refused', reason: 'busy', detail: '' }));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('stop offering'));

    expect(status()).toBeNull();
  });

  it('waits for the cells to be placed before it asks for their morphologies', async () => {
    h.placement = { placed: [], failures: new Map(), settled: false, download: null };
    const { rerender } = render(<Hosted start="morphologies" />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));
    expect(loads).toHaveLength(0);

    h.placement = {
      placed: [{ population: CORTEX, geometry: placement([0, 0, 0, 1, 1, 1]) }],
      failures: new Map(),
      settled: true,
      download: null,
    };
    rerender(<Hosted start="morphologies" />);

    const load = await started();
    expect(load.options.populations).toEqual([{ name: 'cortex', cells: 2 }]);
  });
});
