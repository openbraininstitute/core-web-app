import { render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import {
  circuitDrawsEachCell,
  circuitSmallForThePack,
  useCircuitDrawsEachCell,
} from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { ModelPreview } from '@/features/scan-config/components/model-preview';
import { PER_NEURON_EXPLICIT_BLOCK_TYPE } from '@/features/scan-config/components/model-preview/morphology-locations-block';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { MorphologyPackStatus } from '@/api/small-scale-simulator/circuit/morphology-pack';

const h = vi.hoisted(() => ({
  pack: undefined as MorphologyPackStatus | null | undefined,
}));

vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/feature-flags')>()),
  useFlag: () => false,
}));

vi.mock('@/features/circuit-viewer/morphologies/use-morphology-pack-status', () => ({
  useMorphologyPackStatus: (circuit: unknown) => (circuit ? h.pack : null),
}));

vi.mock('@/features/scan-config/components/model-preview/circuit-preview', () => ({
  CircuitPreview: ({ largeCircuit }: { largeCircuit?: boolean }) => (
    <div data-testid={largeCircuit ? 'large' : 'each-cell'} />
  ),
}));

const { Single, PairNeuron, SmallMicrocircuit, Microcircuit, Region, WholeBrain } =
  CircuitScaleDictionary;

const READY: MorphologyPackStatus = { state: 'ready', size: 1234, sha256: 'ab12' };
const BUILDING: MorphologyPackStatus = { state: 'building' };

const circuitOf = (scale: ICircuit['scale'], id = 'circuit-id') =>
  ({ id, type: EntityTypeDict.Circuit, scale }) as unknown as ICircuit;

describe('circuitDrawsEachCell', () => {
  it.each([
    [Single, true, true],
    [PairNeuron, false, true],
    [SmallMicrocircuit, false, true],
    [Microcircuit, false, false],
    [Region, false, false],
    [WholeBrain, false, false],
  ])('draws a %s circuit a morphology per cell: %s with its pack ready, %s while it builds', (scale, ready, building) => {
    expect(circuitDrawsEachCell(circuitOf(scale), READY)).toBe(ready);
    expect(circuitDrawsEachCell(circuitOf(scale), BUILDING)).toBe(building);
  });

  it('draws a pair or small circuit a morphology per cell where Bluenaas has no pack for it', () => {
    for (const pack of [{ state: 'failed' } as const, null]) {
      expect(circuitDrawsEachCell(circuitOf(SmallMicrocircuit), pack)).toBe(true);
    }
  });

  it('cannot say for a pair or small circuit until Bluenaas answers', () => {
    expect(circuitDrawsEachCell(circuitOf(PairNeuron), undefined)).toBeUndefined();
    expect(circuitDrawsEachCell(circuitOf(Microcircuit), undefined)).toBe(false);
    expect(circuitDrawsEachCell(circuitOf(Single), undefined)).toBe(true);
  });

  it('takes pair and small circuits, and only those, for the pack in place of a morphology per cell', () => {
    const small = Object.values(CircuitScaleDictionary).filter(circuitSmallForThePack);
    expect(small).toEqual([PairNeuron, SmallMicrocircuit]);
  });
});

describe('ModelPreview', () => {
  beforeEach(() => {
    h.pack = READY;
  });

  const preview = (scale: ICircuit['scale']) => render(<ModelPreview model={circuitOf(scale)} />);

  it.each([
    PairNeuron,
    SmallMicrocircuit,
  ])('draws a %s circuit from its pack where it is ready', (scale) => {
    preview(scale);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });

  it.each([
    PairNeuron,
    SmallMicrocircuit,
  ])('draws a %s circuit whose pack is building a morphology per cell', (scale) => {
    h.pack = BUILDING;
    preview(scale);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it('mounts no renderer for a small circuit until Bluenaas answers', () => {
    h.pack = undefined;
    const { rerender } = preview(SmallMicrocircuit);
    expect(screen.queryByTestId('each-cell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('large')).not.toBeInTheDocument();

    h.pack = READY;
    rerender(<ModelPreview model={circuitOf(SmallMicrocircuit)} />);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });

  it('keeps the renderer of the first answer while the circuit is on show, and answers again for another', () => {
    h.pack = BUILDING;
    const { rerender } = preview(SmallMicrocircuit);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();

    h.pack = READY;
    rerender(<ModelPreview model={circuitOf(SmallMicrocircuit)} />);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();

    rerender(<ModelPreview model={circuitOf(SmallMicrocircuit, 'another')} />);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });

  it('draws a small circuit a morphology per cell where Bluenaas has no pack for it', () => {
    h.pack = { state: 'failed' };
    preview(SmallMicrocircuit);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it.each([
    PairNeuron,
    SmallMicrocircuit,
  ])('draws a %s circuit a morphology per cell, its pack ready, where the workflow takes per-neuron locations', (scale) => {
    const form = { locationBlockTypes: [PER_NEURON_EXPLICIT_BLOCK_TYPE] };
    render(<ModelPreview model={circuitOf(scale)} form={form} />);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it('draws a small circuit from its pack where the workflow takes no locations', () => {
    render(<ModelPreview model={circuitOf(SmallMicrocircuit)} form={{ locationBlockTypes: [] }} />);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });

  it('keeps a single cell on its own path with the pack', () => {
    preview(Single);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it('draws a microcircuit large without waiting for Bluenaas', () => {
    h.pack = undefined;
    preview(Microcircuit);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });
});

describe('useCircuitDrawsEachCell', () => {
  beforeEach(() => {
    h.pack = READY;
  });

  it('draws a small circuit per cell once locations need section ids, over the answer kept', () => {
    const circuit = circuitOf(SmallMicrocircuit);
    const { result, rerender } = renderHook(
      ({ needsSectionIds }) => useCircuitDrawsEachCell(circuit, needsSectionIds),
      { initialProps: { needsSectionIds: false } }
    );
    expect(result.current).toBe(false);

    rerender({ needsSectionIds: true });
    expect(result.current).toBe(true);
  });

  it('keeps a microcircuit large whatever locations it has', () => {
    const { result } = renderHook(() => useCircuitDrawsEachCell(circuitOf(Microcircuit), true));
    expect(result.current).toBe(false);
  });
});
