import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { FlagsProvider } from '@/features/feature-flags';
import { defaultFlags } from '@/features/feature-flags/config';
import { EntityGridPicker } from '@/features/logbook/log/entity-grid-picker';

vi.mock('@/features/brain-region-hierarchy/context', () => ({
  useBrainRegionRootHierarchyQuery: () => ({ result: { root: null, options: [] } }),
}));
vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useAvailableHierarchySpeciesQuery: () => ({ remoteAvailableHierarchies: [] }),
}));
vi.mock('@/features/views/listing/browse-entity', () => ({ BrowseEntityScope: () => null }));
vi.mock('@/ui/segments/mini-detail-view', () => ({ MiniDetailViewRenderer: () => null }));

const renderPicker = (emodelValidation = false) => {
  const onClose = vi.fn();
  render(
    <FlagsProvider flags={{ ...defaultFlags, 'emodel-validation': emodelValidation }}>
      <EntityGridPicker multiple onPick={vi.fn()} onClose={onClose} />
    </FlagsProvider>
  );
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

test('the simulations list is the Data one: no simulation result, flagged types only when on', () => {
  renderPicker(false);
  fireEvent.click(screen.getByRole('button', { name: /Simulations/ }));
  expect(screen.getByText('Single neuron')).toBeTruthy();
  expect(screen.queryByText('Simulation result')).toBeNull();
  expect(screen.queryByText('E-model validation')).toBeNull();
});

test('a type behind a feature flag shows once the flag is on, as in Data', () => {
  renderPicker(true);
  fireEvent.click(screen.getByRole('button', { name: /Simulations/ }));
  expect(screen.getByText('E-model validation')).toBeTruthy();
});
