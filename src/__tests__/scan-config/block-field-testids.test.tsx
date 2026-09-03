import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

// E2E tests address a field by its property key, scoped to its block, because a
// key such as `dt` repeats across block dictionary entries. Removing either test
// id breaks that lookup, so this test guards the contract.

const BLOCK_SCHEMA = {
  title: 'Initialize',
  description: '',
  properties: {
    simulation_length: {
      title: 'Duration',
      ui_element: ScanConfigUIElementDict.StringInput,
    },
    v_init: {
      title: 'Initial voltage',
      ui_element: ScanConfigUIElementDict.StringInput,
    },
  },
} as unknown as TBlock;

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

function renderBlock(overrides: Record<string, unknown> = {}) {
  return render(
    <Block
      schema={SCHEMA}
      disabled={false}
      config={{}}
      blockSchema={BLOCK_SCHEMA}
      entity={null}
      state={{ simulation_length: '1000', v_init: '-80' }}
      setState={vi.fn()}
      schemaMappingConfig={undefined}
      rootElement="initialize"
      {...overrides}
    />
  );
}

describe('scan config block test ids', () => {
  it('gives every visible field a test id keyed on its property name', () => {
    renderBlock();

    expect(screen.getByTestId('scan-config-field-simulation_length')).toBeInTheDocument();
    expect(screen.getByTestId('scan-config-field-v_init')).toBeInTheDocument();
  });

  it('identifies the block by its root element', () => {
    renderBlock();

    expect(screen.getByTestId('scan-config-block-initialize')).toBeInTheDocument();
  });

  it('includes the entry name so repeated keys stay distinguishable', () => {
    renderBlock({ rootElement: 'recordings', selectedEntry: 'Soma' });

    expect(screen.getByTestId('scan-config-block-recordings-Soma')).toBeInTheDocument();
  });
});
