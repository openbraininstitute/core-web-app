import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitDebug } from '@/features/circuit-viewer/morphologies/debug/circuit-debug';
import { viewerTheme } from '@/features/scan-config/components/color-by/contrast';

import type { ComponentProps } from 'react';
import type { CreatedView, Tier } from '@/features/circuit-viewer/morphologies/engine/create-view';
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

let target: HTMLElement;

beforeEach(() => {
  target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => target.remove());

function created(tier: Tier, detail: DetailStats | null) {
  const view = {
    onDetail: (listener: (detail: DetailStats | null) => void) => {
      listener(detail);
      return () => {};
    },
    setDetailRules: vi.fn(),
  };
  return {
    view,
    created: {
      view: view as unknown as CircuitMorphologyView,
      tier,
      reason: null,
      fallback: null,
    } satisfies CreatedView,
  };
}

function debug(
  tier: Tier,
  detail: DetailStats | null = DETAIL,
  props: Partial<ComponentProps<typeof CircuitDebug>> = {}
) {
  const made = created(tier, detail);
  const element = (
    <CircuitDebug
      target={target}
      created={made.created}
      choice="auto"
      onChoice={vi.fn()}
      cells={12_000}
      load={undefined}
      theme={viewerTheme(false)}
      {...props}
    />
  );
  render(element);
  return made.view;
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Debug' }));

/** With the menu open, the strip kept over the view. */
function readout(tier: Tier, detail: DetailStats = DETAIL) {
  debug(tier, detail);
  openMenu();
  fireEvent.click(screen.getByRole('switch', { name: 'Readout' }));
}

const budgetTexts = () =>
  screen
    .getAllByRole('button', { name: /^At most / })
    .map((button) => button.getAttribute('aria-label'));

describe('the circuit Debug menu', () => {
  it('puts its button where it is told', () => {
    debug('webgpu');
    expect(target).toContainElement(screen.getByRole('button', { name: 'Debug' }));
  });

  it('says what draws the view, and asks for the renderer chosen', () => {
    const onChoice = vi.fn();
    debug('webgl', DETAIL, {
      created: {
        ...created('webgl', DETAIL).created,
        reason: 'no WebGPU in this browser',
      },
      onChoice,
    });
    openMenu();
    expect(screen.getByText('Drawn with WebGL 2: no WebGPU in this browser')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Always WebGL 2' }));
    expect(onChoice).toHaveBeenCalledExactlyOnceWith('webgl');
  });

  it('with no view, says so and has only the renderer and the readout to set', () => {
    debug('webgpu', null, { created: null });
    openMenu();
    expect(screen.getByText('No view at the moment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Always WebGL 2' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Readout' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^At most / })).toBeNull();
  });

  it('with somas alone, has nothing of the detail', () => {
    debug('webgpu', null);
    openMenu();
    expect(screen.getByText('Drawn with WebGPU')).toBeInTheDocument();
    expect(screen.queryByText('Detail')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Culling' })).toBeNull();
  });

  it.each([
    ['no pack', { pack: null, load: { status: 'idle' }, stopped: null }, 'No pack ready'],
    [
      'a pack not loading',
      { pack: { size: 80_650_000, sha256: 'a' }, load: { status: 'idle' }, stopped: null },
      'Pack: 80.7 MB, not loading',
    ],
    [
      'a pack on its way',
      {
        pack: { size: 80_650_000, sha256: 'a' },
        load: { status: 'loading', received: 1_500_000, total: 80_650_000 },
        stopped: null,
      },
      'Pack: 80.7 MB, 1.5 MB received',
    ],
    [
      'a pack on show, the rest coming',
      {
        pack: { size: 80_650_000, sha256: 'a' },
        load: {
          status: 'ready',
          data: {},
          coming: { received: 2_000_000, total: 80_650_000 },
        },
        stopped: null,
      },
      'Pack: 80.7 MB, 2.0 MB received',
    ],
    [
      'a pack all in',
      {
        pack: { size: 80_650_000, sha256: 'a' },
        load: { status: 'ready', data: {} },
        stopped: null,
      },
      'Pack: 80.7 MB, all in',
    ],
    [
      'a pack that failed',
      { pack: { size: 80_650_000, sha256: 'a' }, load: { status: 'idle' }, stopped: 'failed' },
      'Pack: 80.7 MB, the load failed',
    ],
    [
      'a pack cut off, what came kept',
      {
        pack: { size: 80_650_000, sha256: 'a' },
        load: {
          status: 'ready',
          data: {},
          coming: { received: 2_000_000, total: 80_650_000 },
        },
        stopped: 'cut',
      },
      'Pack: 80.7 MB, the rest did not come in',
    ],
    ['a morphology per cell', { loaded: 3, failed: 0, total: 5 }, 'Morphologies: 3 of 5 loaded'],
    [
      'a morphology per cell, some failed',
      { loaded: 5, failed: 2, total: 5 },
      'Morphologies: 5 of 5 loaded, 2 failed',
    ],
  ])('tells how the morphologies come in: %s', (_case, load, said) => {
    debug('webgpu', null, { load: load as ComponentProps<typeof CircuitDebug>['load'] });
    openMenu();
    expect(screen.getByText('12,000 cells placed')).toBeInTheDocument();
    expect(screen.getByText(said)).toBeInTheDocument();
  });

  it('on WebGPU, says what the culling counted and switches it off', () => {
    const view = debug('webgpu');
    openMenu();
    expect(
      screen.getByText('Culled: 9,571 tested, 8,908 kept, 8,894 drawn; 12 boxes seen')
    ).toBeInTheDocument();
    const culling = screen.getByRole('switch', { name: 'Culling' });
    expect(culling).toBeChecked();
    fireEvent.click(culling);
    expect(view.setDetailRules).toHaveBeenCalledExactlyOnceWith({ culling: false });
  });

  it('on WebGL 2, has no culling to switch and nothing it counted', () => {
    debug('webgl', { ...DETAIL, culled: null });
    openMenu();
    expect(screen.queryByRole('switch', { name: 'Culling' })).toBeNull();
    expect(screen.queryByText(/^Culled:/)).toBeNull();
  });

  it('on WebGPU, offers its own budgets, its default chosen, and a larger one', () => {
    const view = debug('webgpu', { ...DETAIL, budget: 4_000_000 });
    openMenu();
    expect(budgetTexts()).toEqual([
      'At most 8,000,000 segments',
      'At most 4,000,000 segments',
      'At most 2,000,000 segments',
    ]);
    expect(screen.getByRole('button', { name: 'At most 4,000,000 segments' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'At most 8,000,000 segments' }));
    expect(view.setDetailRules).toHaveBeenCalledExactlyOnceWith({ budget: 8_000_000 });
  });

  it('on WebGL 2, offers its own budgets, none larger than its default', () => {
    debug('webgl');
    openMenu();
    expect(budgetTexts()).toEqual([
      'At most 2,000,000 segments',
      'At most 1,000,000 segments',
      'At most 500,000 segments',
      'At most 200,000 segments',
      'At most 100,000 segments',
    ]);
    expect(screen.getByRole('button', { name: 'At most 2,000,000 segments' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  describe('of the level every box is drawn at the least', () => {
    const LEVELS = [
      { toleranceUm: 0.125, boxes: 3 },
      { toleranceUm: 0.25, boxes: 4 },
      { toleranceUm: 1, boxes: 0 },
    ];
    const pixels = () => screen.getByRole('button', { name: 'A tolerance within 4 device pixels' });

    it('where there is none, says nothing and has the pixels to set', () => {
      const view = debug('webgpu', { ...DETAIL, levels: LEVELS });
      openMenu();
      expect(screen.queryByText(/^Every box/)).toBeNull();
      fireEvent.click(pixels());
      expect(view.setDetailRules).toHaveBeenCalledExactlyOnceWith({ pixels: 4 });
    });

    it('says which, with the pixels to set where they may take a box finer', () => {
      debug('webgpu', { ...DETAIL, levels: LEVELS, floor: 1 });
      openMenu();
      expect(
        screen.getByText('Every box at least at 0.25 µm, which fits the budget whole')
      ).toBeInTheDocument();
      expect(pixels()).toBeEnabled();
    });

    it('at the finest, has no pixels to set', () => {
      debug('webgpu', { ...DETAIL, levels: LEVELS, floor: 0 });
      openMenu();
      expect(
        screen.getByText('Every box at least at 0.125 µm, which fits the budget whole')
      ).toBeInTheDocument();
      expect(pixels()).toBeDisabled();
    });
  });
});

describe('the readout over the view', () => {
  const strip = () => within(screen.getByTestId('detail-readout'));

  it('is off until asked for, and takes no pointer from the view', () => {
    debug('webgpu');
    openMenu();
    expect(screen.queryByTestId('detail-readout')).toBeNull();

    fireEvent.click(screen.getByRole('switch', { name: 'Readout' }));
    expect(screen.getByTestId('detail-readout')).toHaveClass('pointer-events-none');
    expect(target).not.toContainElement(screen.getByTestId('detail-readout'));
  });

  it('stays once the menu closes', () => {
    readout('webgpu');
    fireEvent.click(screen.getByRole('button', { name: 'Close debug' }));
    expect(screen.queryByRole('switch', { name: 'Readout' })).toBeNull();
    expect(screen.getByTestId('detail-readout')).toBeInTheDocument();
  });

  it.each([
    ['WebGL 2', 'webgl', true, '1,200 segments drawn of 1,200 wanted'],
    ['WebGPU with the culling off', 'webgpu', false, '1,200 segments drawn of 1,200 wanted'],
    // Before the culling's first read too.
    ['WebGPU culling', 'webgpu', true, '1,200 segments resident of 1,200 wanted'],
  ] as const)('on %s, says what is drawn as it draws it', (_case, tier, culling, said) => {
    readout(tier, { ...DETAIL, culling, culled: null });
    expect(strip().getByText(said)).toBeInTheDocument();
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
    expect(strip().getByText(said)).toBeInTheDocument();
  });

  it('says what the culling counted and what draws the view', () => {
    readout('webgpu');
    expect(
      strip().getByText('Culled: 9,571 tested, 8,908 kept, 8,894 drawn; 12 boxes seen')
    ).toBeInTheDocument();
    expect(strip().getByText('Drawn with WebGPU')).toBeInTheDocument();
  });
});
