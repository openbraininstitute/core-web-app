import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { VIEWERS } from '@/__tests__/viewer-3d/debug-menus-fixtures';

const h = vi.hoisted(() => ({ fetched: [] as string[] }));

vi.mock('next/dynamic', () => import('@/__tests__/viewer-3d/lazy-next-dynamic'));

vi.mock('@/features/viewer-3d/chrome/viewer-chrome', () => import('./debug-menus-stubs'));
vi.mock('@/features/viewer-3d/chrome/look-theme', () => import('./debug-menus-stubs'));
vi.mock(
  '@/features/entities/cell-morphology/morpho-viewer/chrome/settings-menu',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/entities/cell-morphology/morpho-viewer/chrome/color-by-menu',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/entities/cell-morphology/morpho-viewer/chrome/neurites-key',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/entities/cell-morphology/morpho-viewer/chrome/status',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/entities/em-cell-mesh/viewer/chrome/settings-menu',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/entities/em-cell-mesh/viewer/chrome/mesh-color-menu',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/entities/em-cell-mesh/viewer/chrome/load-status',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/circuit-viewer/morphologies/engine/circuit-morphology-viewer',
  () => import('./debug-menus-stubs')
);
vi.mock(
  '@/features/circuit-viewer/morphologies/load/load-crowding',
  () => import('./debug-menus-stubs')
);

vi.mock('@/features/entities/cell-morphology/morpho-viewer/chrome/debug-menu', () => {
  h.fetched.push('morphology menu');
  return { DebugMenu: () => <button type="button">morphology menu</button> };
});
vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/debug-menu', () => {
  h.fetched.push('EM menu');
  return { DebugMenu: () => <button type="button">EM menu</button> };
});
vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/frame-times', () => {
  h.fetched.push('EM frame times');
  return { FrameTimes: () => <button type="button">EM frame times</button> };
});
vi.mock('@/features/circuit-viewer/morphologies/debug/circuit-debug', () => {
  h.fetched.push('circuit menu');
  return { CircuitDebug: () => <button type="button">circuit menu</button> };
});

it('fetches and shows the Debug menus with the flag on', async () => {
  render(VIEWERS.morpho(true));
  render(VIEWERS.em(true));
  render(VIEWERS.circuit(true));

  const names = ['EM frame times', 'EM menu', 'circuit menu', 'morphology menu'];
  for (const name of names) {
    expect(await screen.findByRole('button', { name })).toBeInTheDocument();
  }
  expect(h.fetched.toSorted()).toEqual(names);
});
