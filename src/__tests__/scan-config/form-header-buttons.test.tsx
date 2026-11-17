import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultFlags } from '@/features/feature-flags/config';
import { FlagsProvider } from '@/features/feature-flags/provider';
import Block from '@/features/scan-config/components/ui-blocks/block';
import BlockDictionary from '@/features/scan-config/components/ui-blocks/block-dictionary';
import BlockUnion from '@/features/scan-config/components/ui-blocks/block-union';
import {
  type Config,
  type ConfigSchema,
  type IBlockDictionary,
  type IRootBlockUnion,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

// The × at the top right of what the form column shows folds the column away. A block picked
// for a union is thrown away by a dustbin instead, so that the two are not mistaken for each other.

const CLOSE = 'scan-config-close-form';
const RESET = 'scan-config-reset-block-selection';

const VARIANT = {
  title: 'Hodgkin-Huxley ion channel model',
  description: 'The channel model to fit.',
  properties: {
    type: { const: 'HodgkinHuxley', default: 'HodgkinHuxley' },
    m_power: { title: 'm exponent', ui_element: ScanConfigUIElementDict.StringInput },
  },
} as unknown as TBlock;

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

describe('a block`s form', () => {
  const renderBlock = (overrides: Record<string, unknown> = {}) =>
    render(
      <Block
        schema={SCHEMA}
        disabled={false}
        config={{}}
        blockSchema={VARIANT}
        entity={null}
        state={{ m_power: '3' }}
        setState={vi.fn()}
        schemaMappingConfig={undefined}
        rootElement="initialize"
        {...overrides}
      />
    );

  it('has an × beside its title that folds the form away', () => {
    const onClose = vi.fn();
    renderBlock({ onClose });
    fireEvent.click(screen.getByTestId(CLOSE));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has none where the layout cannot fold, or where its title is drawn for it', () => {
    renderBlock();
    expect(screen.queryByTestId(CLOSE)).toBeNull();
    renderBlock({ onClose: vi.fn(), hideTitle: true });
    expect(screen.queryByTestId(CLOSE)).toBeNull();
  });
});

describe('a block union', () => {
  const UNION = {
    ui_element: ScanConfigUIElementDict.BlockUnion,
    oneOf: [VARIANT],
  } as unknown as IRootBlockUnion;

  function renderUnion(config: Config, overrides: Record<string, unknown> = {}) {
    const setConfig = vi.fn();
    const onClose = vi.fn();
    render(
      <BlockUnion
        schema={SCHEMA}
        blockUnionSchema={UNION}
        selectedRootElement="model_type"
        campaignId=""
        loading={false}
        config={config}
        setConfig={setConfig}
        entity={null}
        entityType="ion_channel_recording"
        schemaMappingConfig={undefined}
        onClose={onClose}
        {...overrides}
      />
    );
    return { setConfig, onClose };
  }

  const PICKED = { other: 1, model_type: { type: 'HodgkinHuxley', m_power: '3' } } as Config;

  it('takes the pick back with a dustbin, and folds the form with the ×', () => {
    const { setConfig, onClose } = renderUnion(PICKED);
    expect(screen.getByTestId(RESET)).toHaveAccessibleName('Reset block selection');

    fireEvent.click(screen.getByTestId(RESET));
    expect(setConfig).toHaveBeenCalledWith({ other: 1, model_type: {} });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId(CLOSE));
    expect(onClose).toHaveBeenCalledOnce();
    expect(setConfig).toHaveBeenCalledOnce();
  });

  it('keeps the × and loses the dustbin once the campaign is generated', () => {
    renderUnion(PICKED, { campaignId: 'generated' });
    expect(screen.queryByTestId(RESET)).toBeNull();
    expect(screen.getByTestId(CLOSE)).toBeInTheDocument();
  });

  it('has the × over the kinds to pick from, and no dustbin with nothing picked', () => {
    const { onClose } = renderUnion({ model_type: {} });
    expect(screen.getByTestId('scan-config-variant-HodgkinHuxley')).toBeInTheDocument();
    expect(screen.queryByTestId(RESET)).toBeNull();
    fireEvent.click(screen.getByTestId(CLOSE));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('a block dictionary', () => {
  const DICTIONARY = {
    ui_element: ScanConfigUIElementDict.BlockDictionary,
    singular_name: 'Stimulus',
    reference_types: [],
    additionalProperties: { oneOf: [VARIANT] },
  } as unknown as IBlockDictionary;

  function renderDictionary(config: Config, selectedEntry: string) {
    const onClose = vi.fn();
    render(
      <FlagsProvider flags={defaultFlags}>
        <BlockDictionary
          schema={SCHEMA}
          blockDictionarySchema={DICTIONARY}
          selectedRootElement="stimuli"
          selectedEntry={selectedEntry}
          setSelectedEntry={vi.fn()}
          campaignId=""
          loading={false}
          config={config}
          setConfig={vi.fn()}
          entity={null}
          allEntries={new Set<string>()}
          schemaMappingConfig={undefined}
          onClose={onClose}
        />
      </FlagsProvider>
    );
    return onClose;
  }

  it('has the × over the kinds of block to pick from', () => {
    const onClose = renderDictionary({ stimuli: {} }, '');
    expect(screen.getByTestId('scan-config-variant-HodgkinHuxley')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(CLOSE));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has it on an entry`s form too', () => {
    const onClose = renderDictionary(
      { stimuli: { Step: { type: 'HodgkinHuxley', m_power: '3' } } },
      'Step'
    );
    expect(screen.getByTestId('scan-config-block-stimuli-Step')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(CLOSE));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
