import { expect, test } from 'vitest';

import { has3dView } from '@/features/logbook/editor/blocks/viewers-3d';

test('reconstructed and synthesized morphologies both offer the 3D view', () => {
  expect(has3dView('morphology')).toBe(true);
  expect(has3dView('synthesized_cell_morphology')).toBe(true);
  expect(has3dView('emodel')).toBe(false);
});
