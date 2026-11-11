import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { settle, VIEWERS } from '@/__tests__/viewer-3d/debug-menus-fixtures';

const h = vi.hoisted(() => ({ failed: [] as string[] }));

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
  h.failed.push('morphology menu');
  throw new Error('chunk gone');
});
vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/debug-menu', () => {
  h.failed.push('EM menu');
  throw new Error('chunk gone');
});
vi.mock('@/features/entities/em-cell-mesh/viewer/chrome/frame-times', () => {
  h.failed.push('EM frame times');
  throw new Error('chunk gone');
});
vi.mock('@/features/circuit-viewer/morphologies/debug/circuit-debug', () => {
  h.failed.push('circuit menu');
  throw new Error('chunk gone');
});

it('keeps each viewer up when a Debug chunk fails to load', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});

  const morpho = render(VIEWERS.morpho(true));
  const em = render(VIEWERS.em(true));
  const circuit = render(VIEWERS.circuit(true));
  await settle();

  expect(h.failed.toSorted()).toEqual([
    'EM frame times',
    'EM menu',
    'circuit menu',
    'morphology menu',
  ]);
  expect(morpho.container).not.toBeEmptyDOMElement();
  expect(em.container).not.toBeEmptyDOMElement();
  expect(circuit.container).not.toBeEmptyDOMElement();
});
