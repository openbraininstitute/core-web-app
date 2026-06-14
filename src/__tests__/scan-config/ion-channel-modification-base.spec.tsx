import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GlobalModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/global-base';
import { RangeModificationBase } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/range-base';

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
    setState: vi.fn(),
    fieldKey: 'modification',
    modificationType: 'GlobalModification',
  };

  it('shows the loading note while circuit variables are being fetched', () => {
    render(<GlobalModificationBase {...baseProps} state={{}} loading reason={null} />);

    expect(screen.getByText(/Loading variables/)).toBeInTheDocument();
    expect(screen.queryByText('Select a variable…')).not.toBeInTheDocument();
  });

  it('shows the reason note instead of the picker when one is provided', () => {
    render(
      <GlobalModificationBase
        {...baseProps}
        state={{}}
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
    render(<GlobalModificationBase {...baseProps} state={{}} />);

    expect(screen.getByText('Select a variable…')).toBeInTheDocument();
  });

  it('reflects an existing selection in the trigger and links to the ion-channel entity', () => {
    const state: Record<string, ConfigValue> = {
      modification: {
        type: 'GlobalModification',
        ion_channel_id: 'ic-natg',
        channel_name: 'NaTg',
        variable_name: 'gbar',
        new_value: 0.05,
      },
    };
    render(<GlobalModificationBase {...baseProps} state={state} />);

    expect(screen.getByText('NaTg')).toBeInTheDocument();
    expect(screen.getByText('gbar')).toBeInTheDocument();
    expect(screen.getByLabelText('View ion channel NaTg')).toBeInTheDocument();
  });
});

describe('RangeModificationBase', () => {
  const baseProps = {
    data: DATA,
    disabled: false,
    setState: vi.fn(),
    fieldKey: 'modification',
    modificationType: 'RangeModification',
  };

  it('renders the empty picker when nothing is selected yet', () => {
    render(<RangeModificationBase {...baseProps} state={{}} />);

    expect(screen.getByText('Select a variable…')).toBeInTheDocument();
  });

  it('resolves the channel from ion_channel_id and shows the section-list editor', () => {
    const state: Record<string, ConfigValue> = {
      modification: {
        type: 'RangeModification',
        ion_channel_id: 'ic-natg',
        variable_name: 'gbar',
        section_list_modifications: { somatic: 0.05 },
      },
    };
    render(<RangeModificationBase {...baseProps} state={state} />);

    expect(screen.getByText('NaTg')).toBeInTheDocument();
    expect(screen.getByText('gbar')).toBeInTheDocument();
    // both section lists from the resolved variable become editable rows. `somatic`
    // also appears in the trigger's section-list badge, hence getAllByText.
    expect(screen.getAllByText('somatic').length).toBeGreaterThan(0);
    expect(screen.getByText('axonal')).toBeInTheDocument();
  });

  it('honours the gating reason over the picker', () => {
    render(
      <RangeModificationBase
        {...baseProps}
        state={{}}
        reason={<span>No ion-channel variables are available for the selected neuron set.</span>}
      />
    );

    expect(
      screen.getByText('No ion-channel variables are available for the selected neuron set.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Select a variable…')).not.toBeInTheDocument();
  });
});
