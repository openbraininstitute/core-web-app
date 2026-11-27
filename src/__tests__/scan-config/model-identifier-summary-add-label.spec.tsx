import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelIdentifierSummaryView } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/summary-view';

import { renderInForm } from './form-providers';

function renderSummary(storageMode: 'list' | 'tuple', isScan?: boolean) {
  renderInForm(
    <ModelIdentifierSummaryView
      parsedValue={{ storageMode, items: [] }}
      fieldSchema={{}}
      resolvedEntities={[]}
      pendingIds={new Set()}
      onAddEntities={vi.fn()}
      onRemoveEntity={vi.fn()}
      isScan={isScan}
    />
  );
  return screen.getByTestId('scan-config-select-model');
}

describe('ModelIdentifierSummaryView add button', () => {
  it('adds to the scan, with a hint, for a list', () => {
    const button = renderSummary('list');
    expect(button.textContent).toBe('Add item to scan');
    expect(button.hasAttribute('data-scan-hint')).toBe(true);
  });

  it('adds without a scan label or hint for a tuple, which is one value', () => {
    const button = renderSummary('tuple');
    expect(button.textContent).toBe('Add item(s)');
    expect(button.hasAttribute('data-scan-hint')).toBe(false);
  });

  it('drops the scan label and hint for a list that is not scanned', () => {
    const button = renderSummary('list', false);
    expect(button.textContent).toBe('Add item(s)');
    expect(button.hasAttribute('data-scan-hint')).toBe(false);
  });
});
