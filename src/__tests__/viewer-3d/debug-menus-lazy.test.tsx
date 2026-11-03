import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MorphoViewerChrome } from '@/features/entities/cell-morphology/morpho-viewer/chrome/morpho-viewer-chrome';
import { EmViewerChrome } from '@/features/entities/em-cell-mesh/viewer/chrome/em-viewer-chrome';
import { FlagsProvider } from '@/features/feature-flags';
import { defaultFlags } from '@/features/feature-flags/config';
import { debugFlag } from '@/features/feature-flags/flags';

import type { ComponentProps, ReactNode } from 'react';

const h = vi.hoisted(() => ({ fetched: [] as string[] }));

vi.mock('next/dynamic', () => import('@/__tests__/viewer-3d/lazy-next-dynamic'));

vi.mock('@/features/viewer-3d/chrome/viewer-chrome', () => ({
  ViewerChrome: ({ menus }: { menus: ReactNode }) => <div>{menus}</div>,
}));

vi.mock('@/features/entities/cell-morphology/morpho-viewer/chrome/settings-menu', () => ({
  SettingsMenu: () => null,
}));

vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/settings-menu', () => ({
  SettingsMenu: () => null,
}));

vi.mock('@/features/viewer-3d/chrome/look-theme', () => ({ lookTheme: () => ({}) }));

vi.mock('@/features/entities/cell-morphology/morpho-viewer/chrome/debug-menu', () => {
  h.fetched.push('morphology');
  return { DebugMenu: () => <button type="button">Morphology debug</button> };
});

vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/debug-menu', () => {
  h.fetched.push('em');
  return { DebugMenu: () => <button type="button">EM debug</button> };
});

const LOOK = { id: 'look', colors: 'tint', plain: true };

const morpho = (
  <MorphoViewerChrome
    {...({
      viewer: { looks: [LOOK] },
      root: null,
      settings: { look: 'look', dark: false, typeTint: true },
      actions: { update: vi.fn(), chooseLook: vi.fn() },
      mesh: { summary: null, layers: { mesh: null } },
      name: 'Cell',
      wheelHint: false,
      maxDistance: null,
      distanceError: null,
    } as unknown as ComponentProps<typeof MorphoViewerChrome>)}
  />
);

const em = (
  <EmViewerChrome
    {...({
      viewer: { looks: [LOOK] },
      root: null,
      settings: { look: 'look', dark: false, frameTimes: false },
      update: vi.fn(),
      chooseLook: vi.fn(),
      chooseColor: vi.fn(),
      load: {},
      name: 'Mesh',
      wheelHint: false,
    } as unknown as ComponentProps<typeof EmViewerChrome>)}
  />
);

function withFlag(debug: boolean, children: ReactNode) {
  return (
    <FlagsProvider flags={{ ...defaultFlags, [debugFlag.key]: debug }}>{children}</FlagsProvider>
  );
}

// In this order: a module's factory runs once, on its first import.
describe('the Debug menus of the morphology and EM viewers', () => {
  it('are not fetched with the flag off', async () => {
    render(withFlag(false, morpho));
    render(withFlag(false, em));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
    });
    expect(h.fetched).toEqual([]);
  });

  it('are fetched with the flag on', async () => {
    render(withFlag(true, morpho));
    render(withFlag(true, em));
    expect(await screen.findByRole('button', { name: 'Morphology debug' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'EM debug' })).toBeInTheDocument();
    expect(h.fetched.toSorted()).toEqual(['em', 'morphology']);
  });
});
