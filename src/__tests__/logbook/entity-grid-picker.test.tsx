import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { EntityGridPicker } from '@/features/logbook/log/entity-grid-picker';

vi.mock('@/features/brain-region-hierarchy/context', () => ({
  useBrainRegionRootHierarchyQuery: () => ({ result: { root: null, options: [] } }),
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useAvailableHierarchySpeciesQuery: () => ({ remoteAvailableHierarchies: [] }),
}));
vi.mock('@/features/views/listing/browse-entity', () => ({ BrowseEntityScope: () => null }));
vi.mock('@/ui/segments/mini-detail-view', () => ({ MiniDetailViewRenderer: () => null }));

const renderPicker = () => {
  const onClose = vi.fn();
  render(<EntityGridPicker multiple onPick={vi.fn()} onClose={onClose} />);
  return { onClose, dialog: screen.getByRole('dialog', { name: 'Link entities' }) };
};

test('the picker takes focus and Escape closes it', () => {
  const { onClose, dialog } = renderPicker();
  expect(dialog.contains(document.activeElement)).toBe(true);
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('an Escape an inner menu already handled leaves the picker open', () => {
  const { onClose } = renderPicker();
  const handled = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  handled.preventDefault();
  document.dispatchEvent(handled);
  expect(onClose).not.toHaveBeenCalled();
});

test('a click on the backdrop closes the picker', () => {
  const { onClose } = renderPicker();
  const backdrop = document.getElementById('modal-overlay');
  fireEvent.click(backdrop ?? document.body);
  expect(onClose).toHaveBeenCalledTimes(1);
});
