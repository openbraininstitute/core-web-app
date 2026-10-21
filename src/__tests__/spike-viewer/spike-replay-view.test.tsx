import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// `@tolokoban/tgd` runs WebGL and WASM setup at module scope; the raster pair
// reaches for a canvas on mount. Neither runs under jsdom.
const h = vi.hoisted(() => ({
  flags: {} as Record<string, boolean>,
  scene: null as { largeCircuit?: boolean } | null,
}));
vi.mock('@/features/circuit-viewer/circuit-scene', () => ({
  CircuitScene: (props: { largeCircuit?: boolean }) => {
    h.scene = props;
    return null;
  },
}));
vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/feature-flags')>()),
  useFlag: (key: string) => h.flags[key],
}));
vi.mock('@/features/spike-viewer/components/raster-plot', () => ({ default: () => null }));
vi.mock('@/features/spike-viewer/components/raster-plot-controls', () => ({ default: () => null }));
// The nodes session behind the raster's axis span reads the workspace off the route.
vi.mock('next/navigation', () => ({ useParams: () => ({}) }));
vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: { nodes: [{ name: 'points', type: 'brian2_point', file: 'nodes.h5' }] },
    asset: undefined,
    isLoading: false,
    error: null,
  }),
}));
// The tour needs the app's NextStep provider and the signed-in user's onboarding status.
const { useNextStepOnboarding } = vi.hoisted(() => ({ useNextStepOnboarding: vi.fn() }));
vi.mock('@/ui/segments/app-setup/discover-app', () => ({
  spikeReplayTour: 'simulation-spike-replay',
  useNextStepOnboarding,
}));

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { circuitMorphologiesFlag } from '@/features/feature-flags/flags';
import { SpikeReplayView } from '@/features/spike-viewer/spike-replay/spike-replay-view';

import type { TSceneSubject } from '@/features/circuit-viewer/circuit-scene';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

const data = {
  populations: [
    { name: 'points', nodeIds: new Float64Array([1]), timestamps: new Float32Array([1]) },
  ],
  timeRange: { min: 0, max: 10 },
  nodeIdRange: { min: 0, max: 2 },
} as unknown as SpikeData;

const subject = { circuit: { id: 'c1', assets: [] } } as unknown as TSceneSubject;

describe('SpikeReplayView', () => {
  // `brian2_point` is FlyWire's whole-brain type: no morphology, but cells all the same.
  it('replays a point-neuron population rather than calling it an input', () => {
    render(<SpikeReplayView data={data} subject={subject} />);

    expect(screen.getByRole('button', { name: 'Play spike replay' })).toBeEnabled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('announces the replay once it can play', () => {
    render(<SpikeReplayView data={data} subject={subject} />);

    expect(useNextStepOnboarding).toHaveBeenLastCalledWith({
      condition: true,
      tour: 'simulation-spike-replay',
    });
  });

  it.each([
    [false, false],
    [true, true],
  ])('replays over a small microcircuit from the pack only with it (%s)', (pack, large) => {
    h.flags = { [circuitMorphologiesFlag.key]: pack };
    h.scene = null;
    const small = {
      circuit: { id: 'c1', assets: [], scale: CircuitScaleDictionary.SmallMicrocircuit },
    } as unknown as TSceneSubject;
    render(<SpikeReplayView data={data} subject={small} />);

    expect(h.scene).toMatchObject({ largeCircuit: large });
  });

  it('holds the announcement back when there is nothing to replay over', () => {
    render(<SpikeReplayView data={data} />);

    expect(useNextStepOnboarding).toHaveBeenLastCalledWith({
      condition: false,
      tour: 'simulation-spike-replay',
    });
  });
});
