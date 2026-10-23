import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { AssetLabel, AssetStatus } from '@/api/entitycore/types/shared/global';
import { circuitMorphologiesFlag } from '@/features/feature-flags/flags';
import {
  circuitDrawsEachCell,
  circuitSmallForThePack,
} from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { ModelPreview } from '@/features/scan-config/components/model-preview';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

const h = vi.hoisted(() => ({ flags: {} as Record<string, boolean> }));

vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/feature-flags')>()),
  useFlag: (key: string) => h.flags[key],
}));

vi.mock('@/features/scan-config/components/model-preview/circuit-preview', () => ({
  CircuitPreview: ({ largeCircuit }: { largeCircuit?: boolean }) => (
    <div data-testid={largeCircuit ? 'large' : 'each-cell'} />
  ),
}));

const { Single, PairNeuron, SmallMicrocircuit, Microcircuit, Region, WholeBrain } =
  CircuitScaleDictionary;

const PACK = {
  id: 'pack',
  label: AssetLabel.circuit_morphology_pack,
  is_directory: false,
  status: AssetStatus.CREATED,
  size: 1234,
  sha256_digest: null,
};

/** A circuit with its stored pack, unless `withPack` is false. */
const circuitOf = (scale: ICircuit['scale'], withPack = true) =>
  ({
    id: 'circuit-id',
    type: EntityTypeDict.Circuit,
    scale,
    assets: withPack ? [PACK] : [],
  }) as unknown as ICircuit;

describe('circuitDrawsEachCell', () => {
  it.each([
    [Single, true, true, true],
    [PairNeuron, true, false, true],
    [SmallMicrocircuit, true, false, true],
    [Microcircuit, false, false, false],
    [Region, false, false, false],
    [WholeBrain, false, false, false],
  ])('draws a %s circuit a morphology per cell: %s off the pack, %s with its pack, %s without one', (scale, off, withPack, without) => {
    expect(circuitDrawsEachCell(circuitOf(scale), false)).toBe(off);
    expect(circuitDrawsEachCell(circuitOf(scale), true)).toBe(withPack);
    expect(circuitDrawsEachCell(circuitOf(scale, false), true)).toBe(without);
  });

  it('takes pair and small circuits, and only those, for the pack in place of a morphology per cell', () => {
    const small = Object.values(CircuitScaleDictionary).filter(circuitSmallForThePack);
    expect(small).toEqual([PairNeuron, SmallMicrocircuit]);
  });
});

describe('ModelPreview', () => {
  beforeEach(() => {
    h.flags = {};
  });

  const preview = (scale: ICircuit['scale'], withPack = true) =>
    render(<ModelPreview model={circuitOf(scale, withPack)} />);

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
  ])('draws a %s circuit without a stored pack a morphology per cell', (scale) => {
    h.flags[circuitMorphologiesFlag.key] = true;
    preview(scale, false);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });

  it('keeps a single cell on its own path with the pack', () => {
    h.flags[circuitMorphologiesFlag.key] = true;
    preview(Single);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });
});
