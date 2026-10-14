import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';
import { FancyCombobox } from '@/ui/molecules/fancy-combobox';
import { validateValue } from '@/ui/molecules/fancy-input';

const OPTIONS = ['axon', 'basal', 'apical'].map((v) => ({ value: v, label: v }));

function Harness({ multiple = false, searchable = false }) {
  const [values, setValues] = useState<Array<string>>([]);
  return (
    <>
      <FancyCombobox
        label="Section"
        options={OPTIONS}
        values={values}
        onChange={setValues}
        multiple={multiple}
        searchable={searchable}
      />
      <output>{values.join(',')}</output>
    </>
  );
}

describe('validateValue', () => {
  it('does not read whitespace as zero', () => {
    expect(validateValue(' ', 'number').valid).toBe(false);
    expect(validateValue('-1.5', 'number', { min: -2 }).valid).toBe(true);
    expect(validateValue('3', 'integer', { max: 2 }).error).toBe('Must be 2 or less');
  });
});

describe('FancyCombobox', () => {
  it('closes after a single pick', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'basal' }));

    expect(screen.getByRole('status').textContent).toBe('basal');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('stays open and toggles from the keyboard when multiple', () => {
    render(<Harness multiple searchable />);
    fireEvent.click(screen.getByRole('combobox'));
    const search = screen.getByRole('textbox');
    fireEvent.keyDown(search, { key: 'Enter' });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(screen.getByRole('status').textContent).toBe('axon,basal');
    expect(screen.getByRole('listbox')).toBeTruthy();
  });
});

describe('a workflow block field', () => {
  it('draws its title and unit in the notch, its info on the border, and Required underneath', () => {
    const blockSchema = {
      title: 'Initialize',
      description: '',
      required: ['v_init'],
      properties: {
        v_init: {
          title: 'Initial voltage',
          description: 'Membrane potential at t=0',
          units: 'mV',
          ui_element: ScanConfigUIElementDict.StringInput,
        },
      },
    } as unknown as TBlock;

    render(
      <Block
        schema={{ properties: {} } as unknown as ConfigSchema}
        disabled={false}
        config={{}}
        blockSchema={blockSchema}
        entity={null}
        state={{}}
        setState={() => {}}
        schemaMappingConfig={undefined}
      />
    );

    const field = screen.getByTestId('scan-config-field-v_init');
    expect(screen.getByLabelText('Initial voltage (mV)')).toBe(
      field.querySelector('[data-testid=scan-config-control]')
    );
    expect(field.querySelector('legend')?.textContent).toBe('Initial voltage (mV)');
    expect(screen.getByRole('button', { name: 'More information' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Required');
  });
});
