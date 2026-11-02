import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DetailReadout } from '@/features/circuit-viewer/morphologies/detail-readout';
import { viewerTheme } from '@/features/scan-config/components/color-by/contrast';

import type { Tier } from '@/features/circuit-viewer/morphologies/engine/create-view';
import type {
  CircuitMorphologyView,
  DetailStats,
} from '@/features/circuit-viewer/morphologies/types';

const DETAIL: DetailStats = {
  budget: 2_000_000,
  pixels: 2,
  culling: true,
  drawn: 1200,
  wanted: 1200,
  room: 1280,
  base: false,
  levels: [{ toleranceUm: 0.25, boxes: 4 }],
  leftOut: 0,
  floor: -1,
  culled: { tested: 9571, kept: 8908, drawn: 8894, boxes: 12 },
};

function readout(tier: Tier, detail: DetailStats = DETAIL) {
  const viewer = {
    onDetail: (listener: (detail: DetailStats | null) => void) => {
      listener(detail);
      return () => {};
    },
    setDetailRules: vi.fn(),
  };
  render(
    <DetailReadout
      viewer={viewer as unknown as CircuitMorphologyView}
      theme={viewerTheme(false)}
      renderer={{ tier, reason: null, choice: 'auto', onChoice: vi.fn() }}
    />
  );
  return viewer;
}

const budget = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Budget' });
const options = () => [...budget().querySelectorAll('option')].map((option) => option.textContent);

describe('the detail readout', () => {
  it('on WebGPU, says what the culling counted and switches it off', () => {
    const viewer = readout('webgpu');
    expect(screen.getByTestId('culled').textContent).toBe(
      'Culled: 9,571 tested, 8,908 kept, 8,894 drawn; 12 boxes seen'
    );
    const culling = screen.getByRole('combobox', { name: 'Culling' });
    expect((culling as HTMLSelectElement).value).toBe('on');
    fireEvent.change(culling, { target: { value: 'off' } });
    expect(viewer.setDetailRules).toHaveBeenCalledExactlyOnceWith({ culling: false });
  });

  it('on WebGL 2, has no culling to switch and nothing it counted', () => {
    readout('webgl', { ...DETAIL, culled: null });
    expect(screen.queryByRole('combobox', { name: 'Culling' })).toBeNull();
    expect(screen.queryByTestId('culled')).toBeNull();
  });

  it.each([
    ['WebGL 2', 'webgl', true, '1,200 segments drawn of 1,200 wanted'],
    ['WebGPU with the culling off', 'webgpu', false, '1,200 segments drawn of 1,200 wanted'],
    // Before the culling's first read too.
    ['WebGPU culling', 'webgpu', true, '1,200 segments resident of 1,200 wanted'],
  ] as const)('on %s, says what is drawn as it draws it', (_case, tier, culling, said) => {
    readout(tier, { ...DETAIL, culling, culled: null });
    expect(screen.getByTestId('detail-readout').textContent).toContain(said);
  });

  it.each([
    [
      'the finer levels alone beside a base',
      { budget: 4_000_000, room: 3_912_384, base: true },
      'Budget taken: 3,912,384 of 4,000,000 by the levels finer than the base, in blocks of 64',
    ],
    [
      'how far over it they are where the boxes are left out',
      { room: 2_400_064, leftOut: 7 },
      'Budget taken: 2,400,064 of 2,000,000, in blocks of 64',
    ],
  ])('says what the levels take of the budget: %s', (_case, patch, said) => {
    readout('webgl', { ...DETAIL, ...patch });
    expect(screen.getByTestId('room').textContent).toBe(said);
  });

  describe('of the level every box is drawn at the least', () => {
    const LEVELS = [
      { toleranceUm: 0.125, boxes: 3 },
      { toleranceUm: 0.25, boxes: 4 },
      { toleranceUm: 1, boxes: 0 },
    ];
    const pixels = () => screen.getByRole('combobox', { name: 'Tolerance within' });

    it('where there is none, says nothing and has the pixels to set', () => {
      readout('webgpu', { ...DETAIL, levels: LEVELS });
      expect(screen.queryByTestId('floor')).toBeNull();
      expect(pixels()).toBeEnabled();
    });

    it('says which, with the pixels to set where they may take a box finer', () => {
      readout('webgpu', { ...DETAIL, levels: LEVELS, floor: 1 });
      expect(screen.getByTestId('floor').textContent).toBe(
        'Every box at least at 0.25 µm, which fits the budget whole'
      );
      expect(pixels()).toBeEnabled();
    });

    it('at the finest, has no pixels to set', () => {
      readout('webgpu', { ...DETAIL, levels: LEVELS, floor: 0 });
      expect(screen.getByTestId('floor').textContent).toBe(
        'Every box at least at 0.125 µm, which fits the budget whole'
      );
      expect(pixels()).toBeDisabled();
    });
  });

  it('on WebGPU, offers its own budgets, its default chosen, and a larger one', () => {
    const viewer = readout('webgpu', { ...DETAIL, budget: 4_000_000 });
    expect(options()).toEqual(['8,000,000', '4,000,000', '2,000,000']);
    expect(budget().value).toBe('4000000');
    fireEvent.change(budget(), { target: { value: '8000000' } });
    expect(viewer.setDetailRules).toHaveBeenCalledExactlyOnceWith({ budget: 8_000_000 });
  });

  it('on WebGL 2, offers its own budgets, none larger than its default', () => {
    readout('webgl');
    expect(options()).toEqual(['2,000,000', '1,000,000', '500,000', '200,000', '100,000']);
    expect(budget().value).toBe('2000000');
  });
});
