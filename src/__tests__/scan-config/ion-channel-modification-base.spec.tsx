import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GlobalModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/global-base';
import { RangeModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/range-base';

import { renderInForm } from './form-providers';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { ConfigValue } from '@/features/scan-config/types';

const DATA: MechanismVariablesRoot = {
  NaTg: {
    section_lists: ['somatic', 'axonal'],
    entity_id: 'ic-natg',
    variables: {
      gbar: {
        units: 'S/cm2',
        limits: [0, 1],
        variable_type: 'RANGE',
        section_lists_original_values: { somatic: 0.1, axonal: 0.2 },
      },
    },
  },
};

describe('GlobalModificationBase', () => {
  const baseProps = {
    data: DATA,
    disabled: false,
    onChange: vi.fn(),
    fieldKey: 'modification',
    modificationType: 'GlobalModification',
  };

  it('shows the loading note while circuit variables are being fetched', () => {
    renderInForm(<GlobalModificationBase {...baseProps} value={undefined} loading reason={null} />);

    expect(screen.getByText(/Loading variables/)).toBeInTheDocument();
    expect(screen.queryByText('Select a variable…')).not.toBeInTheDocument();
  });

  it('shows the reason note instead of the picker when one is provided', () => {
    renderInForm(
      <GlobalModificationBase
        {...baseProps}
        value={undefined}
        loading={false}
        reason={<span>Could not load variables for the selected neuron set.</span>}
      />
    );

    expect(
      screen.getByText('Could not load variables for the selected neuron set.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Select a variable…')).not.toBeInTheDocument();
  });

  it('renders the empty picker (placeholder) when data is available but nothing is selected', () => {
    renderInForm(<GlobalModificationBase {...baseProps} value={undefined} />);

    expect(screen.getByText('Select a variable…')).toBeInTheDocument();
  });

  it('reflects an existing selection in the trigger and links to the ion-channel entity', () => {
    const value: ConfigValue = {
      type: 'GlobalModification',
      ion_channel_id: 'ic-natg',
      channel_name: 'NaTg',
      variable_name: 'gbar',
      new_value: 0.05,
    };
    renderInForm(<GlobalModificationBase {...baseProps} value={value} />);

    expect(screen.getByText('NaTg')).toBeInTheDocument();
    expect(screen.getByText('gbar')).toBeInTheDocument();
    expect(screen.getByLabelText('View ion channel NaTg')).toBeInTheDocument();
  });

  it('shows a scan saved as a list of values, one field per value', () => {
    const value: ConfigValue = {
      type: 'GlobalModification',
      ion_channel_id: 'ic-natg',
      channel_name: 'NaTg',
      variable_name: 'gbar',
      variable_type: 'RANGE',
      new_value: [0.05, 0.1, 0.2],
    };
    renderInForm(<GlobalModificationBase {...baseProps} value={value} />);

    const fields = screen.getAllByTestId('scan-config-sweep-value');
    expect(fields.map((f) => (f.querySelector('input') ?? f).getAttribute('value'))).toEqual([
      '0.05',
      '0.1',
      '0.2',
    ]);
  });

  it('turns a single value into a scan', () => {
    const onChange = vi.fn();
    const modification = {
      type: 'GlobalModification',
      ion_channel_id: 'ic-natg',
      channel_name: 'NaTg',
      variable_name: 'gbar',
      variable_type: 'RANGE',
      new_value: 0.05,
    };
    renderInForm(
      <GlobalModificationBase {...baseProps} onChange={onChange} value={modification} />
    );

    fireEvent.click(screen.getByTestId('scan-config-sweep-expand'));

    expect(onChange).toHaveBeenCalledWith({ ...modification, new_value: [0.05, null] });
  });

  it('saves null when the full-neuron value is cleared', () => {
    const onChange = vi.fn();
    const modification = {
      type: 'GlobalModification',
      ion_channel_id: 'ic-natg',
      channel_name: 'NaTg',
      variable_name: 'gbar',
      variable_type: 'RANGE',
      new_value: 0.05,
    };
    renderInForm(
      <GlobalModificationBase {...baseProps} onChange={onChange} value={modification} />
    );

    const field = screen.getByTestId('scan-config-sweep-value');
    fireEvent.change(field.querySelector('input') ?? field, { target: { value: '' } });

    expect(onChange).toHaveBeenLastCalledWith({ ...modification, new_value: null });
  });

  it('treats an empty scan list as no value, so the field and + button stay', () => {
    const value: ConfigValue = {
      type: 'GlobalModification',
      ion_channel_id: 'ic-natg',
      channel_name: 'NaTg',
      variable_name: 'gbar',
      variable_type: 'RANGE',
      new_value: [],
    };
    renderInForm(<GlobalModificationBase {...baseProps} value={value} />);

    expect(screen.getAllByTestId('scan-config-sweep-value')).toHaveLength(1);
    expect(screen.getByTestId('scan-config-sweep-expand')).toBeInTheDocument();
  });
});

describe('RangeModificationBase', () => {
  const baseProps = {
    data: DATA,
    disabled: false,
    onChange: vi.fn(),
    fieldKey: 'modification',
    modificationType: 'RangeModification',
  };

  it('renders the empty picker when nothing is selected yet', () => {
    renderInForm(<RangeModificationBase {...baseProps} value={undefined} />);

    expect(screen.getByText('Select a variable…')).toBeInTheDocument();
  });

  it('resolves the channel from ion_channel_id and shows the section-list editor', () => {
    const value: ConfigValue = {
      type: 'RangeModification',
      ion_channel_id: 'ic-natg',
      variable_name: 'gbar',
      section_list_modifications: { somatic: 0.05 },
    };
    renderInForm(<RangeModificationBase {...baseProps} value={value} />);

    expect(screen.getByText('NaTg')).toBeInTheDocument();
    expect(screen.getByText('gbar')).toBeInTheDocument();
    // both section lists from the resolved variable become editable rows. `somatic`
    // also appears in the trigger's section-list badge, hence getAllByText.
    expect(screen.getAllByText('somatic').length).toBeGreaterThan(0);
    expect(screen.getByText('axonal')).toBeInTheDocument();
  });

  it('shows a section-list scan as one field per value', () => {
    const value: ConfigValue = {
      type: 'RangeModification',
      ion_channel_id: 'ic-natg',
      variable_name: 'gbar',
      section_list_modifications: { somatic: [0.1, 0.3], axonal: 0.2 },
    };
    renderInForm(<RangeModificationBase {...baseProps} value={value} />);

    const fields = screen.getAllByTestId('scan-config-sweep-value');
    expect(fields.map((f) => (f.querySelector('input') ?? f).getAttribute('value'))).toEqual([
      '0.1',
      '0.3',
      '0.2',
    ]);
  });

  it('drops a cleared section list instead of saving null', () => {
    const onChange = vi.fn();
    const modification = {
      type: 'RangeModification',
      ion_channel_id: 'ic-natg',
      variable_name: 'gbar',
      section_list_modifications: { somatic: [0.1, 0.3], axonal: 0.2 },
    };
    renderInForm(<RangeModificationBase {...baseProps} onChange={onChange} value={modification} />);

    const axonal = screen.getAllByTestId('scan-config-sweep-value')[2];
    fireEvent.change(axonal.querySelector('input') ?? axonal, { target: { value: '' } });

    expect(onChange).toHaveBeenLastCalledWith({
      ...modification,
      section_list_modifications: { somatic: [0.1, 0.3] },
    });
  });

  it('honours the gating reason over the picker', () => {
    renderInForm(
      <RangeModificationBase
        {...baseProps}
        value={undefined}
        reason={<span>No ion-channel variables are available for the selected neuron set.</span>}
      />
    );

    expect(
      screen.getByText('No ion-channel variables are available for the selected neuron set.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Select a variable…')).not.toBeInTheDocument();
  });
});
