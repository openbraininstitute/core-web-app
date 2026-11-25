import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import { StringSelectionEnhanced } from '@/features/scan-config/components/ui-elements/string-selection-enhanced';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
  type StringSelectionEnhanced as TStringSelectionEnhanced,
} from '@/features/scan-config/types';

import { renderInBlock } from './form-providers';

const BLOCK_SCHEMA = {
  title: 'Ion channel model',
  description: '',
  properties: {
    duration: {
      title: 'Duration',
      ui_element: ScanConfigUIElementDict.StringInput,
    },
    minf_eq: {
      title: '$m_\\infty$ equation',
      ui_element: ScanConfigUIElementDict.StringInput,
    },
  },
} as unknown as TBlock;

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

function renderBlock() {
  return renderInBlock(
    <Block
      schema={SCHEMA}
      disabled={false}
      blockSchema={BLOCK_SCHEMA}
      entity={null}
      schemaMappingConfig={undefined}
      rootElement="ion_channel_model"
    />,
    'ion_channel_model',
    { duration: '1000', minf_eq: '' }
  );
}

describe('form titles', () => {
  it('renders a title without math as plain text', () => {
    const { container } = renderBlock();
    const label = container.querySelector(
      '[data-testid="scan-config-field-duration"] :is(label, span)'
    );
    expect(label?.innerHTML).toBe('Duration');
  });

  it('renders inline math in an enhanced selection option title', () => {
    const { getByTestId } = render(
      <StringSelectionEnhanced
        value="sig_fit_minf"
        onChange={vi.fn()}
        paramSchema={
          {
            enum: ['sig_fit_minf'],
            title_by_key: { sig_fit_minf: 'Sigmoid equation for $m_\\infty$' },
            ui_element: ScanConfigUIElementDict.StringSelectionEnhanced,
          } as unknown as TStringSelectionEnhanced
        }
      />
    );
    const title = getByTestId('scan-config-control').querySelector('span');
    expect(title?.querySelector('.katex')).not.toBeNull();
    expect(title?.textContent).not.toContain('$');
  });

  it('renders inline math in a title with KaTeX', () => {
    const { container } = renderBlock();
    const label = container.querySelector(
      '[data-testid="scan-config-field-minf_eq"] :is(label, span)'
    );
    expect(label?.querySelector('.katex')).not.toBeNull();
    expect(label?.textContent).not.toContain('$');
    expect(label?.textContent).toContain(' equation');
  });
});
