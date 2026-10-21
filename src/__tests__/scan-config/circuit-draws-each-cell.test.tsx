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

describe('circuitDrawsEachCell', () => {
  it.each([
    [Single, true, true],
    [PairNeuron, true, false],
    [SmallMicrocircuit, true, false],
    [Microcircuit, false, false],
    [Region, false, false],
    [WholeBrain, false, false],
  ])('draws a %s circuit a morphology per cell: %s without the pack, %s with it', (scale, without, withPack) => {
    expect(circuitDrawsEachCell(scale, false)).toBe(without);
    expect(circuitDrawsEachCell(scale, true)).toBe(withPack);
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

  const preview = (scale: ICircuit['scale']) =>
    render(
      <ModelPreview model={{ id: 'circuit-id', type: EntityTypeDict.Circuit, scale } as ICircuit} />
    );

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

  it('keeps a single cell on its own path with the pack', () => {
    h.flags[circuitMorphologiesFlag.key] = true;
    preview(Single);
    expect(screen.getByTestId('each-cell')).toBeInTheDocument();
  });
});
