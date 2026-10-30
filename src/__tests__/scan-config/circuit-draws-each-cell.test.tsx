import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { circuitMorphologiesFlag } from '@/features/feature-flags/flags';
import {
  circuitDrawsEachCell,
  circuitSmallForThePack,
} from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { ModelPreview } from '@/features/scan-config/components/model-preview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { MorphologyPackStatus } from '@/api/small-scale-simulator/circuit/morphology-pack';

const h = vi.hoisted(() => ({
  flags: {} as Record<string, boolean>,
  pack: undefined as MorphologyPackStatus | null | undefined,
}));

vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/feature-flags')>()),
  useFlag: (key: string) => h.flags[key],
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
    [Single, true, true, true],
    [PairNeuron, true, false, true],
    [SmallMicrocircuit, true, false, true],
    [Microcircuit, false, false, false],
    [Region, false, false, false],
    [WholeBrain, false, false, false],
  ])('draws a %s circuit a morphology per cell: %s off the pack, %s with its pack ready, %s while it builds', (scale, off, ready, building) => {
    expect(circuitDrawsEachCell(circuitOf(scale), false, READY)).toBe(off);
    expect(circuitDrawsEachCell(circuitOf(scale), true, READY)).toBe(ready);
    expect(circuitDrawsEachCell(circuitOf(scale), true, BUILDING)).toBe(building);
  });

  it('draws a pair or small circuit a morphology per cell where Bluenaas has no pack for it', () => {
    for (const pack of [{ state: 'failed' } as const, null]) {
      expect(circuitDrawsEachCell(circuitOf(SmallMicrocircuit), true, pack)).toBe(true);
    }
  });

  it('cannot say for a pair or small circuit until Bluenaas answers', () => {
    expect(circuitDrawsEachCell(circuitOf(PairNeuron), true, undefined)).toBeUndefined();
    expect(circuitDrawsEachCell(circuitOf(Microcircuit), true, undefined)).toBe(false);
    expect(circuitDrawsEachCell(circuitOf(Single), true, undefined)).toBe(true);
  });

  it('takes pair and small circuits, and only those, for the pack in place of a morphology per cell', () => {
    const small = Object.values(CircuitScaleDictionary).filter(circuitSmallForThePack);
    expect(small).toEqual([PairNeuron, SmallMicrocircuit]);
  });
});

describe('ModelPreview', () => {
  beforeEach(() => {
    h.flags = {};
    h.pack = READY;
  });

  const preview = (scale: ICircuit['scale']) => render(<ModelPreview model={circuitOf(scale)} />);

  it.each([
    PairNeuron,
    SmallMicrocircuit,
  ])('draws a %s circuit a morphology per cell without the pack', (scale) => {
    preview(scale);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it.each([PairNeuron, SmallMicrocircuit])('draws a %s circuit from the pack with it', (scale) => {
    h.flags[circuitMorphologiesFlag.key] = true;
    preview(scale);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });

  it.each([
    PairNeuron,
    SmallMicrocircuit,
  ])('draws a %s circuit whose pack is building a morphology per cell', (scale) => {
    h.flags[circuitMorphologiesFlag.key] = true;
    h.pack = BUILDING;
    preview(scale);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it('mounts no renderer for a small circuit until Bluenaas answers', () => {
    h.flags[circuitMorphologiesFlag.key] = true;
    h.pack = undefined;
    const { rerender } = preview(SmallMicrocircuit);
    expect(screen.queryByTestId('each-cell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('large')).not.toBeInTheDocument();

    h.pack = READY;
    rerender(<ModelPreview model={circuitOf(SmallMicrocircuit)} />);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });

  it('keeps the renderer of the first answer while the circuit is on show, and answers again for another', () => {
    h.flags[circuitMorphologiesFlag.key] = true;
    h.pack = BUILDING;
    const { rerender } = preview(SmallMicrocircuit);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();

    h.pack = READY;
    rerender(<ModelPreview model={circuitOf(SmallMicrocircuit)} />);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();

    rerender(<ModelPreview model={circuitOf(SmallMicrocircuit, 'another')} />);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });

  it('keeps a single cell on its own path with the pack', () => {
    h.flags[circuitMorphologiesFlag.key] = true;
    preview(Single);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it('draws a microcircuit large without waiting for Bluenaas', () => {
    h.flags[circuitMorphologiesFlag.key] = true;
    h.pack = undefined;
    preview(Microcircuit);
    expect(screen.getByTestId('large')).toBeInTheDocument();
  });
});
