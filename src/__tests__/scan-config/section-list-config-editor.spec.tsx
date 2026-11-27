import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  SectionListConfigEditor,
  type SectionValue,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/editor';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import { renderInForm } from './form-providers';

import type { SectionListEntry } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';

const SECTION_LISTS: SectionListEntry[] = [
  { section_list: 'somatic', value: 0.1, limits: [0, 1], units: 'S/cm2' },
  { section_list: 'axonal', value: 0.2, limits: [0, 1], units: 'S/cm2' },
];

function renderEditor(values: Record<string, SectionValue>, disabled = false) {
  const onChange = vi.fn();
  renderInForm(
    <SectionListConfigEditor
      uiElement={ScanConfigUIElementDict.ionChannelVariableModificationBySectionList}
      sectionLists={SECTION_LISTS}
      values={values}
      onChange={onChange}
      disabled={disabled}
    />
  );
  return { onChange };
}

const collapseButtons = () => screen.queryAllByRole('button', { name: /^Use a single value/ });

describe('SectionListConfigEditor single value control', () => {
  it('shows only on the section lists that hold a scan', () => {
    renderEditor({ somatic: [0.3, 0.5], axonal: 0.2 });
    expect(collapseButtons()).toHaveLength(1);
  });

  it('saves the first value as a single number', () => {
    const { onChange } = renderEditor({ somatic: 0.1, axonal: [null, 0.4, 0.6] });
    fireEvent.click(screen.getByRole('button', { name: 'Use a single value for axonal' }));
    expect(onChange).toHaveBeenCalledWith('axonal', 0.4);
  });

  it('names each button after its section list, inside a row a test can address', () => {
    renderEditor({ somatic: [0.3, 0.5], axonal: [0.1, 0.2] });
    const axonal = screen.getByTestId('scan-config-section-list-axonal');
    expect(
      within(axonal).getByRole('button', { name: 'Use a single value for axonal' })
    ).toBeTruthy();
    expect(within(axonal).getAllByTestId('scan-config-sweep-collapse')).toHaveLength(1);
  });

  it('is hidden when the form is read-only', () => {
    renderEditor({ somatic: [0.3, 0.5] }, true);
    expect(collapseButtons()).toHaveLength(0);
  });
});
