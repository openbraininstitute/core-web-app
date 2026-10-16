import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  levels: [{ toleranceUm: 0.25, boxes: 4 }],
  leftOut: 0,
  culled: { tested: 9571, kept: 8908, drawn: 8894 },
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

describe('the detail readout', () => {
  it('on WebGPU, says what the culling counted and switches it off', () => {
    const viewer = readout('webgpu');
    expect(screen.getByTestId('culled').textContent).toBe(
      'Culled: 9,571 tested, 8,908 kept, 8,894 drawn'
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

  it("offers each tier's budgets, its own first chosen", () => {
    const options = () =>
      [...screen.getByRole('combobox', { name: 'Budget' }).querySelectorAll('option')].map(
        (option) => option.textContent
      );
    const gpu = readout('webgpu', { ...DETAIL, budget: 8_000_000 });
    expect(options()).toEqual(['12,000,000', '8,000,000', '4,000,000']);
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Budget' }).value).toBe(
      '8000000'
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Budget' }), {
      target: { value: '12000000' },
    });
    expect(gpu.setDetailRules).toHaveBeenCalledExactlyOnceWith({ budget: 12_000_000 });
    cleanup();

    readout('webgl');
    expect(options()).toEqual(['2,000,000', '1,000,000', '500,000', '200,000', '100,000']);
  });
});
