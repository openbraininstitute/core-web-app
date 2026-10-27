import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodesSessionStatus } from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import type { ColumnMeta, NodePopulation } from '@/features/circuit-nodes/types';

const fixtures = vi.hoisted(() => ({
  nodes: [] as NodePopulation[],
  session: { status: 'ready', columns: [] } as {
    status: NodesSessionStatus;
    columns: ColumnMeta[] | undefined;
  },
  scene: vi.fn(),
}));

// `@tolokoban/tgd` runs WebGL and WASM setup at module scope; the raster pair
// reaches for a canvas on mount. Neither runs under jsdom.
vi.mock('@/features/circuit-viewer/circuit-scene', () => ({
  CircuitScene: (props: unknown) => {
    fixtures.scene(props);
    return null;
  },
}));
vi.mock('@/features/spike-viewer/components/raster-plot', () => ({ default: () => null }));
vi.mock('@/features/spike-viewer/components/raster-plot-controls', () => ({
  default: () => null,
  RasterHelp: () => null,
}));
// The nodes session behind the raster's axis span reads the workspace off the route.
vi.mock('next/navigation', () => ({ useParams: () => ({}) }));
vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: { nodes: fixtures.nodes, circuitAssetId: 'asset' },
    asset: undefined,
    isLoading: false,
    error: null,
  }),
}));
// The session behind the raster's axis span, and what says whether the
// population chosen has positions to light.
vi.mock('@/features/circuit-nodes/hooks/use-nodes-worker', () => ({
  useNodesWorker: () => ({ rowCount: 3, ...fixtures.session }),
  nodesSessionKey: (circuitId: string, assetId: string, population: string) =>
    `${circuitId}-${assetId}-${population}`,
}));
// The tour needs the app's NextStep provider and the signed-in user's onboarding status.
const { useNextStepOnboarding } = vi.hoisted(() => ({ useNextStepOnboarding: vi.fn() }));
vi.mock('@/ui/segments/app-setup/discover-app', () => ({
  spikeReplayTour: 'simulation-spike-replay',
  useNextStepOnboarding,
}));

import { SpikeReplayView } from '@/features/spike-viewer/spike-replay/spike-replay-view';

import type { TSceneSubject } from '@/features/circuit-viewer/circuit-scene';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

const POSITIONED: ColumnMeta[] = ['x', 'y', 'z'].map((name) => ({ name, kind: 'numeric' }));
const POINTS: NodePopulation = { name: 'points', type: 'brian2_point', file: 'nodes.h5' };
const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };
const VPM: NodePopulation = { name: 'VPM', type: 'virtual', file: 'vpm.h5' };

function spikes(...names: string[]): SpikeData {
  return {
    populations: names.map((name) => ({
      name,
      nodeIds: new Float64Array([1]),
      timestamps: new Float32Array([1]),
    })),
    timeRange: { min: 0, max: 10 },
    nodeIdRange: { min: 0, max: 2 },
  } as unknown as SpikeData;
}

function circuitOf(scale: string): TSceneSubject {
  return { circuit: { id: 'c1', assets: [], scale } } as unknown as TSceneSubject;
}

const LARGE = circuitOf('microcircuit');
const SMALL = circuitOf('small');

/** The props the 3D scene was last rendered with. */
function lastScene(): { populationName?: string; spikes: { data?: unknown } } {
  return fixtures.scene.mock.calls.at(-1)?.[0];
}

/** The population select above the panes: the first combobox, ahead of the transport's. */
function populationSelect(): HTMLElement {
  return screen.getAllByRole('combobox')[0];
}

/** Pick another population from that select, by keyboard as Radix allows under jsdom. */
function choose(name: string) {
  fireEvent.keyDown(populationSelect(), { key: 'Enter' });
  fireEvent.keyDown(screen.getByRole('option', { name: new RegExp(`^${name}\\b`) }), {
    key: 'Enter',
  });
}

beforeEach(() => {
  fixtures.nodes = [POINTS];
  fixtures.session = { status: 'ready', columns: POSITIONED };
  fixtures.scene.mockClear();
});

describe('SpikeReplayView', () => {
  // `brian2_point` is FlyWire's whole-brain type: no morphology, but cells all the same.
  it('replays a point-neuron population rather than calling it an input', () => {
    render(<SpikeReplayView data={spikes('points')} subject={LARGE} />);

    expect(screen.getByRole('button', { name: 'Play spike replay' })).toBeEnabled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('announces the replay once it can play', () => {
    render(<SpikeReplayView data={spikes('points')} subject={LARGE} />);

    expect(useNextStepOnboarding).toHaveBeenLastCalledWith({
      condition: true,
      tour: 'simulation-spike-replay',
    });
  });

  it('holds the announcement back when there is nothing to replay over', () => {
    render(<SpikeReplayView data={spikes('points')} />);

    expect(useNextStepOnboarding).toHaveBeenLastCalledWith({
      condition: false,
      tour: 'simulation-spike-replay',
    });
  });
});

describe('SpikeReplayView with input spikes', () => {
  beforeEach(() => {
    fixtures.nodes = [CORTEX, VPM];
  });

  it('opens on the circuit’s own cells when the spike file lists the input first', () => {
    render(<SpikeReplayView data={spikes('VPM', 'cortex')} subject={LARGE} />);

    expect(populationSelect()).toHaveTextContent('cortex');
    expect(lastScene().populationName).toBe('cortex');
  });

  it('lights an input population’s own somas on the somas-only viewer', () => {
    render(<SpikeReplayView data={spikes('VPM')} subject={LARGE} />);

    expect(screen.getByRole('button', { name: 'Play spike replay' })).toBeEnabled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(lastScene().populationName).toBe('VPM');
    expect(lastScene().spikes.data).toMatchObject({ cellIndices: new Uint32Array([1]) });
  });

  it('shows only the raster for an input population on the per-cell viewer', () => {
    render(<SpikeReplayView data={spikes('VPM')} subject={SMALL} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '3D replay of input populations isn’t available for small circuits yet.'
    );
    expect(screen.queryByRole('button', { name: 'Play spike replay' })).toBeNull();
    expect(screen.queryByRole('button', { name: '3D spike replay' })).toBeNull();
  });

  it('brings the 3D back, in the mode left, when the circuit’s cells are picked again', () => {
    render(<SpikeReplayView data={spikes('cortex', 'VPM')} subject={SMALL} />);
    fireEvent.click(screen.getByRole('button', { name: '3D spike replay' }));

    choose('VPM');
    expect(screen.queryByRole('button', { name: 'Play spike replay' })).toBeNull();
    expect(screen.queryByRole('button', { name: '3D spike replay' })).toBeNull();

    choose('cortex');
    expect(screen.getByRole('button', { name: 'Play spike replay' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '3D spike replay' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows only the raster for a population with no positions', () => {
    fixtures.session = { status: 'ready', columns: [{ name: 'model_type', kind: 'categorical' }] };
    render(<SpikeReplayView data={spikes('VPM')} subject={LARGE} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '“VPM” has no positions (x/y/z), so its spikes can’t be shown in 3D.'
    );
    expect(screen.queryByRole('button', { name: 'Play spike replay' })).toBeNull();
  });

  // A switch mid-play would otherwise pause on every download.
  it('keeps replaying while the population’s nodes are read', () => {
    fixtures.session = { status: 'loading', columns: undefined };
    render(<SpikeReplayView data={spikes('VPM')} subject={LARGE} />);

    expect(screen.getByRole('button', { name: 'Play spike replay' })).toBeEnabled();
    expect(lastScene().populationName).toBe('VPM');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows only the raster for a population whose nodes could not be read', () => {
    fixtures.session = { status: 'error', columns: undefined };
    render(<SpikeReplayView data={spikes('VPM')} subject={LARGE} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'The nodes of “VPM” could not be read, so its spikes can’t be shown in 3D.'
    );
    expect(screen.queryByRole('button', { name: 'Play spike replay' })).toBeNull();
  });

  // The scene's error panel is about the circuit's own cells, and offers a retry.
  it('leaves a population of cells whose nodes could not be read to the scene', () => {
    fixtures.session = { status: 'error', columns: undefined };
    render(<SpikeReplayView data={spikes('cortex')} subject={LARGE} />);

    expect(lastScene().populationName).toBe('cortex');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
