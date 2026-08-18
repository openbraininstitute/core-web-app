import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StringSelectionEnhanced } from '@/features/scan-config/components/ui-elements/string-selection-enhanced';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { StringSelectionEnhanced as TStringSelectionEnhanced } from '@/features/scan-config/types';

const schema: TStringSelectionEnhanced = {
  title: 'Algorithm',
  description: 'Target model for simplification.',
  ui_element: ScanConfigUIElementDict.StringSelectionEnhanced,
  enum: ['single_compartment', 'lif_nest'],
  title_by_key: {
    single_compartment: 'Single-Compartment with Synapse Relocation (NEURON)',
    lif_nest: 'Leaky Integrate-and-Fire (LIF) (NEST)',
  },
  description_by_key: {
    single_compartment:
      'Reduces each **biophysical** morphology to a single-compartment sphere.\n\nBest for: filter-based dendritic computation.',
    lif_nest: 'Converts cells to LIF point neurons for **NEST**.',
  },
};

describe('StringSelectionEnhanced', () => {
  it('renders the selected option description as markdown', () => {
    render(
      <StringSelectionEnhanced value="single_compartment" onChange={vi.fn()} paramSchema={schema} />
    );

    expect(screen.getByText('biophysical')).toBeInTheDocument();
    expect(screen.getByText('biophysical').tagName).toBe('STRONG');
  });

  it('renders markdown descriptions for options in the dropdown', () => {
    render(
      <StringSelectionEnhanced value="single_compartment" onChange={vi.fn()} paramSchema={schema} />
    );

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('listbox')).toHaveClass('secondary-scrollbar');
    expect(screen.getByText('Leaky Integrate-and-Fire (LIF) (NEST)')).toBeInTheDocument();
    expect(screen.getByText('NEST').tagName).toBe('STRONG');
  });

  it('selects an option from the dropdown', () => {
    const onChange = vi.fn();
    render(
      <StringSelectionEnhanced
        value="single_compartment"
        onChange={onChange}
        paramSchema={schema}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Leaky Integrate-and-Fire/ }));

    expect(onChange).toHaveBeenCalledWith('lif_nest');
  });
});
