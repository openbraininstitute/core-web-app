import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

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
  return render(
    <Block
      schema={SCHEMA}
      disabled={false}
      config={{}}
      blockSchema={BLOCK_SCHEMA}
      entity={null}
      state={{ duration: '1000', minf_eq: '' }}
      setState={vi.fn()}
      schemaMappingConfig={undefined}
      rootElement="ion_channel_model"
    />
  );
}

describe('form titles', () => {
  it('renders a title without math as plain text', () => {
    const { container } = renderBlock();
    const label = container.querySelector('label[for="duration"]');
    expect(label?.innerHTML).toBe('Duration');
  });

  it('renders inline math in a title with KaTeX', () => {
    const { container } = renderBlock();
    const label = container.querySelector('label[for="minf_eq"]');
    expect(label?.querySelector('.katex')).not.toBeNull();
    expect(label?.textContent).not.toContain('$');
    expect(label?.textContent).toContain(' equation');
  });
});
