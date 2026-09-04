import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeftMenuTab, Tab } from '@/features/scan-config/components/components';
import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
  type TScanConfigTabs,
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

// The left-hand root elements and the activity tabs are named from a live
// schema and restyled by CSS, so an E2E test cannot address them by their
// visible text. These ids are the handle it uses instead.
describe('scan config navigation test ids', () => {
  it('identifies a root element by its property key', () => {
    render(
      <LeftMenuTab
        tab="synaptic_models"
        selectedTab="info"
        testId="scan-config-root-element-synaptic_models"
      >
        Synaptic models
      </LeftMenuTab>
    );

    expect(screen.getByTestId('scan-config-root-element-synaptic_models')).toBeInTheDocument();
  });

  it('identifies a root element that is not selected', () => {
    render(
      <LeftMenuTab tab="info" selectedTab="info" testId="scan-config-root-element-info">
        Info
      </LeftMenuTab>
    );

    expect(screen.getByTestId('scan-config-root-element-info')).toBeInTheDocument();
  });

  it('identifies a tab by its id', () => {
    render(
      <Tab tab="results" selectedTab={{ id: 'configuration' } as TScanConfigTabs}>
        Results
      </Tab>
    );

    expect(screen.getByTestId('scan-config-tab-results')).toBeInTheDocument();
  });
});
