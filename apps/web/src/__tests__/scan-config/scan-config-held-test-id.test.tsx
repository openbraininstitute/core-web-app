/**
 * The mark the e2e suite finds a selection control's value by.
 *
 * Worth pinning because nothing in the app looks at it: it exists for the suite,
 * which fills the config editor from a fixture and has to know what a field
 * already holds before it opens a list. Break the id and the failure lands
 * minutes into a campaign, in another repository.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EntityPropertyDropdown from '@/features/scan-config/components/ui-elements/entity-property-dropdown';
import Reference from '@/features/scan-config/components/ui-elements/reference';
import { StringSelectionEnhanced } from '@/features/scan-config/components/ui-elements/string-selection-enhanced';
import { scanConfigHeldTestId } from '@/features/scan-config/components/utils';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';
import type {
  Config,
  ConfigSchema,
  Reference as ReferenceSchema,
  StringSelectionEnhanced as TStringSelectionEnhanced,
} from '@/features/scan-config/types';

describe('scanConfigHeldTestId', () => {
  it('names a value in kebab-case, under one prefix', () => {
    expect(scanConfigHeldTestId('LineSource')).toBe('scan-config-held_line-source');
    expect(scanConfigHeldTestId('Timestamps 0')).toBe('scan-config-held_timestamps-0');
  });

  // The e2e suite tells these two apart by id, so kebab-case must as well.
  it('keeps a value apart from one it is a prefix of', () => {
    expect(scanConfigHeldTestId('Neuron set 1')).not.toBe(scanConfigHeldTestId('Neuron set 10'));
  });
});

describe('the enhanced string selection', () => {
  const paramSchema = {
    type: 'string',
    enum: ['PointSource', 'LineSource'],
    ui_element: 'string_selection_enhanced',
  } as unknown as TStringSelectionEnhanced;

  it('marks the enum key it holds', () => {
    render(
      <StringSelectionEnhanced value="LineSource" onChange={() => {}} paramSchema={paramSchema} />
    );

    expect(screen.getByTestId(scanConfigHeldTestId('LineSource'))).toBeTruthy();
  });

  it('marks nothing while it holds nothing', () => {
    render(<StringSelectionEnhanced value={null} onChange={() => {}} paramSchema={paramSchema} />);

    expect(screen.queryByTestId(scanConfigHeldTestId('LineSource'))).toBeNull();
  });
});

describe('the reference dropdown', () => {
  // The least a Reference needs: a dictionary registering the reference type it
  // accepts, and a default label, without which the field renders nothing at all.
  const schema = {
    default_block_reference_labels: { TimestampsReference: 'Default' },
    properties: {
      timestamps: {
        ui_element: 'block_dictionary',
        reference_types: ['TimestampsReference'],
        singular_name: 'Timestamps',
      },
    },
  } as unknown as ConfigSchema;

  const referenceSchema = {
    reference_types: ['TimestampsReference'],
  } as unknown as ReferenceSchema;

  const config = {
    timestamps: { 'Timestamps 0': { type: 'RegularTimestamps' } },
  } as Config;

  function renderReference(value: string | null) {
    render(
      <Reference
        schema={schema}
        referenceSchema={referenceSchema}
        config={config}
        value={value}
        onChange={() => {}}
        disabled={false}
      />
    );
  }

  it('marks the block it points at', () => {
    renderReference('Timestamps 0');

    expect(screen.getByTestId(scanConfigHeldTestId('Timestamps 0'))).toBeTruthy();
  });

  // The default option is keyed by a sentinel, so no fixture can name it and the
  // field holds nothing a fixture could be asking for.
  it('marks nothing while the default is showing', () => {
    renderReference(null);

    expect(screen.queryByTestId(scanConfigHeldTestId('Timestamps 0'))).toBeNull();
  });
});

describe('the entity property dropdown', () => {
  const schemaMappingConfig = {
    properties: { mtype: ['L2_TPC', 'L5_TPC'] },
  } as unknown as TSchemaMappingConfiguration;

  /*
   * The case the rendered text cannot answer: antd draws each value as its own
   * tag, so "L2_TPC" and "L5_TPC" read back as one run of words.
   */
  it('marks every value it holds at once', () => {
    render(
      <EntityPropertyDropdown
        value={['L2_TPC', 'L5_TPC']}
        onChange={() => {}}
        property="mtype"
        schemaMappingConfig={schemaMappingConfig}
      />
    );

    expect(screen.getByTestId(scanConfigHeldTestId('L2_TPC'))).toBeTruthy();
    expect(screen.getByTestId(scanConfigHeldTestId('L5_TPC'))).toBeTruthy();
  });

  it('marks the one value a single-value dropdown holds', () => {
    render(
      <EntityPropertyDropdown
        value="L5_TPC"
        onChange={() => {}}
        property="mtype"
        schemaMappingConfig={schemaMappingConfig}
        multiple={false}
      />
    );

    expect(screen.getByTestId(scanConfigHeldTestId('L5_TPC'))).toBeTruthy();
    expect(screen.queryByTestId(scanConfigHeldTestId('L2_TPC'))).toBeNull();
  });
});
