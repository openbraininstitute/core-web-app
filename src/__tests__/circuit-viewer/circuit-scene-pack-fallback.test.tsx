import { act, render, screen } from '@testing-library/react';
import chroma from 'chroma-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { circuitMorphologiesFlag } from '@/features/feature-flags/flags';
import { NEUTRAL_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { MorphologyPackStatus } from '@/api/small-scale-simulator/circuit/morphology-pack';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { LargeCircuitPreviewProps } from '@/features/scan-config/components/model-preview/large-circuit-preview/large-circuit-preview';

const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };

const h = vi.hoisted(() => ({
  large: null as LargeCircuitPreviewProps | null,
  eachCell: null as { showAxons?: boolean } | null,
  menu: null as {
    showAxons?: boolean;
    onToggleAxons?: (value: boolean) => void;
    showMorphologies?: boolean;
    onToggleMorphologies?: (value: boolean) => void;
    morphologiesNote?: string;
  } | null,
  /** Each circuit's pack as Bluenaas has it, ready where not said. */
  packs: {} as Record<string, MorphologyPackStatus | null | undefined>,
  polled: [] as { id: string; poll?: boolean }[],
}));

vi.mock(
  '@/features/circuit-viewer/morphologies/use-morphology-pack-status',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/features/circuit-viewer/morphologies/use-morphology-pack-status')
    >()),
    useMorphologyPackStatus: (
      circuit: { id: string } | undefined,
      { poll }: { poll?: boolean } = {}
    ) => {
      if (!circuit) return null;
      h.polled.push({ id: circuit.id, poll });
      return circuit.id in h.packs ? h.packs[circuit.id] : READY;
    },
  })
);

vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/feature-flags')>()),
  useFlag: (key: string) => key === circuitMorphologiesFlag.key,
}));

vi.mock('@/features/scan-config/components/model-preview/large-circuit-preview', () => ({
  LargeCircuitPreview: (props: LargeCircuitPreviewProps) => {
    h.large = props;
    return <div data-testid="large" />;
  },
}));

vi.mock('@/features/scan-config/components/circuit-viz/circuit-viz', () => ({
  CircuitVisualization: (props: { showAxons?: boolean }) => {
    h.eachCell = props;
    return <div data-testid="each-cell" />;
  },
  MemodelVisualization: () => null,
}));

vi.mock('@/features/scan-config/components/color-by/circuit-viewer-chrome', () => ({
  STATUS_PLACE: {},
  CircuitViewerChrome: ({
    viz,
    legendSlotRef,
  }: {
    viz: { menu: typeof h.menu; colorBy?: unknown };
    legendSlotRef: (element: HTMLElement | null) => void;
  }) => {
    h.menu = viz.menu;
    return viz.colorBy ? <div data-testid="legend-slot" ref={legendSlotRef} /> : null;
  },
}));

vi.mock('@/features/circuit-nodes', () => ({ CircuitNodesTable: () => null }));

vi.mock('@/features/scan-config/components/model-preview/use-electrode-overlays', () => ({
  electrodeBlockPath: () => '',
  useElectrodeOverlays: () => ({
    overlays: [],
    available: false,
    draggableOverlayIds: new Set(),
    overlayIdByBlockPath: new Map(),
  }),
}));

vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({ config: { nodes: [CORTEX], edges: [], raw: {} } }),
}));

vi.mock('@/features/scan-config/components/shared/3d-viewer', () => ({
  downloadCircuitImage: () => {},
}));

vi.mock('@/features/scan-config/components/color-by/use-node-color-mapping', () => ({
  useNodeColorMapping: () => ({
    mapping: null,
    columns: [],
    loading: false,
    status: 'ready',
    retry: () => {},
  }),
}));

const READY: MorphologyPackStatus = { state: 'ready', size: 1234, sha256: 'ab12' };

const circuitOf = (id: string, scale: ICircuit['scale']) =>
  ({ id, name: id, scale }) as unknown as ICircuit;

describe('CircuitScene, for a host with a colour scale of its own', () => {
  const micro = circuitOf('micro', CircuitScaleDictionary.Microcircuit);

  it('puts its key under the colour-by key', () => {
    render(<CircuitScene circuit={micro} largeCircuit legend={<span>the key</span>} />);
    expect(screen.getByTestId('legend-slot')).toContainElement(screen.getByText('the key'));
  });

  it('puts its key in the corner where there is no colour-by', () => {
    render(
      <CircuitScene
        circuit={micro}
        largeCircuit
        features={{ colorBy: false }}
        legend={<span>the key</span>}
      />
    );
    expect(screen.queryByTestId('legend-slot')).toBeNull();
    expect(screen.getByText('the key').parentElement?.className).toContain('right-3');
  });

  it('draws cells coloured by no property in its colour, and blue for any other host', () => {
    render(<CircuitScene circuit={micro} largeCircuit uncolouredCells={NEUTRAL_NEURON_COLOR} />);
    expect(h.large?.defaultColor).toBe(NEUTRAL_NEURON_COLOR);
    expect(chroma(NEUTRAL_NEURON_COLOR).get('hsl.s')).toBeLessThan(0.1);
    expect(h.large?.blueRamp).toBe(false);

    render(<CircuitScene circuit={micro} largeCircuit />);
    expect(chroma(h.large?.defaultColor ?? '').get('hsl.s')).toBeGreaterThan(0.5);
    expect(h.large?.blueRamp).toBe(true);
  });
});

describe('CircuitScene on the pack', () => {
  beforeEach(() => {
    h.large = null;
    h.eachCell = null;
    h.menu = null;
    h.packs = {};
    h.polled = [];
  });

  it('opens a pair circuit on its morphologies, their axons hidden as each cell has them, and shows them where told', () => {
    render(
      <CircuitScene circuit={circuitOf('pair', CircuitScaleDictionary.PairNeuron)} largeCircuit />
    );

    expect(h.large?.representation).toBe('morphologies');
    expect(h.large?.followMorphologies).toBe(true);
    expect(h.large?.pack).toEqual(READY);
    expect(h.polled.every(({ poll }) => poll === false)).toBe(true);
    expect(h.menu?.showMorphologies).toBe(true);
    expect(h.menu?.showAxons).toBe(false);
    expect(h.large?.showAxons).toBe(false);

    act(() => h.menu?.onToggleAxons?.(true));
    expect(h.large?.showAxons).toBe(true);
  });

  it('opens a microcircuit on its somas, its morphologies drawn without their axons till told, and goes back to the somas where the pack cannot be had', () => {
    render(
      <CircuitScene
        circuit={circuitOf('micro', CircuitScaleDictionary.Microcircuit)}
        largeCircuit
      />
    );

    expect(h.large?.representation).toBe('somas');
    expect(h.large?.followMorphologies).toBe(false);
    // Nothing to hide on the somas.
    expect(h.menu?.showAxons).toBeUndefined();

    act(() => h.menu?.onToggleMorphologies?.(true));
    expect(h.menu?.showAxons).toBe(false);
    expect(h.large?.showAxons).toBe(false);

    act(() => h.menu?.onToggleAxons?.(true));
    expect(h.large?.showAxons).toBe(true);

    act(() => h.large?.onMorphologiesStopped?.());
    expect(screen.getByTestId('large')).toBeInTheDocument();
    expect(h.large?.representation).toBe('somas');
  });

  it('draws a small microcircuit a morphology per cell where the pack cannot be had, with the axons toggle', () => {
    render(
      <CircuitScene
        circuit={circuitOf('small', CircuitScaleDictionary.SmallMicrocircuit)}
        largeCircuit
      />
    );

    act(() => h.large?.onMorphologiesStopped?.());

    expect(screen.queryByTestId('large')).toBeNull();
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
    expect(h.menu?.showAxons).toBe(false);
    expect(h.menu?.showMorphologies).toBeUndefined();
  });

  it('offers no morphologies for a microcircuit Bluenaas is not asked about, its somas alone drawn', () => {
    h.packs.micro = null;
    render(
      <CircuitScene
        circuit={circuitOf('micro', CircuitScaleDictionary.Microcircuit)}
        largeCircuit
      />
    );

    expect(h.large?.representation).toBe('somas');
    expect(h.large?.pack).toBeNull();
    expect(h.menu?.showMorphologies).toBeUndefined();
    expect(h.menu?.onToggleMorphologies).toBeUndefined();
    expect(h.menu?.morphologiesNote).toBeUndefined();
  });

  it.each([
    [{ state: 'building' } as const, 'Preparing morphologies, this takes a few minutes'],
    [{ state: 'failed' } as const, "Couldn't prepare morphologies"],
    [{ state: 'refused', reason: 'too_large' } as const, 'Not available for a circuit this large'],
    [{ state: 'refused', reason: 'no_morphologies' } as const, 'No morphologies to show'],
  ])('says why a microcircuit cannot be switched to its morphologies where its pack is %o', (status, note) => {
    h.packs.micro = status;
    render(
      <CircuitScene
        circuit={circuitOf('micro', CircuitScaleDictionary.Microcircuit)}
        largeCircuit
      />
    );

    expect(h.large?.representation).toBe('somas');
    expect(h.large?.pack).toBeNull();
    expect(h.menu?.onToggleMorphologies).toBeUndefined();
    expect(h.menu?.morphologiesNote).toBe(note);
  });

  it('asks again while the pack of a microcircuit builds, and offers the morphologies off once it is ready', () => {
    h.packs.micro = { state: 'building' };
    const circuit = circuitOf('micro', CircuitScaleDictionary.Microcircuit);
    const { rerender } = render(<CircuitScene circuit={circuit} largeCircuit />);
    expect(h.polled.at(-1)).toEqual({ id: 'micro', poll: true });

    h.packs.micro = READY;
    rerender(<CircuitScene circuit={circuit} largeCircuit />);

    expect(h.menu?.morphologiesNote).toBeUndefined();
    expect(h.menu?.showMorphologies).toBe(false);
    expect(h.large?.representation).toBe('somas');
    expect(h.large?.pack).toEqual(READY);
  });

  it('tries the pack again for the next circuit', () => {
    const { rerender } = render(
      <CircuitScene circuit={circuitOf('one', CircuitScaleDictionary.PairNeuron)} largeCircuit />
    );
    act(() => h.large?.onMorphologiesStopped?.());
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();

    rerender(
      <CircuitScene circuit={circuitOf('two', CircuitScaleDictionary.PairNeuron)} largeCircuit />
    );

    expect(screen.getByTestId('large')).toBeInTheDocument();
    expect(h.large?.representation).toBe('morphologies');
  });
});
