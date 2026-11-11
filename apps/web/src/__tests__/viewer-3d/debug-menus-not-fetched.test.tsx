import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { settle, VIEWERS } from '@/__tests__/viewer-3d/debug-menus-fixtures';

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
  return { DebugMenu: () => null };
});
vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/debug-menu', () => {
  h.fetched.push('EM menu');
  return { DebugMenu: () => null };
});
vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/frame-times', () => {
  h.fetched.push('EM frame times');
  return { FrameTimes: () => null };
});
vi.mock('@/features/circuit-viewer/morphologies/debug/circuit-debug', () => {
  h.fetched.push('circuit menu');
  return { CircuitDebug: () => null };
});

it('fetches none of the Debug menus with the flag off', async () => {
  render(VIEWERS.morpho(false));
  render(VIEWERS.em(false));
  render(VIEWERS.circuit(false));
  await settle();

  expect(h.fetched).toEqual([]);
});
